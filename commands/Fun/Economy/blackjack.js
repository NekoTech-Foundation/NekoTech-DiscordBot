const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const EconomyUserData = require('../../../models/EconomyUserData');
//const fs = require('fs');
//const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const parseDuration = require('./Utility/parseDuration');

const { checkActiveBooster, replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Làm một ván Xì Dách')
        .addIntegerOption(option => option.setName('bet').setDescription('Bet amount').setRequired(true)),
    category: 'Economy',
    async execute(interaction) {
        const betAmount = interaction.options.getInteger('bet');

        if (betAmount <= 0) {
            return interaction.reply({ content: lang.Economy.Messages.betAmountError, flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply();

        try {
            let user = await EconomyUserData.findOne(
                { userId: interaction.user.id },
                { balance: 1, 'commandData.lastBlackjack': 1, transactionLogs: 1, boosters: 1 }
            );

            if (!user) {
                user = await initializeUser(interaction.user.id);
            } else {
                ensureUserSchema(user);
                await user.save();
            }

            if (isOnCooldown(user, 'Blackjack', config.Economy.Blackjack.cooldown)) {
                const nextBlackjack = new Date(user.commandData.lastBlackjack.getTime() + parseDuration(config.Economy.Blackjack.cooldown));
                const embed = createCooldownEmbed(nextBlackjack);
                return interaction.editReply({ embeds: [embed] });
            }

            if (user.balance < betAmount) {
                return interaction.editReply({ embeds: [createNoMoneyEmbed()], flags: MessageFlags.Ephemeral });
            }

            const deck = createDeck();
            const playerHand = [drawCard(deck), drawCard(deck)];
            const dealerHand = [drawCard(deck), drawCard(deck)];

            user.balance -= betAmount;
            user.commandData.lastBlackjack = new Date();
            await user.save();

            if (calculateHand(playerHand) === 21) {
                const dealerHandValue = calculateHand(dealerHand);
                const playerWins = dealerHandValue !== 21;
                await endBlackjackGame(interaction, user, betAmount, playerHand, dealerHand, playerWins, dealerHandValue === 21);
                return;
            }

            const attachment = await createBlackjackCanvas(playerHand, dealerHand, true);
            const embed = createBlackjackEmbed(betAmount);

            await interaction.editReply({ embeds: [embed], files: [attachment], components: createBlackjackButtons(user.balance >= betAmount) });

            const message = await interaction.fetchReply();
            setupCollector(interaction, message, deck, playerHand, dealerHand, user, betAmount);
        } catch (error) {
            console.error("Error in blackjack command: ", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.editReply({ content: lang.Economy.Messages.error, flags: MessageFlags.Ephemeral });
            }
        }
    },
};

async function initializeUser(userId) {
    const newUser = await EconomyUserData.create({
        userId,
        balance: 0,
        commandData: {
            lastBlackjack: null,
            lastDaily: null,
            lastBeg: null,
            lastWork: null,
            lastCrime: null,
            lastSlot: null,
            lastRob: null,
        },
        boosters: [],
        transactionLogs: [],
        inventory: []
    });

    return newUser;
}

function ensureUserSchema(user) {
    if (!user.commandData) {
        user.commandData = {};
    }
    if (!user.commandData.lastBlackjack) {
        user.commandData.lastBlackjack = null;
    }

    if (!Array.isArray(user.transactionLogs)) {
        user.transactionLogs = [];
    }
    if (!Array.isArray(user.boosters)) {
        user.boosters = [];
    }
    if (!Array.isArray(user.inventory)) {
        user.inventory = [];
    }
    if (typeof user.balance !== 'number') {
        user.balance = 0;
    }
}

function isOnCooldown(user, command, cooldownDuration) {
    const lastCommandTime = user.commandData[`last${command}`];
    if (!lastCommandTime) return false;
    const cooldown = parseDuration(cooldownDuration);
    return (new Date() - new Date(lastCommandTime)) < cooldown;
}

function createCooldownEmbed(nextUse) {
    return new EmbedBuilder()
        .setDescription(replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextUse.getTime() / 1000) }))
        .setColor('#FF0000');
}

function createNoMoneyEmbed() {
    return new EmbedBuilder()
        .setDescription(lang.Economy.Messages.noMoney)
        .setColor('#FF0000');
}

function createBlackjackEmbed(betAmount) {
    return new EmbedBuilder()
        .setTitle('Xì Dách')
        .setFooter({ text: `Bet: ${betAmount} Xu` });
}

