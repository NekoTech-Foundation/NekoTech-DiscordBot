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
        .setName('deposit')
        .setDescription('Gửi Xu vào ngân hàng')
        .addIntegerOption(option => option.setName('sotien').setDescription('Số lượng bạn muốn gửi').setRequired(true)),
    category: 'Economy',
    async execute(interaction) {
        try {
            const amount = interaction.options.getInteger('sotien');

            const user = await EconomyUserData.findOne(
                { userId: interaction.user.id },
                { balance: 1, bank: 1, transactionLogs: 1 }
            );

            if (amount <= 0) {
                const embed = new EmbedBuilder()
                    .setDescription(lang.Economy.Messages.betAmountError || "Số tiền gửi phải lớn hơn 0.")
                    .setColor('#FF0000');
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            if (!user || user.balance < amount) {
                const embed = new EmbedBuilder()
                    .setDescription(lang.Economy.Messages.noMoney || "Có đủ tiền đâu mà gửi??.")
                    .setColor('#FF0000');
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            user.balance -= amount;
            user.bank += amount;

            user.transactionLogs.push({
                type: 'deposit',
                amount: amount,
                timestamp: new Date()
            });

            await user.save();

            const placeholders = {
                user: `<@${interaction.user.id}>`,
                balance: amount,
                bankBalance: user.bank
            };

            const description = replacePlaceholders(lang.Economy.Messages.deposit, placeholders);
            const footer = replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance });

            const embed = new EmbedBuilder()
                .setDescription(description)
                .setFooter({ text: footer })
                .setColor('#00FF00');

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Error in deposit command: ", error);
            interaction.reply({ content: lang.Economy.Messages.error, flags: MessageFlags.Ephemeral });
        }
    },
};