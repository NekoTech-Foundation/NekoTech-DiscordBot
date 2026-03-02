const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const EconomyUserData = require('../../../models/EconomyUserData');
const { getConfig, getLang } = require('../../../utils/configLoader.js');
const config = getConfig();
const parseDuration = require('./Utility/parseDuration');
const { checkActiveBooster, replacePlaceholders } = require('./Utility/helpers');

function getRandomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
}

// --- Blackjack Helpers ---
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
function drawCard(deck) { return deck.pop(); }
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
        if (card.value === 'A') { aces++; sum += 11; }
        else if (['K', 'Q', 'J'].includes(card.value)) { sum += 10; }
        else { sum += parseInt(card.value); }
    }
    while (sum > 21 && aces > 0) { sum -= 10; aces--; }
    return sum;
}
async function createBlackjackCanvas(playerHand, dealerHand, hideDealerCard = false) {
    const cardWidth = 100, cardHeight = 140, canvasWidth = 800, canvasHeight = 500;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2C3E50'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#34495E'; ctx.beginPath(); ctx.ellipse(canvasWidth / 2, canvasHeight, canvasWidth * 0.8, canvasHeight * 0.7, 0, Math.PI, 0); ctx.fill();
    await drawHand(ctx, playerHand, canvasWidth / 2 - (cardWidth * playerHand.length) / 2, canvasHeight - cardHeight - 50, cardWidth, cardHeight);
    await drawHand(ctx, dealerHand, canvasWidth / 2 - (cardWidth * dealerHand.length) / 2, 50, cardWidth, cardHeight, hideDealerCard);
    ctx.fillStyle = '#ECF0F1'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`Người Chơi: ${calculateHand(playerHand)}`, canvasWidth / 2, canvasHeight - 10);
    ctx.fillText(`Nhà Cái: ${hideDealerCard ? '?' : calculateHand(dealerHand)}`, canvasWidth / 2, 30);
    return new AttachmentBuilder(canvas.toBuffer(), { name: 'blackjack.png' });
}
async function drawHand(ctx, hand, x, y, cardWidth, cardHeight, hideSecondCard = false) {
    for (let i = 0; i < hand.length; i++) {
        if (hideSecondCard && i === 1) await drawCardBack(ctx, x + i * (cardWidth + 10), y, cardWidth, cardHeight);
        else await drawCardFace(ctx, hand[i].value, hand[i].suit, x + i * (cardWidth + 10), y, cardWidth, cardHeight);
    }
}
async function drawCardFace(ctx, value, suit, x, y, width, height) {
    ctx.fillStyle = '#FFFFFF'; roundedRect(ctx, x, y, width, height, 10);
    ctx.fillStyle = suit === '♠' || suit === '♣' ? '#2C3E50' : '#E74C3C';
    ctx.font = 'bold 24px Arial'; ctx.textAlign = 'left'; ctx.fillText(value, x + 10, y + 30);
    ctx.font = 'bold 48px Arial'; ctx.textAlign = 'center'; ctx.fillText(suit, x + width / 2, y + height / 2 + 10);
}
async function drawCardBack(ctx, x, y, width, height) {
    ctx.fillStyle = '#3498DB'; roundedRect(ctx, x, y, width, height, 10);
    ctx.strokeStyle = '#2980B9'; ctx.lineWidth = 2;
    for (let i = 15; i < width; i += 15) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + height); ctx.stroke(); }
}
function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + width, y, x + width, y + height, radius); ctx.arcTo(x + width, y + height, x, y + height, radius); ctx.arcTo(x, y + height, x, y, radius); ctx.arcTo(x, y, x + width, y, radius); ctx.closePath(); ctx.fill();
}
function createBlackjackButtons(canDouble) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hit').setLabel('Rút').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('stand').setLabel('Dừng').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('double').setLabel('Gấp đôi').setStyle(ButtonStyle.Danger).setDisabled(!canDouble)
    )];
}

// --- Roulette Helpers ---
function spinRoulette() {
    const random = Math.floor(Math.random() * 38);
    if (random < 18) return 'red';
    if (random < 36) return 'black';
    return 'green';
}
function getRouletteMultiplier(color, result, cfg) {
    if (color === 'green' && result === 'green') return cfg.greenMultiplier || 14;
    if (color === result) return cfg.redBlackMultiplier || 2;
    return 0;
}