function setupCollector(interaction, message, deck, playerHand, dealerHand, user, betAmount) {
    const collector = message.createMessageComponentCollector({
        time: 600000,
        filter: i => i.user.id === interaction.user.id
    });

    collector.on('collect', async i => {
        try {
            if (i.customId === 'hit') {
                playerHand.push(drawCard(deck));
                const buttons = createBlackjackButtons(user.balance >= betAmount);
                if (calculateHand(playerHand) >= 21) {
                    await endBlackjackGame(interaction, user, betAmount, playerHand, dealerHand, calculateHand(playerHand) === 21, false, i);
                    collector.stop();
                    return;
                }
                const attachment = await createBlackjackCanvas(playerHand, dealerHand, true);
                await i.update({ files: [attachment], components: buttons });
            } else if (i.customId === 'stand') {
                await handleStand(interaction, i, user, betAmount, playerHand, dealerHand, deck);
                collector.stop();
            } else if (i.customId === 'double') {
                await handleDouble(interaction, i, user, betAmount, playerHand, dealerHand, deck);
                collector.stop();
            }
        } catch (error) {
            console.error("Error during button interaction: ", error);
            if (!i.replied && !i.deferred) {
                await i.reply({ content: lang.Economy.Messages.error, flags: MessageFlags.Ephemeral });
            }
        }
    });
}

async function handleStand(interaction, collectorInteraction, user, betAmount, playerHand, dealerHand, deck) {
    while (calculateHand(dealerHand) < 17) {
        dealerHand.push(drawCard(deck));
    }
    const playerHandValue = calculateHand(playerHand);
    const dealerHandValue = calculateHand(dealerHand);
    const playerWins = playerHandValue <= 21 && (dealerHandValue > 21 || playerHandValue > dealerHandValue);
    const isDraw = playerHandValue === dealerHandValue;
    await endBlackjackGame(interaction, user, betAmount, playerHand, dealerHand, playerWins, isDraw, collectorInteraction);
}

async function handleDouble(interaction, collectorInteraction, user, betAmount, playerHand, dealerHand, deck) {
    if (user.balance < betAmount) {
        await collectorInteraction.reply({ content: lang.Economy.Messages.noMoney, flags: MessageFlags.Ephemeral });
        return;
    }
    user.balance -= betAmount;
    playerHand.push(drawCard(deck));
    while (calculateHand(dealerHand) < 17) {
        dealerHand.push(drawCard(deck));
    }
    const playerHandValue = calculateHand(playerHand);
    const dealerHandValue = calculateHand(dealerHand);
    const playerWins = playerHandValue <= 21 && (dealerHandValue > 21 || playerHandValue > dealerHandValue);
    const isDraw = playerHandValue === dealerHandValue;
    await endBlackjackGame(interaction, user, betAmount * 2, playerHand, dealerHand, playerWins, isDraw, collectorInteraction);
    await user.save();
}

function createDeck() {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ value, suit });
        }
    }
    return shuffle(deck);
}

function drawCard(deck) {
    return deck.pop();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function calculateHand(hand) {
    let sum = 0;
    let aces = 0;
    for (const card of hand) {
        if (card.value === 'A') {
            aces++;
            sum += 11;
        } else if (['K', 'Q', 'J'].includes(card.value)) {
            sum += 10;
        } else {
            sum += parseInt(card.value);
        }
    }
    while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
    }
    return sum;
}

