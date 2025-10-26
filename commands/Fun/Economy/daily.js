const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();
const { checkActiveBooster, replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Nhận quà hàng ngày nào!'),
    category: 'Economy',
    async execute(interaction) {
        try {
            let user = await EconomyUserData.findOne(
                { userId: interaction.user.id },
                { balance: 1, 'commandData.lastDaily': 1, 'commandData.dailyStreak': 1, transactionLogs: 1, boosters: 1 }
            );
            const now = new Date();
            let reward = config.Economy.Daily.baseAmount;
            let streak = 1;

            if (user && user.commandData.lastDaily) {
                const lastDaily = new Date(user.commandData.lastDaily);

                const isSameDay = now.getUTCFullYear() === lastDaily.getUTCFullYear() &&
                    now.getUTCMonth() === lastDaily.getUTCMonth() &&
                    now.getUTCDate() === lastDaily.getUTCDate();

                if (isSameDay) {
                    const nextDaily = new Date(lastDaily);
                    nextDaily.setHours(nextDaily.getHours() + 24);

                    if (now < nextDaily) {
                        const embed = new EmbedBuilder()
                            .setDescription(replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextDaily.getTime() / 1000) }))
                            .setColor('#FF0000')
                            .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) });
                        return interaction.reply({ embeds: [embed] });
                    }
                } else {
                    const wasYesterday = now.getUTCFullYear() === lastDaily.getUTCFullYear() &&
                        now.getUTCMonth() === lastDaily.getUTCMonth() &&
                        now.getUTCDate() === lastDaily.getUTCDate() + 1;

                    if (wasYesterday) {
                        streak = (user.commandData.dailyStreak || 1) + 1;
                        reward = Math.min(config.Economy.Daily.baseAmount + streak * config.Economy.Daily.increasePerDay, config.Economy.Daily.maxAmount);
                    } else {
                        streak = 1;
                    }
                }
            }

            const multiplier = checkActiveBooster(user, 'Money');
            reward *= multiplier;

            if (!user) {
                user = new EconomyUserData({
                    userId: interaction.user.id,
                    balance: reward,
                    commandData: { lastDaily: now, dailyStreak: streak },
                    transactionLogs: []
                });
            } else {
                user.balance += reward;
                user.commandData.lastDaily = now;
                user.commandData.dailyStreak = streak;
            }

            user.transactionLogs.push({
                type: 'daily',
                amount: reward,
                timestamp: now
            });

            await user.save();

            const placeholders = {
                user: `<@${interaction.user.id}>`,
                balance: reward,
                streak: streak
            };

            const description = replacePlaceholders(lang.Economy.Actions.Daily.Messages[Math.floor(Math.random() * lang.Economy.Actions.Daily.Messages.length)], placeholders);

            const embed = new EmbedBuilder()
                .setDescription(description)
                .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) })
                .setColor('#00FF00');

            const dailyTitle = lang.Economy.Actions.Daily.Title;
            if (dailyTitle) {
                embed.setTitle(dailyTitle);
            }

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Error in daily command: ", error);
            interaction.reply({ content: lang.Economy.Messages.error, flags: MessageFlags.Ephemeral });
        }
    },
};