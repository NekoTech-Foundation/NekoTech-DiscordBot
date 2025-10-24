const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../../../models/UserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const parseDuration = require('./Utility/parseDuration');

const { checkActiveBooster, replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Đặt cược xem kết quả tung xúc xắc sẽ thấp hay cao.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Đặt số tiền cược')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Đặt Thấp hoặc Cao')
                .setRequired(true)
                .addChoices(
                    { name: 'Thấp (1-50)', value: 'low' },
                    { name: 'Cao (51-100)', value: 'high' }
                )),
    category: 'Economy',
    async execute(interaction) {
        const betAmount = interaction.options.getInteger('amount');
        const betChoice = interaction.options.getString('bet').toLowerCase();

        if (betAmount <= 0) {
            return interaction.reply({ content: lang.Economy.Messages.betAmountError, flags: MessageFlags.Ephemeral });
        }

        let user = await User.findOne(
            { userId: interaction.user.id, guildId: interaction.guild.id },
            { balance: 1, 'commandData.lastRoll': 1, transactionLogs: 1, boosters: 1 }
        );

        if (!user) {
            user = new User({ userId: interaction.user.id, guildId: interaction.guild.id, balance: 0, commandData: {}, transactionLogs: [] });
        } else if (!Array.isArray(user.transactionLogs)) {
            user.transactionLogs = [];
        }

        if (user.balance < betAmount) {
            return interaction.reply({ content: lang.Economy.Messages.noMoney, flags: MessageFlags.Ephemeral });
        }

        const now = new Date();
        const cooldown = parseDuration(config.Economy.Roll.cooldown);

        if (cooldown > 0 && user.commandData.lastRoll) {
            const nextRoll = new Date(user.commandData.lastRoll.getTime() + cooldown);
            if (now < nextRoll) {
                const embed = new EmbedBuilder()
                    .setDescription(replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextRoll.getTime() / 1000) }))
                    .setColor('#FF0000')
                    .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) });
                return interaction.reply({ embeds: [embed] });
            }
        }

        const rollResult = Math.floor(Math.random() * 100) + 1;
        const isWin = (betChoice === 'low' && rollResult <= 50) || (betChoice === 'high' && rollResult > 50);
        const baseMultiplier = 2;
        const boosterMultiplier = checkActiveBooster(user, 'Money');
        const totalMultiplier = baseMultiplier * boosterMultiplier;

        let placeholders = {
            user: `<@${interaction.user.id}>`,
            balance: betAmount,
            rollResult: rollResult
        };

        let description, color, title;

        if (isWin) {
            const winnings = betAmount * totalMultiplier;
            user.balance += winnings;
            placeholders.balance = winnings;

            description = replacePlaceholders(lang.Economy.Games.Roll.Win[Math.floor(Math.random() * lang.Economy.Games.Roll.Win.length)], placeholders);
            color = '#00FF00';
            title = replacePlaceholders(lang.Economy.Games.Roll.Title, { result: lang.Economy.Messages.win });
        } else {
            user.balance -= betAmount;

            description = replacePlaceholders(lang.Economy.Games.Roll.Lose[Math.floor(Math.random() * lang.Economy.Games.Roll.Lose.length)], placeholders);
            color = '#FF0000';
            title = replacePlaceholders(lang.Economy.Games.Roll.Title, { result: lang.Economy.Messages.lose });
        }

        user.commandData.lastRoll = now;
        user.transactionLogs.push({
            type: 'roll',
            amount: isWin ? betAmount * totalMultiplier : -betAmount,
            timestamp: now
        });

        await user.save();

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .addFields(
                { name: lang.Economy.Messages.rollResult, value: rollResult.toString(), inline: true },
                { name: lang.Economy.Messages.bet, value: betChoice.charAt(0).toUpperCase() + betChoice.slice(1), inline: true }
            )
            .setColor(color)
            .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) });

        await interaction.reply({ embeds: [embed] });
    },
};