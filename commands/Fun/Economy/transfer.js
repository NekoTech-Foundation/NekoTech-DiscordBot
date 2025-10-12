const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../../../models/UserData');
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
        .addUserOption(option => option.setName('target').setDescription('Chọn người dùng').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Số xu muốn chuyển').setRequired(true)),
    category: 'Economy',
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        if (target.id === interaction.user.id) {
            const embed = new EmbedBuilder()
                .setDescription(lang.Economy.Messages.cannotTransferToSelf || "Hak moni,mà sao bạn lại chuyển cho chính mình?.")
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (amount <= 0) {
            const embed = new EmbedBuilder()
                .setDescription(lang.Economy.Messages.invalidTransferAmount || "Số tiền chuyển phải lớn hơn 0.")
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const user = await User.findOne(
            { userId: interaction.user.id, guildId: interaction.guild.id },
            { balance: 1, transactionLogs: 1 }
        );

        const targetUser = await User.findOne(
            { userId: target.id, guildId: interaction.guild.id },
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
            await new User({
                userId: target.id,
                guildId: interaction.guild.id,
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