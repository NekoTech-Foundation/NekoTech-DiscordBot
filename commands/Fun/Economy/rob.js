const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const { checkActiveBooster, replacePlaceholders, getOutcomeLabel } = require('./Utility/helpers');
const parseDuration = require('./Utility/parseDuration');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Đi móc ví... đúng rồi đấy,ăn cướp')
        .addUserOption(option => option.setName('target').setDescription('Chọn đối tượng').setRequired(true)),
    category: 'Economy',
    async execute(interaction, lang) {
        const target = interaction.options.getUser('target');

        let user = await EconomyUserData.findOne({ userId: interaction.user.id }, { balance: 1, 'commandData.lastRob': 1, transactionLogs: 1, boosters: 1 });
        const now = new Date();

        const cooldown = parseDuration(config.Economy.Rob.cooldown);
        if (user && user.commandData.lastRob) {
            const nextRob = new Date(new Date(user.commandData.lastRob).getTime() + cooldown);
            if (now < nextRob) {
                const embed = new EmbedBuilder()
                    .setDescription(replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextRob.getTime() / 1000) }))
                    .setColor('#FF0000');
                return interaction.reply({ embeds: [embed] });
            }
        }

        if (target.id === interaction.user.id) {
            const embed = new EmbedBuilder()
                .setDescription('Sao bạn lại móc ví chính mình?')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed] });
        }

        const targetUser = await EconomyUserData.findOne({ userId: target.id }, { balance: 1, transactionLogs: 1 });

        if (!targetUser || targetUser.balance < config.Economy.Rob.minBalanceToRob) {
            const embed = new EmbedBuilder()
                .setDescription(lang.Economy.Messages.targetRob)
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed] });
        }

        const success = Math.random() > 0.5;
        let amount = Math.min(targetUser.balance, Math.floor(targetUser.balance * parseFloat(config.Economy.Rob.percent) / 100), parseInt(config.Economy.Rob.maxAmount, 10));

        const placeholders = {
            user: `<@${interaction.user.id}>`,
            victim: `<@${target.id}>`,
            balance: amount,
        };

        const robTitle = replacePlaceholders(lang.Economy.Games.Rob.Title, { result: getOutcomeLabel(lang, success) });

        if (success) {
            const multiplier = checkActiveBooster(user, 'Money');
            amount *= multiplier;
            targetUser.balance -= amount;
            user.balance += amount;
            user.commandData.lastRob = now;

            user.transactionLogs.push({
                type: 'rob',
                amount: amount,
                timestamp: now
            });
            targetUser.transactionLogs.push({
                type: 'robbed',
                amount: -amount,
                timestamp: now
            });

            await targetUser.save();
            await user.save();

            const winMessage = replacePlaceholders(lang.Economy.Games.Rob.Win[Math.floor(Math.random() * lang.Economy.Games.Rob.Win.length)], placeholders);

            const embed = new EmbedBuilder()
                .setTitle(robTitle)
                .setDescription(winMessage)
                .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) })
                .setColor('#00FF00');
            return interaction.reply({ embeds: [embed] });
        } else {
            user.commandData.lastRob = now;
            user.transactionLogs.push({
                type: 'rob_fail',
                amount: 0,
                timestamp: now
            });

            await user.save();

            const loseMessage = replacePlaceholders(lang.Economy.Games.Rob.Lose[Math.floor(Math.random() * lang.Economy.Games.Rob.Lose.length)], placeholders);

            const embed = new EmbedBuilder()
                .setTitle(robTitle)
                .setDescription(loseMessage)
                .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) })
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed] });
        }
    },
};