async function createBlackjackCanvas(playerHand, dealerHand, hideDealerCard = false) {
    const cardWidth = 100;
    const cardHeight = 140;
    const canvasWidth = 800;
    const canvasHeight = 500;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#34495E';
    ctx.beginPath();
    ctx.ellipse(canvasWidth / 2, canvasHeight, canvasWidth * 0.8, canvasHeight * 0.7, 0, Math.PI, 0);
    ctx.fill();

    await drawHand(ctx, playerHand, canvasWidth / 2 - (cardWidth * playerHand.length) / 2, canvasHeight - cardHeight - 50, cardWidth, cardHeight);
    await drawHand(ctx, dealerHand, canvasWidth / 2 - (cardWidth * dealerHand.length) / 2, 50, cardWidth, cardHeight, hideDealerCard);

    ctx.fillStyle = '#ECF0F1';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Người Chơi: ${calculateHand(playerHand)}`, canvasWidth / 2, canvasHeight - 10);
    ctx.fillText(`Nhà Cái: ${hideDealerCard ? '?' : calculateHand(dealerHand)}`, canvasWidth / 2, 30);

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'blackjack.png' });
}

async function drawHand(ctx, hand, x, y, cardWidth, cardHeight, hideSecondCard = false) {
    for (let i = 0; i < hand.length; i++) {
        if (hideSecondCard && i === 1) {
            await drawCardBack(ctx, x + i * (cardWidth + 10), y, cardWidth, cardHeight);
        } else {
            await drawCardFace(ctx, hand[i].value, hand[i].suit, x + i * (cardWidth + 10), y, cardWidth, cardHeight);
        }
    }
}

async function drawCardFace(ctx, value, suit, x, y, width, height) {
    ctx.fillStyle = '#FFFFFF';
    roundedRect(ctx, x, y, width, height, 10);

    ctx.fillStyle = suit === '♠' || suit === '♣' ? '#2C3E50' : '#E74C3C';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(value, x + 10, y + 30);

    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(suit, x + width / 2, y + height / 2 + 10);
}

async function drawCardBack(ctx, x, y, width, height) {
    ctx.fillStyle = '#3498DB';
    roundedRect(ctx, x, y, width, height, 10);

    ctx.strokeStyle = '#2980B9';
    ctx.lineWidth = 2;
    for (let i = 15; i < width; i += 15) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + height);
        ctx.stroke();
    }
}

function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
}

function createBlackjackButtons(canDouble) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('hit')
                .setLabel('Rút')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('stand')
                .setLabel('Dừng')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('double')
                .setLabel('Gấp đôi')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!canDouble)
        )
    ];
}

async function endBlackjackGame(interaction, user, betAmount, playerHand, dealerHand, playerWins, isDraw = false, collectorInteraction = null) {
    try {
        const winMultiplier = config.Economy.Blackjack.winMultiplier;
        const originalBetAmount = betAmount;
        let winnings = betAmount * winMultiplier;

        const multiplier = checkActiveBooster(user, 'Money');
        winnings *= multiplier;

        let totalReturn = 0;
        if (playerWins) {
            totalReturn = betAmount + (betAmount * (winMultiplier - 1));
            user.balance += totalReturn;
        } else if (isDraw) {
            totalReturn = betAmount;
            user.balance += betAmount;
        }

        ensureUserSchema(user);

        const transactionType = playerWins ? 'blackjack_win' : isDraw ? 'blackjack_draw' : 'blackjack_lose';
        const amount = playerWins ? totalReturn - originalBetAmount : isDraw ? 0 : originalBetAmount;

        user.transactionLogs.push({
            type: transactionType,
            amount: Math.abs(amount),
            timestamp: new Date()
        });

        await user.save();

        const attachment = await createBlackjackCanvas(playerHand, dealerHand);

        const { messageTemplates, title, color } = getResultTemplates(playerWins, isDraw);

        const placeholders = {
            user: `<@${interaction.user.id}>`,
            balance: playerWins ? totalReturn : originalBetAmount,
            newBalance: user.balance
        };

        const message = replacePlaceholders(
            messageTemplates[Math.floor(Math.random() * messageTemplates.length)],
            placeholders
        );

        const suitEmoji = {
            '♠': '♠️',
            '♣': '♣️',
            '♥': '♥️',
            '♦': '♦️'
        };

        function formatHand(hand) {
            return hand.map(card => `${card.value}${suitEmoji[card.suit]}`).join(' ');
        }

        const embed = new EmbedBuilder()
            .setTitle(replacePlaceholders(lang.Economy.Games.Blackjack.Title, { result: title }))
            .setColor(color)
            .setDescription(message)
            .addFields(
                { name: 'Người Chơi', value: `\`${formatHand(playerHand)}\` (${calculateHand(playerHand)})`, inline: false },
                { name: 'Nhà Cái', value: `\`${formatHand(dealerHand)}\` (${calculateHand(dealerHand)})`, inline: false },
                { name: 'Mức Cược', value: `${betAmount} xu`, inline: true },
                { name: 'Thắng', value: `${playerWins ? totalReturn - originalBetAmount : isDraw ? 0 : -originalBetAmount} xu`, inline: true },
                { name: 'Số Dư Mới', value: `${user.balance} xu`, inline: true }
            )
            .setFooter({ text: 'Cảm ơn vì đã chơi!' });

        if (collectorInteraction) {
            await collectorInteraction.update({ embeds: [embed], files: [attachment], components: [] });
        } else {
            await interaction.editReply({ embeds: [embed], files: [attachment], components: [] });
        }
    } catch (error) {
        console.error("Error in endBlackjackGame: ", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.editReply({ content: lang.Economy.Messages.error, flags: MessageFlags.Ephemeral });
        } else if (collectorInteraction) {
            await collectorInteraction.update({ content: lang.Economy.Messages.error, components: [] });
        }
    }
}

function getResultTemplates(playerWins, isDraw) {
    if (playerWins) {
        return {
            messageTemplates: lang.Economy.Games.Blackjack.Win,
            title: 'Thắng',
            color: '#00FF00'
        };
    } else if (isDraw) {
        return {
            messageTemplates: lang.Economy.Games.Blackjack.Draw,
            title: 'Hòa',
            color: '#FFFF00'
        };
    } else {
        return {
            messageTemplates: lang.Economy.Games.Blackjack.Lose,
            title: 'Thua',
            color: '#FF0000'
        };
    }
}