const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../../../models/UserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();
const { replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Economy administration commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('Gửi tiền tới người chơi chỉ định')
                .addUserOption(option => option.setName('user').setDescription('Đưa tiền cho người chơi').setRequired(true))
                .addIntegerOption(option => option.setName('amount').setDescription('The amount of money to give').setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Chỉ định đưa vào số dư, ngân hàng hay cả hai')
                        .setRequired(true)
                        .addChoices(
                            { name: 'số dư', value: 'balance' },
                            { name: 'ngân hàng', value: 'bank' },
                            { name: 'cả hai', value: 'both' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('take')
                .setDescription('Lấy tiền từ người chơi khác')
                .addUserOption(option => option.setName('user').setDescription('Chọn người muốn lấy').setRequired(true))
                .addIntegerOption(option => option.setName('amount').setDescription('Số tiền muốn lấy').setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Specify whether to take from balance, bank, or both')
                        .setRequired(true)
                        .addChoices(
                            { name: 'balance', value: 'balance' },
                            { name: 'bank', value: 'bank' },
                            { name: 'both', value: 'both' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a user\'s balance or bank')
                .addUserOption(option => option.setName('user').setDescription('The user to set the balance/bank for').setRequired(true))
                .addIntegerOption(option => option.setName('amount').setDescription('The new balance/bank amount').setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Specify whether to set balance, bank, or both')
                        .setRequired(true)
                        .addChoices(
                            { name: 'balance', value: 'balance' },
                            { name: 'bank', value: 'bank' },
                            { name: 'both', value: 'both' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all users\' economy data in the server')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Specify whether to reset balance, bank, or both')
                        .setRequired(true)
                        .addChoices(
                            { name: 'balance', value: 'balance' },
                            { name: 'bank', value: 'bank' },
                            { name: 'both', value: 'both' }
                        )
                )
        ),
    category: 'Economy',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const type = interaction.options.getString('type');
        const adminRoles = config.Economy.administrator;
        const memberRoles = interaction.member.roles.cache.map(role => role.id);

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
            !memberRoles.some(role => adminRoles.includes(role))) {
            return interaction.reply({ content: lang.Economy.Messages.noPermission, flags: MessageFlags.Ephemeral });
        }

        if (subcommand === 'reset') {
            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Economy Reset Confirmation')
                .setDescription(`Are you sure you want to reset ${type === 'both' ? 'all balances' : type} for all users in this server?\n\nThis action cannot be undone!`)
                .setColor('#FFA500');

            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_reset')
                .setLabel('Confirm Reset')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_reset')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
                .addComponents(confirmButton, cancelButton);

            const response = await interaction.reply({
                embeds: [confirmEmbed],
                components: [row],
                flags: MessageFlags.Ephemeral
            });

            try {
                const confirmation = await response.awaitMessageComponent({
                    filter: i => i.user.id === interaction.user.id,
                    time: 30000
                });

                if (confirmation.customId === 'cancel_reset') {
                    return confirmation.update({
                        content: 'Reset cancelled.',
                        embeds: [],
                        components: []
                    });
                }

                if (confirmation.customId === 'confirm_reset') {
                    await confirmation.update({
                        content: 'Processing reset...',
                        embeds: [],
                        components: []
                    });

                    const updateQuery = {};
                    if (type === 'balance' || type === 'both') {
                        updateQuery.balance = 0;
                    }
                    if (type === 'bank' || type === 'both') {
                        updateQuery.bank = 0;
                    }

                    try {
                        const result = await User.updateMany(
                            { guildId: interaction.guild.id },
                            { 
                                $set: updateQuery,
                                $push: {
                                    transactionLogs: {
                                        type: 'admin-reset',
                                        amount: 0,
                                        timestamp: new Date()
                                    }
                                }
                            }
                        );

                        const resultEmbed = new EmbedBuilder()
                            .setDescription(`Successfully reset ${type} for ${result.modifiedCount} users.`)
                            .setColor('#FF0000');

                        return confirmation.editReply({
                            content: '',
                            embeds: [resultEmbed]
                        });
                    } catch (error) {
                        console.error('Error resetting economy:', error);
                        return confirmation.editReply({
                            content: 'An error occurred while resetting the economy.',
                            embeds: []
                        });
                    }
                }
            } catch (error) {
                if (error.code === 'InteractionCollectorError') {
                    await interaction.editReply({
                        content: 'Đã hết thời gian xác nhận. Vui lòng thử lại.',
                        embeds: [],
                        components: []
                    });
                } else {
                    console.error('Error in confirmation handling:', error);
                    await interaction.editReply({
                        content: 'An error occurred while processing the confirmation.',
                        embeds: [],
                        components: []
                    });
                }
            }
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        let fields = {};
        if (type === 'balance' || type === 'both') {
            fields.balance = 1;
        }
        if (type === 'bank' || type === 'both') {
            fields.bank = 1;
        }
        fields.transactionLogs = 1;

        let user = await User.findOne({ userId: targetUser.id, guildId: interaction.guild.id }, fields);

        if (!user) {
            user = new User({ userId: targetUser.id, guildId: interaction.guild.id, balance: 0, bank: 0, commandData: {}, transactionLogs: [] });
        } else if (!Array.isArray(user.transactionLogs)) {
            user.transactionLogs = [];
        }

        let placeholders = {
            user: `<@${targetUser.id}>`,
            amount: amount,
            balance: user.balance || 0,
            bank: user.bank || 0,
            type: type
        };

        if (subcommand === 'give') {
            if (type === 'balance' || type === 'both') {
                user.balance += amount;
                user.transactionLogs.push({
                    type: 'admin-give-balance',
                    amount: amount,
                    timestamp: new Date()
                });
                placeholders.balance = user.balance;
            }
            if (type === 'bank' || type === 'both') {
                user.bank += amount;
                user.transactionLogs.push({
                    type: 'admin-give-bank',
                    amount: amount,
                    timestamp: new Date()
                });
                placeholders.bank = user.bank;
            }

            const embed = new EmbedBuilder()
                .setDescription(replacePlaceholders(lang.Economy.Messages.adminGive, placeholders))
                .setColor('#00FF00');

            await user.save();
            return interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'take') {
            if (type === 'balance' || type === 'both') {
                if (user.balance < amount) {
                    return interaction.reply({ content: lang.Economy.Messages.insufficientFunds, flags: MessageFlags.Ephemeral });
                }
                user.balance -= amount;
                user.transactionLogs.push({
                    type: 'admin-take-balance',
                    amount: -amount,
                    timestamp: new Date()
                });
                placeholders.balance = user.balance;
            }
            if (type === 'bank' || type === 'both') {
                if (user.bank < amount) {
                    return interaction.reply({ content: lang.Economy.Messages.insufficientFunds, flags: MessageFlags.Ephemeral });
                }
                user.bank -= amount;
                user.transactionLogs.push({
                    type: 'admin-take-bank',
                    amount: -amount,
                    timestamp: new Date()
                });
                placeholders.bank = user.bank;
            }

            const embed = new EmbedBuilder()
                .setDescription(replacePlaceholders(lang.Economy.Messages.adminTake, placeholders))
                .setColor('#FF0000');

            await user.save();
            return interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'set') {
            if (type === 'balance' || type === 'both') {
                user.balance = amount;
                user.transactionLogs.push({
                    type: 'admin-set-balance',
                    amount: amount,
                    timestamp: new Date()
                });
                placeholders.balance = user.balance;
            }
            if (type === 'bank' || type === 'both') {
                user.bank = amount;
                user.transactionLogs.push({
                    type: 'admin-set-bank',
                    amount: amount,
                    timestamp: new Date()
                });
                placeholders.bank = user.bank;
            }

            const embed = new EmbedBuilder()
                .setDescription(replacePlaceholders(lang.Economy.Messages.adminSet, placeholders))
                .setColor('#0000FF');

            await user.save();
            return interaction.reply({ embeds: [embed] });
        }
    }
};