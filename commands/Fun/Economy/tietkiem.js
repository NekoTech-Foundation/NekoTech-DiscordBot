const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tietkiem')
        .setDescription('Gửi tiền từ ví vào tài khoản tiết kiệm của bạn.')
        .addStringOption(option =>
            option.setName('sotien')
                .setDescription('Số tiền bạn muốn gửi (hoặc "all" để gửi tất cả).')
                .setRequired(true)),
    category: 'Economy',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const amountString = interaction.options.getString('sotien');
        const userId = interaction.user.id;

        let userData = await EconomyUserData.findOne({ userId });

        if (!userData || userData.balance <= 0) {
            return interaction.editReply({ content: 'Bạn không có tiền trong ví để gửi tiết kiệm.' });
        }

        let amountToDeposit;

        if (amountString.toLowerCase() === 'all') {
            amountToDeposit = userData.balance;
        } else {
            amountToDeposit = parseInt(amountString, 10);
        }

        if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
            return interaction.editReply({ content: 'Số tiền không hợp lệ. Vui lòng nhập một số lớn hơn 0 hoặc "all".' });
        }

        if (amountToDeposit > userData.balance) {
            return interaction.editReply({ content: 'Bạn không có đủ tiền trong ví để thực hiện giao dịch này.' });
        }

        const bonusPercentage = Math.random() * (0.045 - 0.025) + 0.025;
        const bonusAmount = Math.floor(amountToDeposit * bonusPercentage);
        const totalDeposit = amountToDeposit + bonusAmount;

        // Perform atomic update
        const updatedUserData = await EconomyUserData.findOneAndUpdate(
            { userId },
            {
                $inc: {
                    balance: -amountToDeposit,
                    bank: totalDeposit
                },
                $push: {
                    transactionLogs: {
                        $each: [{
                            type: 'deposit',
                            amount: totalDeposit,
                            timestamp: new Date(),
                        }],
                        $slice: -100 // Keep the last 100 logs
                    }
                }
            },
            { new: true, upsert: true }
        );

        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Giao Dịch Tiết Kiệm Thành Công')
            .setDescription(`✅ **|** **${interaction.user.username}**, bạn đã gửi tiết kiệm thành công.`)
            .addFields(
                { name: 'Số Tiền Đã Gửi', value: `**${amountToDeposit.toLocaleString('en-US')}** 🪙` },
                { name: 'Tiền Thưởng', value: `**${bonusAmount.toLocaleString('en-US')}** 🪙 (${(bonusPercentage * 100).toFixed(2)}%)` },
                { name: 'Tổng Cộng', value: `**${totalDeposit.toLocaleString('en-US')}** 🪙` },
                { name: 'Số Dư Ngân Hàng Hiện Tại', value: `**${updatedUserData.bank.toLocaleString('en-US')}** 🪙` }
            )
            .setTimestamp();

        try {
            await interaction.user.send({ embeds: [successEmbed] });
            await interaction.editReply({ content: 'Giao dịch thành công! Đã gửi chi tiết vào tin nhắn riêng của bạn.' });
        } catch (error) {
            console.error(`Could not send DM to ${interaction.user.tag}.`, error);
            await interaction.editReply({ content: 'Giao dịch thành công!', embeds: [successEmbed] });
        }
    }
};
