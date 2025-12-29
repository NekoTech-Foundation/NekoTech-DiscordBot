const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const parseDuration = require('./Utility/parseDuration');

const { checkActiveBooster, replacePlaceholders } = require('./Utility/helpers');

function getRandomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slot')
        .setDescription('Chơi máy xèng')
        .addIntegerOption(option => option.setName('bet').setDescription('Bet amount').setRequired(true)),
    category: 'Economy',
    async execute(interaction) {
        try {
            const cooldown = parseDuration(config.Economy.Slot.cooldown);

            let user = await EconomyUserData.findOne(
                { userId: interaction.user.id },
                { balance: 1, 'commandData.lastSlot': 1, transactionLogs: 1, boosters: 1 }
            );

            if (!user) {
                user = await EconomyUserData.create({
                    userId: interaction.user.id,
                    balance: 0,
                    commandData: {},
                    boosters: []
                });
            }

            const now = new Date();

            if (cooldown > 0 && user.commandData.lastSlot) {
                const nextSlot = new Date(user.commandData.lastSlot.getTime() + cooldown);
                if (now < nextSlot) {
                    const embed = new EmbedBuilder()
                        .setDescription(replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextSlot.getTime() / 1000) }))
                        .setColor('#FF0000')
                        .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) });
                    return interaction.reply({ embeds: [embed] });
                }
            }

            const bet = interaction.options.getInteger('bet');

            if (bet <= 0) {
                return interaction.reply({ content: lang.Economy.Messages.betAmountError, flags: MessageFlags.Ephemeral });
            }

            if (user.balance < bet) {
                const embed = new EmbedBuilder()
                    .setDescription(lang.Economy.Messages.noMoney)
                    .setColor('#FF0000');
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            const symbols = ['🍒', '🍋', '🍉', '🔔', '⭐'];
            const result = [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];

            const win = result[0] === result[1] && result[1] === result[2];
            const multiplier = checkActiveBooster(user, 'Money');
            const amount = win ? bet * config.Economy.Slot.multiplier * multiplier : -bet;

            user.balance += amount;
            user.commandData.lastSlot = now;
            user.transactionLogs.push({
                type: 'slot',
                amount: amount,
                timestamp: now
            });

            await user.save();

            const placeholders = {
                user: `<@${interaction.user.id}>`,
                balance: Math.abs(amount),
                slotsResult: result.join(' '),
                nextUse: Math.floor(now.getTime() / 1000)
            };

            const slotTitle = replacePlaceholders(lang.Economy.Games.Slots.Title, { result: win ? lang.Economy.Messages.win : lang.Economy.Messages.lose });

            const winMessage = replacePlaceholders(getRandomMessage(lang.Economy.Games.Slots.Win), placeholders);
            const loseMessage = replacePlaceholders(getRandomMessage(lang.Economy.Games.Slots.Lose), placeholders);
            const description = win ? winMessage : loseMessage;

            const embed = new EmbedBuilder()
                .setTitle(slotTitle)
                .setColor(win ? '#00FF00' : '#FF0000')
                .setDescription(description)
                .addFields({ name: lang.Economy.Messages.outcome, value: placeholders.slotsResult, inline: true })
                .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) });

            interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Error in slot command: ", error);
            interaction.reply({ content: lang.Economy.Messages.error, flags: MessageFlags.Ephemeral });
        }
    }
};