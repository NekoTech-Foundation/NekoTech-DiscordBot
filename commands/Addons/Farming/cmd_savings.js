const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const bankSchema = require('./schemas/bankSchema');
const { getConfig } = require('../../../utils/configLoader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('savings')
        .setDescription('💰 Ngân hàng tiết kiệm')
        .addSubcommand(subcommand =>
            subcommand
                .setName('deposit')
                .setDescription('📥 Gửi tiền vào tài khoản tiết kiệm')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('💵 Số tiền muốn gửi')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('💳 Xem số dư tiết kiệm')),
    async execute(interaction, client) {
        const config = getConfig();
        const currency = config.Currency || '💰';
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (subcommand === 'deposit') {
            const amount = interaction.options.getInteger('amount');

            if (amount <= 0) {
                return interaction.reply({ content: 'Số tiền gửi phải là số dương.', ephemeral: true });
            }

            let economyData = await EconomyUserData.findOne({ userId });
            if (!economyData || economyData.balance < amount) {
                return interaction.reply({ content: 'Bạn không đủ tiền để gửi.', ephemeral: true });
            }

            economyData.balance -= amount;
            await economyData.save();

            let savingsData = await bankSchema.findOne({ userId });
            if (!savingsData) {
                savingsData = await bankSchema.create({ userId, balance: 0 });
            }
            savingsData.balance += amount;
            await savingsData.save();

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Gửi Tiết Kiệm Thành Công')
                .setDescription(`Bạn đã gửi thành công **${amount.toLocaleString()} ${currency}** vào tài khoản tiết kiệm của mình.`)
                .addFields({ name: 'Số dư tiết kiệm mới', value: `${savingsData.balance.toLocaleString()} ${currency}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'balance') {
            let savingsData = await bankSchema.findOne({ userId });
            const balance = savingsData ? savingsData.balance : 0;

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Số Dư Tài Khoản Tiết Kiệm')
                .setDescription(`Số dư tiết kiệm của bạn là: **${balance.toLocaleString()} ${currency}**`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
};
