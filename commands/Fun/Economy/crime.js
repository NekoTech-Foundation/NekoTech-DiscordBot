const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const { checkActiveBooster, replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Đi ăn cướp thử xem sao..!'),
    category: 'Economy',
    async execute(interaction, lang) {
        try {
            let user = await EconomyUserData.findOne(
                { userId: interaction.user.id },
                { balance: 1, 'commandData.lastCrime': 1, transactionLogs: 1, boosters: 1 }
            );

            const now = new Date();

            const cooldown = parseDuration(config.Economy.Crime.cooldown);
            if (user && user.commandData.lastCrime) {
                const nextCrime = new Date(new Date(user.commandData.lastCrime).getTime() + cooldown);
                if (now < nextCrime) {
                    const embed = new EmbedBuilder()
                        .setDescription(replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextCrime.getTime() / 1000) }))
                        .setColor('#FF0000')
                        .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) });
                    return interaction.reply({ embeds: [embed] });
                }
            }

            let amount = Math.floor(Math.random() * (config.Economy.Crime.max - config.Economy.Crime.min + 1)) + config.Economy.Crime.min;
            const multiplier = checkActiveBooster(user, 'Money');
            amount *= multiplier;
            const success = amount > 0;

            if (!user) {
                user = await EconomyUserData.create({
                    userId: interaction.user.id,
                    balance: success ? amount : 0,
                    commandData: { lastCrime: now },
                    transactionLogs: []
                });
            } else {
                user.balance += amount;

                if (user.balance < 0) {
                    user.balance = 0;
                }

                user.commandData.lastCrime = now;
            }

            user.transactionLogs.push({
                type: 'crime',
                amount: amount,
                timestamp: now
            });

            await user.save();

            const placeholders = {
                user: `<@${interaction.user.id}>`,
                balance: Math.abs(amount)
            };

            const crimeTitle = replacePlaceholders(lang.Economy.Games.Crime.Title, { result: success ? lang.Economy.Messages.win : lang.Economy.Messages.lose });
            const description = success
                ? replacePlaceholders(lang.Economy.Games.Crime.Win[Math.floor(Math.random() * lang.Economy.Games.Crime.Win.length)], placeholders)
                : replacePlaceholders(lang.Economy.Games.Crime.Lose[Math.floor(Math.random() * lang.Economy.Games.Crime.Lose.length)], placeholders);

            const embed = new EmbedBuilder()
                .setTitle(crimeTitle)
                .setDescription(description)
                .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) })
                .setColor(success ? '#00FF00' : '#FF0000');

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Error in crime command: ", error);
            interaction.reply({ content: lang.Economy.Messages.error, flags: MessageFlags.Ephemeral });
        }
    },
};

function parseDuration(str) {
    if (!str) return 0;
    const match = str.match(/(\d+)(s|m|h|d|w)/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'w': return value * 7 * 24 * 60 * 60 * 1000;
        default: return 0;
    }
}