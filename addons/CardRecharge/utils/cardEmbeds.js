/**
 * Card Embeds Utilities
 * Tạo các embeds cho tính năng nạp thẻ cào
 */

const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// Load config
const configPath = path.join(__dirname, '../config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

/**
 * Tạo màu ngẫu nhiên cho embed
 */
function getRandomColor() {
    return Math.floor(Math.random() * 16777215);
}

/**
 * Thêm footer vào embed
 */
function addFooter(embed) {
    embed.setFooter({ text: 'NekoTech Card Recharge System' });
    embed.setTimestamp();
    return embed;
}

/**
 * Embed xác nhận thông tin thẻ cào
 */
function createConfirmEmbed(telco, amount, code, serial) {
    const embed = new EmbedBuilder()
        .setTitle('🔍 Xác nhận thông tin thẻ cào')
        .setDescription('Vui lòng kiểm tra kỹ thông tin trước khi xác nhận:')
        .setColor(0x3498db)
        .addFields(
            { name: '📱 Nhà mạng', value: telco.charAt(0).toUpperCase() + telco.slice(1), inline: true },
            { name: '💵 Mệnh giá', value: `${amount.toLocaleString('vi-VN')} VNĐ`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '🔢 Mã thẻ', value: `||${code}||`, inline: true },
            { name: '🔖 Serial', value: `||${serial}||`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            {
                name: '⚠️ Lưu ý',
                value: '• Vui lòng kiểm tra kỹ thông tin trước khi xác nhận\n• Nhấn **Xác nhận** để tiếp tục hoặc **Hủy** để dừng lại',
                inline: false
            }
        );

    return addFooter(embed);
}

/**
 * Embed thông báo đang xử lý thẻ cào
 */
function createProcessingEmbed(telco, amount, serial, transId) {
    const embed = new EmbedBuilder()
        .setTitle('⏳ Thẻ cào đang được xử lý')
        .setDescription('Hệ thống đã tiếp nhận yêu cầu của bạn và đang xử lý...')
        .setColor(0xf39c12)
        .addFields(
            { name: '📱 Nhà mạng', value: telco.charAt(0).toUpperCase() + telco.slice(1), inline: true },
            { name: '💵 Mệnh giá', value: `${amount.toLocaleString('vi-VN')} VNĐ`, inline: true },
            { name: '🆔 Mã giao dịch', value: `\`${transId}\``, inline: true },
            { name: '🔖 Serial', value: `||${serial}||`, inline: false }
        );

    return addFooter(embed);
}

/**
 * Embed thông báo thành công - đúng mệnh giá
 */
function createSuccessEmbed(cardHistory) {
    const embed = new EmbedBuilder()
        .setTitle('✅ Thẻ cào đã được xử lý thành công')
        .setDescription('Thẻ cào của bạn đã được xử lý thành công với đúng mệnh giá!')
        .setColor(0x2ecc71)
        .addFields(
            { name: '📱 Nhà mạng', value: cardHistory.telco.charAt(0).toUpperCase() + cardHistory.telco.slice(1), inline: true },
            { name: '💵 Mệnh giá', value: `${cardHistory.amount.toLocaleString('vi-VN')} VNĐ`, inline: true },
            { name: '🆔 Mã giao dịch', value: `\`${cardHistory.transaction_id}\``, inline: true },
            { name: '🔢 Mã thẻ', value: `||${cardHistory.code}||`, inline: true },
            { name: '🔖 Serial', value: `||${cardHistory.serial}||`, inline: true },
            { name: '💎 Mệnh giá thực tế', value: `**${cardHistory.card_value.toLocaleString('vi-VN')} VNĐ**`, inline: true },
            {
                name: '🎉 Chúc mừng',
                value: 'Thẻ cào đã được xử lý thành công với đúng mệnh giá!',
                inline: false
            }
        );

    return addFooter(embed);
}

/**
 * Embed thông báo thành công - sai mệnh giá (trừ 50%)
 */
function createWrongAmountEmbed(cardHistory) {
    const embed = new EmbedBuilder()
        .setTitle('⚠️ Thẻ cào sai mệnh giá')
        .setDescription('Thẻ cào đã được xử lý nhưng sai mệnh giá, giá trị sẽ bị trừ 50%.')
        .setColor(0xe67e22)
        .addFields(
            { name: '📱 Nhà mạng', value: cardHistory.telco.charAt(0).toUpperCase() + cardHistory.telco.slice(1), inline: true },
            { name: '💵 Mệnh giá khai báo', value: `${cardHistory.amount.toLocaleString('vi-VN')} VNĐ`, inline: true },
            { name: '🆔 Mã giao dịch', value: `\`${cardHistory.transaction_id}\``, inline: true },
            { name: '🔢 Mã thẻ', value: `||${cardHistory.code}||`, inline: true },
            { name: '🔖 Serial', value: `||${cardHistory.serial}||`, inline: true },
            { name: '💎 Mệnh giá thực tế', value: `${cardHistory.card_value.toLocaleString('vi-VN')} VNĐ`, inline: true },
            {
                name: '⚠️ Lưu ý',
                value: 'Do thẻ sai mệnh giá, giá trị đã bị trừ 50% theo quy định.',
                inline: false
            }
        );

    return addFooter(embed);
}

/**
 * Embed thông báo thất bại
 */
function createFailedEmbed(cardHistory, errorMessage = null) {
    const embed = new EmbedBuilder()
        .setTitle('❌ Thẻ cào xử lý thất bại')
        .setDescription('Rất tiếc, thẻ cào của bạn không thể được xử lý.')
        .setColor(0xe74c3c)
        .addFields(
            { name: '📱 Nhà mạng', value: cardHistory.telco.charAt(0).toUpperCase() + cardHistory.telco.slice(1), inline: true },
            { name: '💵 Mệnh giá', value: `${cardHistory.amount.toLocaleString('vi-VN')} VNĐ`, inline: true },
            { name: '🆔 Mã giao dịch', value: `\`${cardHistory.transaction_id}\``, inline: true },
            { name: '🔢 Mã thẻ', value: `||${cardHistory.code}||`, inline: true },
            { name: '🔖 Serial', value: `||${cardHistory.serial}||`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            {
                name: '❌ Lý do',
                value: errorMessage || 'Thẻ cào không hợp lệ hoặc đã được sử dụng.',
                inline: false
            }
        );

    return addFooter(embed);
}

/**
 * Embed hiển thị phí đổi thẻ
 */
function createFeeEmbed(feeData, telco = null) {
    const embed = new EmbedBuilder()
        .setColor(getRandomColor())
        .setTimestamp();

    if (telco) {
        // Hiển thị phí theo nhà mạng cụ thể
        embed.setTitle(`💰 Phí đổi thẻ - ${telco.charAt(0).toUpperCase() + telco.slice(1)}`);

        let description = '**Danh sách phí theo mệnh giá:**\n\n';

        if (feeData && feeData.fees) {
            for (const [amount, fee] of Object.entries(feeData.fees)) {
                description += `> ▫️ \`${parseInt(amount).toLocaleString('vi-VN')} VNĐ\` → **${fee}%**\n`;
            }
        }

        embed.setDescription(description);

        if (config.banner.checkfee) {
            embed.setImage(config.banner.checkfee);
        }
    } else {
        // Hiển thị tất cả nhà mạng
        embed.setTitle('💰 Phí đổi thẻ cào');

        let description = '**Danh sách phí theo nhà mạng:**\n\n';

        if (feeData) {
            for (const [telcoName, fee] of Object.entries(feeData)) {
                description += `> ▫️ **${telcoName.charAt(0).toUpperCase() + telcoName.slice(1)}**: ${fee}%\n`;
            }
        }

        embed.setDescription(description);

        if (config.banner.checkfee) {
            embed.setImage(config.banner.checkfee);
        }
    }

    embed.setFooter({ text: 'Lưu ý: Phí có thể thay đổi theo thời gian' });

    return embed;
}

/**
 * Embed hiển thị lịch sử nạp thẻ
 */
function createHistoryEmbed(historyList, page = 1, totalPages = 1, userId) {
    const embed = new EmbedBuilder()
        .setTitle('📜 Lịch sử nạp thẻ cào')
        .setColor(getRandomColor())
        .setTimestamp();

    if (!historyList || historyList.length === 0) {
        embed.setDescription('Bạn chưa có giao dịch nạp thẻ nào.');
        return embed;
    }

    let description = '';

    for (const record of historyList) {
        const statusEmoji = {
            'success': '✅',
            'failed': '❌',
            'wrong_amount': '⚠️',
            'pending': '⏳'
        }[record.status] || '❓';

        const date = new Date(record.created_at).toLocaleString('vi-VN');

        description += `${statusEmoji} **${record.telco.toUpperCase()}** - ${record.amount.toLocaleString('vi-VN')} VNĐ\n`;
        description += `   🆔 \`${record.transaction_id || 'N/A'}\` | 📅 ${date}\n\n`;
    }

    embed.setDescription(description);
    embed.setFooter({ text: `Trang ${page}/${totalPages} • User ID: ${userId}` });

    return embed;
}

module.exports = {
    createConfirmEmbed,
    createProcessingEmbed,
    createSuccessEmbed,
    createWrongAmountEmbed,
    createFailedEmbed,
    createFeeEmbed,
    createHistoryEmbed,
    getRandomColor,
    addFooter
};
