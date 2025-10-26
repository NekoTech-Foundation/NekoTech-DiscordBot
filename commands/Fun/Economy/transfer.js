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
        .setName('transfer')
        .setDescription('Chuyển xu sang cho người khác')
        .addUserOption(option => option.setName('người-dùng').setDescription('Chọn người dùng').setRequired(true))
        .addIntegerOption(option => option.setName('số-tiền').setDescription('Số xu muốn chuyển').setRequired(true)),
    category: 'Economy',
    async execute(interaction) {
        const target = interaction.options.getUser('người-dùng');
        const amount = interaction.options.getInteger('số-tiền');

        if (target.id === interaction.user.id) {
            const embed = new EmbedBuilder()
                .setDescription(lang.Economy.Messages.cannotTransferToSelf || "Hak moni,99999999 send to your accountlolololololol,mà sao bạn lại chuyển cho chính mình?.")
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (amount <= 0) {
            const embed = new EmbedBuilder()
                .setDescription(lang.Economy.Messages.invalidTransferAmount || "Số tiền chuyển phải lớn hơn 0.")
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const user = await EconomyUserData.findOne(
            { userId: interaction.user.id },
            { balance: 1, transactionLogs: 1 }
        );

        const targetUser = await EconomyUserData.findOne(
            { userId: target.id },
            { balance: 1, transactionLogs: 1 }
        );

        if (!user || user.balance < amount) {
            const embed = new EmbedBuilder()
                .setDescription(lang.Economy.Messages.noMoney)
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed] });
        }

        user.balance -= amount;
        user.transactionLogs.push({
            type: 'transfer_out',
            amount: -amount,
            timestamp: new Date()
        });

        if (!targetUser) {
            await new EconomyUserData({
                userId: target.id,
                balance: amount,
                transactionLogs: [{ type: 'transfer_in', amount: amount, timestamp: new Date() }]
            }).save();
        } else {
            targetUser.balance += amount;
            targetUser.transactionLogs.push({
                type: 'transfer_in',
                amount: amount,
                timestamp: new Date()
            });
            await targetUser.save();
        }

        await user.save();

        const embed = new EmbedBuilder()
            .setDescription(replacePlaceholders(lang.Economy.Messages.transfer, { amount, target: `<@${target.id}>` }))
            .setColor('#00FF00')
            .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) });

        return interaction.reply({ embeds: [embed] });
    },
};