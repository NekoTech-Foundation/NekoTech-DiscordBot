const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const parseDuration = require('./Utility/parseDuration');

const { checkActiveBooster, replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('beg')
        .setDescription('Đi ăn xin... đúng vậy,ăn xin kiếm xèng'),
    category: 'Economy',
    async execute(interaction, lang) {
        await interaction.deferReply();
        let user = await EconomyUserData.findOne(
            { userId: interaction.user.id },
            {
                balance: 1,
                commandData: 1,
                transactionLogs: 1
            }
        );

        const now = new Date();

        const cooldown = parseDuration(config.Economy.Beg.cooldown);
        if (user && user.commandData.lastBeg) {
            const nextBeg = new Date(new Date(user.commandData.lastBeg).getTime() + cooldown);
            if (now < nextBeg) {
                const embed = new EmbedBuilder()
                    .setDescription(replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextBeg.getTime() / 1000) }))
                    .setColor('#FF0000');
                return interaction.editReply({ embeds: [embed] });
            }
        }

        let coins = Math.floor(Math.random() * (config.Economy.Beg.max - config.Economy.Beg.min + 1)) + config.Economy.Beg.min;
        const multiplier = checkActiveBooster(user, 'Money');
        coins *= multiplier;

        if (!user) {
            user = await EconomyUserData.create({ userId: interaction.user.id, balance: coins, commandData: { lastBeg: now } });
        } else {
            user.balance += coins;
            user.commandData.lastBeg = now;
        }

        user.transactionLogs.push({
            type: 'beg',
            amount: coins,
            timestamp: new Date()
        });

        await user.save();

        const messageTemplates = lang.Economy.Actions.Beg.Messages;
        const placeholders = {
            balance: coins,
            user: `<@${interaction.user.id}>`
        };
        const message = replacePlaceholders(messageTemplates[Math.floor(Math.random() * messageTemplates.length)], placeholders);

        const embed = new EmbedBuilder()
            .setDescription(message)
            .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) })
            .setColor('#00FF00');

        if (lang.Economy.Actions.Beg.Title) {
            embed.setTitle(replacePlaceholders(lang.Economy.Actions.Beg.Title, placeholders));
        }

        return interaction.editReply({ embeds: [embed] });
    },
};