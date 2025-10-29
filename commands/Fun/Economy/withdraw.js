const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();
const { replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Rút xu khỏi TK Ngân Hàng')
        .addIntegerOption(option => option.setName('sotien').setDescription('Số xu muốn rút').setRequired(true)),
    category: 'Economy',
    async execute(interaction) {
        const amount = interaction.options.getInteger('sotien');

        if (amount <= 0) {
            return interaction.reply({ content: lang.Economy.Messages.invalidAmount, flags: MessageFlags.Ephemeral });
        }

        const user = await EconomyUserData.findOne(
            { userId: interaction.user.id },
            { bank: 1, balance: 1 }
        );

        if (!user || user.bank < amount) {
            const embed = new EmbedBuilder()
                .setDescription(lang.Economy.Messages.noMoney)
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed] });
        }

        user.bank -= amount;
        user.balance += amount;
        await user.save();

        const embed = new EmbedBuilder()
            .setDescription(replacePlaceholders(lang.Economy.Messages.withdraw, { coins: amount }))
            .setColor('#00FF00')
            .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) });

        return interaction.reply({ embeds: [embed] });
    },
};