// --- Slot Helpers ---
function countMatches(reels) {
    if (reels[0] === reels[1] && reels[1] === reels[2]) return 3;
    if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) return 2;
    return 0;
}

// --- Visual Helpers ---
function createProgressBar(value, max, length = 10) {
    const filled = Math.round((value / max) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

const ROULETTE_COLORS = { red: '🔴', black: '⚫', green: '🟢' };
const ROULETTE_EMBED_COLORS = { red: '#E74C3C', black: '#2C3E50', green: '#2ECC71' };


module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('🎰 Các trò chơi cá cược vui vẻ')
        .addSubcommand(sub =>
            sub.setName('blackjack')
                .setDescription('Chơi một ván Xì Dách')
                .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('coinflip')
                .setDescription('Tung đồng xu thử vận may')
                .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true))
                .addStringOption(opt => opt.setName('guess').setDescription('Đoán mặt').setRequired(true)
                    .addChoices({ name: 'Mặt Sấp (Heads)', value: 'heads' }, { name: 'Mặt Ngửa (Tails)', value: 'tails' }))
        )
        .addSubcommand(sub =>
            sub.setName('roll')
                .setDescription('Cược xúc xắc Thấp hoặc Cao')
                .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true))
                .addStringOption(opt => opt.setName('guess').setDescription('Dự đoán').setRequired(true)
                    .addChoices({ name: 'Thấp (1-50)', value: 'low' }, { name: 'Cao (51-100)', value: 'high' }))
        )
        .addSubcommand(sub =>
            sub.setName('roulette')
                .setDescription('Quay Roulette')
                .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true))
                .addStringOption(opt => opt.setName('color').setDescription('Chọn màu').setRequired(true)
                    .addChoices({ name: 'Đỏ (Red)', value: 'red' }, { name: 'Đen (Black)', value: 'black' }, { name: 'Xanh (Green)', value: 'green' }))
        )
        .addSubcommand(sub =>
            sub.setName('slot')
                .setDescription('Chơi máy xèng (Slots)')
                .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true))
        ),
    category: 'Economy',
    async execute(interaction) {
        const lang = await getLang(interaction.guild?.id);
        const lG = lang.Economy.Gamble;
        const subcommand = interaction.options.getSubcommand();
        const bet = interaction.options.getInteger('bet');

        function getRandomQuote(isWin) {
            const list = isWin ? lG.Quotes.Win : lG.Quotes.Lose;
            return list[Math.floor(Math.random() * list.length)];
        }

        if (bet <= 0) return interaction.reply({ content: lang.Economy.Messages.betAmountError, flags: MessageFlags.Ephemeral });

        let user = await EconomyUserData.findOne({ userId: interaction.user.id });
        if (!user) {
            user = await EconomyUserData.create({
                userId: interaction.user.id, balance: 0, commandData: {}, boosters: [], transactionLogs: []
            });
        }
        if (!user.commandData) user.commandData = {};
        if (user.balance < bet) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(lang.Economy.Messages.noMoney).setColor('#FF0000')],
                flags: MessageFlags.Ephemeral
            });
        }

        const now = new Date();
        const checkCooldown = (key, durationStr) => {
            const last = user.commandData[key];
            const duration = parseDuration(durationStr);
            if (last && duration > 0) {
                const lastTime = new Date(last).getTime();
                const next = new Date(lastTime + duration);
                if (now < next) return next;
            }
            return null;
        };

        if (subcommand === 'blackjack') {
            const nextUse = checkCooldown('lastBlackjack', config.Economy.Blackjack.cooldown);
            if (nextUse) return interaction.reply({ embeds: [new EmbedBuilder().setDescription(replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextUse.getTime() / 1000) })).setColor('#FF0000')], flags: MessageFlags.Ephemeral });

            user.balance -= bet;
            user.commandData.lastBlackjack = now;
            await user.save();

            const deck = createDeck();
            const playerHand = [drawCard(deck), drawCard(deck)];
            const dealerHand = [drawCard(deck), drawCard(deck)];

            await interaction.deferReply();

            if (calculateHand(playerHand) === 21) {
                const dealerVal = calculateHand(dealerHand);
                const win = dealerVal !== 21;

                const winMultiplier = config.Economy.Blackjack.winMultiplier;
                const booster = checkActiveBooster(user, 'Money');
                let winnings = 0;
                let title = lG.Blackjack.Draw; let color = '#FFFF00';

                if (win) {
                    winnings = bet * winMultiplier * booster;
                    user.balance += winnings;
                    title = lG.Blackjack.Win; color = '#00FF00';
                    user.transactionLogs.push({ type: 'blackjack_win', amount: winnings - bet, timestamp: now });
                } else { // Push
                    user.balance += bet;
                    user.transactionLogs.push({ type: 'blackjack_draw', amount: 0, timestamp: now });
                }
                await user.save();

                const attachment = await createBlackjackCanvas(playerHand, dealerHand);
                const embed = new EmbedBuilder()
                    .setAuthor({ name: lG.Blackjack.ResultTitle, iconURL: interaction.user.displayAvatarURL() })
                    .setTitle(lG.Blackjack.WinTitle)
                    .setDescription(replacePlaceholders(lG.Blackjack.WinDesc, { user: user.userId === interaction.user.id ? 'You' : `<@${user.userId}>` }) + `\n\n*${getRandomQuote(true)}*`)
                    .addFields(
                        { name: lG.Blackjack.Fields.Player, value: `<@${interaction.user.id}>`, inline: true },
                        { name: lG.Blackjack.Fields.Bet, value: `\`${bet.toLocaleString()}\``, inline: true },
                        { name: lG.Blackjack.Fields.Win, value: `**+${winnings.toLocaleString()}**`, inline: true },
                        { name: lG.Blackjack.Fields.Balance, value: `\`${user.balance.toLocaleString()}\``, inline: true }
                    )
                    .setColor(color)
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1068/1068224.png')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed], files: [attachment] });
            }

            const attachment = await createBlackjackCanvas(playerHand, dealerHand, true);
            const embed = new EmbedBuilder().setTitle('Xì Dách').setFooter({ text: `${lG.Blackjack.Fields.Bet}: ${bet}` });
            const msg = await interaction.editReply({ embeds: [embed], files: [attachment], components: createBlackjackButtons(user.balance >= bet) }); // Note: Keep buttons hardcoded or localize later if needed, but labels like "Hit/Stand" are usually okay or can receive lang too if passed to helper.

            const collector = msg.createMessageComponentCollector({ time: 60000, filter: i => i.user.id === interaction.user.id });

            collector.on('collect', async i => {
                const lang = await getLang(i.guild?.id); // Refresh lang if needed within collector, though closure const lang is fine properly.
                // using closure 'lG'
                if (i.customId === 'hit') {
                    playerHand.push(drawCard(deck));
                    await i.deferUpdate();
                    if (calculateHand(playerHand) >= 21) {
                        collector.stop('finish');

                        user.transactionLogs.push({ type: 'blackjack_lose', amount: bet, timestamp: now });
                        await user.save();

                        const att = await createBlackjackCanvas(playerHand, dealerHand);

                        const embed = new EmbedBuilder()
                            .setAuthor({ name: lG.Blackjack.ResultTitle, iconURL: interaction.user.displayAvatarURL() })
                            .setTitle(lG.Blackjack.BustTitle)
                            .setColor('#FF0000')
                            .setDescription(`${lG.Blackjack.BustDesc}\n\n*${getRandomQuote(false)}*`)
                            .addFields(
                                { name: lG.Blackjack.Fields.Player, value: `<@${interaction.user.id}>`, inline: true },
                                { name: lG.Blackjack.Fields.Bet, value: `\`${bet.toLocaleString()}\``, inline: true },
                                { name: lG.Blackjack.Fields.Lose, value: `**-${bet.toLocaleString()}**`, inline: true },
                                { name: lG.Blackjack.Fields.Balance, value: `\`${user.balance.toLocaleString()}\``, inline: true }
                            )
                            .setThumbnail('https://cdn-icons-png.flaticon.com/512/1618/1618367.png')
                            .setTimestamp();

                        interaction.editReply({ embeds: [embed], files: [att], components: [] });
                        return;
                    }
                    const att = await createBlackjackCanvas(playerHand, dealerHand, true);
                    interaction.editReply({ files: [att], components: createBlackjackButtons(user.balance >= bet) });
                } else if (i.customId === 'stand') {
                    await i.deferUpdate();
                    collector.stop('stand');
                } else if (i.customId === 'double') {
                    if (user.balance < bet) return i.reply({ content: lang.Economy.Messages.noMoney, flags: MessageFlags.Ephemeral });
                    user.balance -= bet;
                    playerHand.push(drawCard(deck));
                    collector.stop('double');
                }
            });

            collector.on('end', async (c, reason) => {
                let finalBet = bet;
                if (reason === 'double') finalBet = bet * 2;

                if (reason === 'stand' || reason === 'double') {
                    while (calculateHand(dealerHand) < 17) dealerHand.push(drawCard(deck));
                    const pVal = calculateHand(playerHand);
                    const dVal = calculateHand(dealerHand);

                    let win = false; let draw = false;
                    if (pVal > 21) win = false;
                    else if (dVal > 21) win = true;
                    else if (pVal > dVal) win = true;
                    else if (pVal === dVal) draw = true;

                    const booster = checkActiveBooster(user, 'Money');
                    const multiplier = config.Economy.Blackjack.winMultiplier;

                    if (win) {
                        const totalReturn = finalBet + (finalBet * (multiplier - 1) * booster);
                        user.balance += totalReturn;
                        user.transactionLogs.push({ type: 'blackjack_win', amount: totalReturn - finalBet, timestamp: now });
                    } else if (draw) {
                        user.balance += finalBet;
                        user.transactionLogs.push({ type: 'blackjack_draw', amount: 0, timestamp: now });
                    } else {
                        user.transactionLogs.push({ type: 'blackjack_lose', amount: finalBet, timestamp: now });
                    }
                    await user.save();

                    const att = await createBlackjackCanvas(playerHand, dealerHand);
                    const color = win ? '#00FF00' : draw ? '#FFFF00' : '#FF0000';
                    const title = win ? lG.Blackjack.Win : draw ? lG.Blackjack.Draw : lG.Blackjack.Lose;

                    const resultMoneyStr = win ? `**+${(finalBet + (finalBet * (multiplier - 1) * booster) - finalBet).toLocaleString()}**` : draw ? '**0**' : `**-${finalBet.toLocaleString()}**`;

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: lG.Blackjack.ResultTitle, iconURL: interaction.user.displayAvatarURL() })
                        .setTitle(title)
                        .setColor(color)
                        .setDescription(`${replacePlaceholders(lG.Blackjack.ResultDesc, { pVal, dVal })}\n\n*${win ? getRandomQuote(true) : draw ? '' : getRandomQuote(false)}*`)
                        .addFields(
                            { name: lG.Blackjack.Fields.Player, value: `<@${interaction.user.id}>`, inline: true },
                            { name: lG.Blackjack.Fields.Bet, value: `\`${finalBet.toLocaleString()}\``, inline: true },
                            { name: lG.Blackjack.Fields.Result, value: resultMoneyStr, inline: true },
                            { name: lG.Blackjack.Fields.Balance, value: `\`${user.balance.toLocaleString()}\``, inline: true }
                        )
                        .setThumbnail(win ? 'https://cdn-icons-png.flaticon.com/512/755/755195.png' : 'https://cdn-icons-png.flaticon.com/512/1008/1008953.png')
                        .setTimestamp();

                    interaction.editReply({
                        embeds: [embed],
                        files: [att],
                        components: []
                    });
                }
            });

        } else if (subcommand === 'coinflip') {
            const nextUse = checkCooldown('lastCoinflip', config.Economy.Coinflip.cooldown);
            if (nextUse) return interaction.reply({ content: replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextUse.getTime() / 1000) }), flags: MessageFlags.Ephemeral });

            const guess = interaction.options.getString('guess');
            const result = Math.random() > 0.5 ? 'heads' : 'tails';
            const win = guess === result;
            const booster = checkActiveBooster(user, 'Money');
            const winMulti = config.Economy.Coinflip.winMultiplier || 1.95;
            const winnings = win ? Math.floor(bet * winMulti * booster) : 0;
            const netAmount = win ? winnings - bet : -bet;

            user.balance += netAmount;
            user.commandData.lastCoinflip = now;
            user.transactionLogs.push({ type: 'coinflip', amount: netAmount, timestamp: now });
            await user.save();

            const resultText = result === 'heads' ? lG.Coinflip.Heads : lG.Coinflip.Tails;
            const guessText = guess === 'heads' ? lG.Coinflip.Heads : lG.Coinflip.Tails;
            const coinEmoji = result === 'heads' ? '🪙' : '💿';

            // Animation
            const spinMsg = await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setAuthor({ name: `🪙 Coinflip`, iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`> 🔄 ${lG.Coinflip.Spinning || 'Đang tung...'}`)
                    .setColor('#FFA500')
                ], fetchReply: true
            });

            const flipFrames = ['🪙', '💿', '🪙', '💿'];
            for (const frame of flipFrames) {
                await new Promise(r => setTimeout(r, 400));
                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setAuthor({ name: `🪙 Coinflip`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`> ${frame} ${lG.Coinflip.Spinning || 'Đang tung...'}`)
                        .setColor('#FFA500')
                    ]
                });
            }

            await new Promise(r => setTimeout(r, 500));

            const embed = new EmbedBuilder()
                .setAuthor({ name: `🪙 Coinflip`, iconURL: interaction.user.displayAvatarURL() })
                .setTitle(win ? `${coinEmoji} ${lG.Coinflip.WinTitle}` : `${coinEmoji} ${lG.Coinflip.LoseTitle}`)
                .setDescription(`${coinEmoji} ${replacePlaceholders(lG.Coinflip.ResultDesc, { result: resultText, guess: guessText })}\n\n> *${getRandomQuote(win)}*`)
                .addFields(
                    { name: lG.Coinflip.Fields?.Player || '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                    { name: lG.Coinflip.Fields?.Bet || '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                    { name: lG.Coinflip.Fields?.Result || '💵 Kết quả', value: win ? `**+${netAmount.toLocaleString()}** 🪙` : `**${netAmount.toLocaleString()}** 🪙`, inline: true },
                    { name: lG.Coinflip.Fields?.Balance || '💳 Số dư', value: `\`${user.balance.toLocaleString()}\` 🪙`, inline: true }
                )
                .setColor(win ? '#2ECC71' : '#E74C3C')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/1490/1490817.png')
                .setFooter({ text: `x${winMulti} • ${lG.Coinflip.Fields?.Multiplier || 'Tỉ lệ'}` })
                .setTimestamp();
            interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'roll') {
            const nextUse = checkCooldown('lastRoll', config.Economy.Roll.cooldown);
            if (nextUse) return interaction.reply({ content: replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextUse.getTime() / 1000) }), flags: MessageFlags.Ephemeral });

            const guess = interaction.options.getString('guess');
            const roll = Math.floor(Math.random() * 100) + 1;
            const win = (guess === 'low' && roll <= 50) || (guess === 'high' && roll > 50);
            const booster = checkActiveBooster(user, 'Money');
            const rollMulti = config.Economy.Roll.winMultiplier || 1.95;
            const winnings = win ? Math.floor(bet * rollMulti * booster) : 0;
            const netAmount = win ? winnings - bet : -bet;

            user.balance += netAmount;
            user.commandData.lastRoll = now;
            user.transactionLogs.push({ type: 'roll', amount: netAmount, timestamp: now });
            await user.save();

            const guessText = guess === 'low' ? lG.Roll.Low : lG.Roll.High;
            const bar = createProgressBar(roll, 100, 20);
            const pointer = roll <= 50 ? '⬇️ Xỉu' : '⬆️ Tài';

            // Animation
            const rollMsg = await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setAuthor({ name: `🎲 Roll`, iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`> 🔄 ${lG.Roll.Rolling || 'Đang lắc xúc xắc...'}`)
                    .setColor('#FFA500')
                ], fetchReply: true
            });

            for (let i = 0; i < 3; i++) {
                await new Promise(r => setTimeout(r, 500));
                const fakeRoll = Math.floor(Math.random() * 100) + 1;
                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setAuthor({ name: `🎲 Roll`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`> 🎲 **${fakeRoll}**\n> ${lG.Roll.Rolling || 'Đang lắc xúc xắc...'}`)
                        .setColor('#FFA500')
                    ]
                });
            }

            await new Promise(r => setTimeout(r, 600));

            const embed = new EmbedBuilder()
                .setAuthor({ name: `🎲 Roll`, iconURL: interaction.user.displayAvatarURL() })
                .setTitle(win ? lG.Roll.WinTitle : lG.Roll.LoseTitle)
                .setDescription(`🎲 **${roll}** ${pointer}\n\`${bar}\` \`${roll}/100\`\n\n${replacePlaceholders(lG.Roll.ResultDesc, { roll, guess: guessText })}\n\n> *${getRandomQuote(win)}*`)
                .addFields(
                    { name: lG.Roll.Fields?.Player || '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                    { name: lG.Roll.Fields?.Bet || '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                    { name: lG.Roll.Fields?.Result || '💵 Kết quả', value: win ? `**+${netAmount.toLocaleString()}** 🪙` : `**${netAmount.toLocaleString()}** 🪙`, inline: true },
                    { name: lG.Roll.Fields?.Balance || '💳 Số dư', value: `\`${user.balance.toLocaleString()}\` 🪙`, inline: true }
                )
                .setColor(win ? '#2ECC71' : '#E74C3C')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/2821/2821898.png')
                .setFooter({ text: `x${rollMulti} • ${lG.Roll.Fields?.Multiplier || 'Tỉ lệ'}` })
                .setTimestamp();
            interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'roulette') {
            const nextUse = checkCooldown('lastRoulette', config.Economy.Roulette.cooldown);
            if (nextUse) return interaction.reply({ content: replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextUse.getTime() / 1000) }), flags: MessageFlags.Ephemeral });

            const color = interaction.options.getString('color');
            const result = spinRoulette();
            const rouletteCfg = config.Economy.Roulette;
            const winMulti = getRouletteMultiplier(color, result, rouletteCfg);

            user.balance -= bet;
            user.commandData.lastRoulette = now;

            const resultText = result === 'red' ? lG.Roulette.Red : result === 'black' ? lG.Roulette.Black : lG.Roulette.Green;
            const colorText = color === 'red' ? lG.Roulette.Red : color === 'black' ? lG.Roulette.Black : lG.Roulette.Green;
            const resultEmoji = ROULETTE_COLORS[result];
            const choiceEmoji = ROULETTE_COLORS[color];
            const embedColor = ROULETTE_EMBED_COLORS[result];

            // Animation
            const spinFrames = ['🔴', '⚫', '🟢', '🔴', '⚫'];
            const rouletteMsg = await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setAuthor({ name: `🎡 Roulette`, iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`> 🔄 ${lG.Roulette.Spinning || 'Đang quay bánh xe...'}`)
                    .setColor('#FFA500')
                ], fetchReply: true
            });

            for (const frame of spinFrames) {
                await new Promise(r => setTimeout(r, 400));
                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setAuthor({ name: `🎡 Roulette`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`> ${frame} ${lG.Roulette.Spinning || 'Đang quay bánh xe...'}`)
                        .setColor('#FFA500')
                    ]
                });
            }

            await new Promise(r => setTimeout(r, 500));

            const win = winMulti > 0;
            let netAmount = 0;
            if (win) {
                const booster = checkActiveBooster(user, 'Money');
                const winnings = Math.floor(bet * winMulti * booster);
                user.balance += winnings;
                netAmount = winnings - bet;
                user.transactionLogs.push({ type: 'roulette', amount: netAmount, timestamp: now });
            } else {
                netAmount = -bet;
                user.transactionLogs.push({ type: 'roulette', amount: -bet, timestamp: now });
            }
            await user.save();

            const embed = new EmbedBuilder()
                .setAuthor({ name: `🎡 Roulette`, iconURL: interaction.user.displayAvatarURL() })
                .setTitle(win ? `${resultEmoji} ${lG.Roulette.WinTitle}` : `${resultEmoji} ${lG.Roulette.LoseTitle}`)
                .setDescription(`${resultEmoji} ${replacePlaceholders(lG.Roulette.ResultDesc, { result: resultText, color: colorText })}\n${choiceEmoji} → ${resultEmoji}\n\n> *${getRandomQuote(win)}*`)
                .addFields(
                    { name: lG.Roulette.Fields?.Player || '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                    { name: lG.Roulette.Fields?.Bet || '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                    { name: lG.Roulette.Fields?.Result || '💵 Kết quả', value: win ? `**+${netAmount.toLocaleString()}** 🪙` : `**${netAmount.toLocaleString()}** 🪙`, inline: true },
                    { name: lG.Roulette.Fields?.Balance || '💳 Số dư', value: `\`${user.balance.toLocaleString()}\` 🪙`, inline: true }
                )
                .setColor(embedColor)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/1055/1055905.png')
                .setFooter({ text: `x${winMulti || 0} • 🔴 x${rouletteCfg.redBlackMultiplier || 2} | ⚫ x${rouletteCfg.redBlackMultiplier || 2} | 🟢 x${rouletteCfg.greenMultiplier || 14}` })
                .setTimestamp();
            interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'slot') {
            const nextUse = checkCooldown('lastSlot', config.Economy.Slot.cooldown);
            if (nextUse) return interaction.reply({ content: replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextUse.getTime() / 1000) }), flags: MessageFlags.Ephemeral });

            const symbols = ['🍒', '🍋', '🍉', '🔔', '⭐', '💎', '7️⃣'];
            const slotCfg = config.Economy.Slot;
            const jackpotMulti = slotCfg.jackpotMultiplier || 10;
            const twoMatchMulti = slotCfg.twoMatchMultiplier || 1.5;

            // Payout info string
            const payoutInfo = `\`3x\` = **x${jackpotMulti}** 🎰 | \`2x\` = **x${twoMatchMulti}** 🎲`;

            const spinMsg = await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setAuthor({ name: '🎰 Slots', iconURL: interaction.user.displayAvatarURL() })
                    .setTitle(lG.Slot.SpinningTitle)
                    .setDescription(`> ⬛ ▪️ ⬛ ▪️ ⬛\n\n${payoutInfo}`)
                    .setColor('#FFA500')
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1068/1068228.png')]
                , fetchReply: true
            });

            // Spinning animation
            for (let i = 0; i < 4; i++) {
                await new Promise(r => setTimeout(r, 700));
                const tempR = [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];
                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setAuthor({ name: '🎰 Slots', iconURL: interaction.user.displayAvatarURL() })
                        .setTitle(lG.Slot.SpinningTitle)
                        .setDescription(`> ${tempR.join(' ▪️ ')}\n\n${payoutInfo}`)
                        .setColor('#FFA500')
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/1068/1068228.png')]
                });
            }

            await new Promise(r => setTimeout(r, 800));

            // Final result
            const r = [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];
            const matches = countMatches(r);
            const booster = checkActiveBooster(user, 'Money');

            let amount = 0;
            let resultTitle = lG.Slot.LoseTitle;
            let resultColor = '#E74C3C';
            let resultType = 'slot_lose';

            if (matches === 3) {
                amount = Math.floor(bet * jackpotMulti * booster) - bet;
                resultTitle = `🎰 ${lG.Slot.JackpotTitle || lG.Slot.WinTitle}`;
                resultColor = '#FFD700';
                resultType = 'slot_jackpot';
            } else if (matches === 2) {
                amount = Math.floor(bet * twoMatchMulti * booster) - bet;
                resultTitle = `🎲 ${lG.Slot.PartialWinTitle || lG.Slot.WinTitle}`;
                resultColor = '#2ECC71';
                resultType = 'slot_partial';
            } else {
                amount = -bet;
                resultTitle = `💨 ${lG.Slot.LoseTitle}`;
            }

            user.balance += amount;
            user.commandData.lastSlot = now;
            user.transactionLogs.push({ type: resultType, amount, timestamp: now });
            await user.save();

            // Highlight matching symbols
            const reelDisplay = r.join(' ▪️ ');
            const matchLabel = matches === 3
                ? (lG.Slot.Jackpot || '🎉 JACKPOT!')
                : matches === 2
                    ? (lG.Slot.PartialMatch || '✨ 2 Match!')
                    : (lG.Slot.NoMatch || '💨 No Match');

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setAuthor({ name: '🎰 Slots', iconURL: interaction.user.displayAvatarURL() })
                    .setTitle(resultTitle)
                    .setDescription(`> ${reelDisplay}\n> **${matchLabel}**\n\n${payoutInfo}\n\n> *${getRandomQuote(matches > 0)}*`)
                    .addFields(
                        { name: lG.Slot.Fields?.Player || '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                        { name: lG.Slot.Fields?.Bet || '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                        { name: lG.Slot.Fields?.Result || '💵 Kết quả', value: amount >= 0 ? `**+${amount.toLocaleString()}** 🪙` : `**${amount.toLocaleString()}** 🪙`, inline: true },
                        { name: lG.Slot.Fields?.Balance || '💳 Số dư', value: `\`${user.balance.toLocaleString()}\` 🪙`, inline: true }
                    )
                    .setColor(resultColor)
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1068/1068228.png')
                    .setFooter({ text: `3x = x${jackpotMulti} | 2x = x${twoMatchMulti}` })
                    .setTimestamp()]
            });
        }
    }
};
