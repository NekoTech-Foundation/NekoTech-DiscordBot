const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const { getConfig, getLang } = require('../../../utils/configLoader.js');
const lang = getLang();
const { replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Quản lý ngân hàng')
        .addSubcommand(sub => 
            sub.setName('deposit')
                .setDescription('Gửi Xu vào ngân hàng')
                .addIntegerOption(opt => opt.setName('amount').setDescription('Số lượng').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('withdraw')
                .setDescription('Rút Xu khỏi ngân hàng')
                .addIntegerOption(opt => opt.setName('amount').setDescription('Số lượng').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('transfer')
                .setDescription('Chuyển khoản cho người khác')
                .addUserOption(opt => opt.setName('user').setDescription('Người nhận').setRequired(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Số lượng').setRequired(true))
        ),
    category: 'Economy',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const amount = interaction.options.getInteger('amount');
        
        if (amount <= 0) return interaction.reply({ content: 'Số tiền phải lớn hơn 0', flags: MessageFlags.Ephemeral });

        let user = await EconomyUserData.findOne({ userId: interaction.user.id });
        if (!user) user = await EconomyUserData.create({ userId: interaction.user.id, balance: 0, bank: 0, transactionLogs: [] });
        
        if (subcommand === 'deposit') {
            if (user.balance < amount) return interaction.reply({ content: 'Không đủ tiền mặt!', flags: MessageFlags.Ephemeral });
            
            user.balance -= amount;
            user.bank += amount;
            user.transactionLogs.push({ type: 'deposit', amount, timestamp: new Date() });
            await user.save();
            
            const embed = new EmbedBuilder()
                .setDescription(`✅ Đã gửi **${amount}** xu vào ngân hàng.\nSố dư ví: ${user.balance}\nSố dư bank: ${user.bank}`)
                .setColor('#00FF00');
            interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'withdraw') {
            if (user.bank < amount) return interaction.reply({ content: 'Không đủ tiền trong ngân hàng!', flags: MessageFlags.Ephemeral });
            
            user.bank -= amount;
            user.balance += amount;
            // No log for withdraw usually? Or maybe yes.
            // Original code didn't have specific log for withdraw in view_file 2521?
            // Actually view_file 2521 didn't show pushing to transactionLogs.
            await user.save();
            
            const embed = new EmbedBuilder()
                .setDescription(`✅ Đã rút **${amount}** xu về ví.\nSố dư ví: ${user.balance}\nSố dư bank: ${user.bank}`)
                .setColor('#00FF00');
            interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'transfer') {
            const target = interaction.options.getUser('user');
            if (target.id === interaction.user.id) return interaction.reply({ content: 'Không thể chuyển cho chính mình', flags: MessageFlags.Ephemeral });
            
            if (user.balance < amount) return interaction.reply({ content: 'Không đủ tiền mặt để chuyển!', flags: MessageFlags.Ephemeral });
            
            let targetUser = await EconomyUserData.findOne({ userId: target.id });
            if (!targetUser) targetUser = await EconomyUserData.create({ userId: target.id, balance: 0, bank: 0, transactionLogs: [] });
            
            user.balance -= amount;
            user.transactionLogs.push({ type: 'transfer_out', amount: -amount, timestamp: new Date() });
            
            targetUser.balance += amount;
            targetUser.transactionLogs.push({ type: 'transfer_in', amount, timestamp: new Date() });
            
            await user.save();
            await targetUser.save();
            
            const embed = new EmbedBuilder()
                .setDescription(`✅ Đã chuyển **${amount}** xu cho ${target}.\nSố dư còn lại: ${user.balance}`)
                .setColor('#00FF00');
            interaction.reply({ embeds: [embed] });
        }
    }
};
