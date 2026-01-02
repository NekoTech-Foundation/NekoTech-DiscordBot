const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const { replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('booster')
        .setDescription('Manage your boosters')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your active boosters')),
    category: 'Economy',
    async execute(interaction, lang) {
        const user = await EconomyUserData.findOne(
            { userId: interaction.user.id },
            { boosters: 1 }
        );

        if (!user) {
            return interaction.reply({ content: lang.Economy.Messages.error, flags: MessageFlags.Ephemeral });
        }

        if (interaction.options.getSubcommand() === 'view') {
            if (user.boosters.length === 0) {
                return interaction.reply({ content: lang.Economy.Messages.noBoosters, flags: MessageFlags.Ephemeral });
            }

            const boosterList = user.boosters.map(booster => {
                const placeholders = {
                    type: booster.type,
                    multiplier: booster.multiplier,
                    endTime: Math.floor(booster.endTime / 1000),
                };
                return replacePlaceholders(lang.Economy.Other.Boosters.description, placeholders);
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(lang.Economy.Other.Boosters.title)
                .setDescription(boosterList)
                .setColor('#00FF00');

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    },
};