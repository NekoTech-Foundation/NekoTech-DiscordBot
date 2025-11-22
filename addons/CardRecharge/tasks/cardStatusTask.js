/**
 * Card Status Background Task
 * Kiểm tra trạng thái thẻ cào định kỳ
 */

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const Card2kService = require('../services/card2kService');
const { createSuccessEmbed, createWrongAmountEmbed, createFailedEmbed } = require('../utils/cardEmbeds');

// Load config
const configPath = path.join(__dirname, '../config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

let taskInterval = null;
let clientInstance = null;

/**
 * Khởi tạo background task
 */
function startTask(client) {
    if (config.card_status_check.type !== 'api') {
        console.log('[CardStatusTask] Chế độ callback được sử dụng, bỏ qua API polling');
        return;
    }

    clientInstance = client;

    const delayTime = Math.max(config.card_status_check.delay_time || 30, 30) * 1000;

    console.log(`[CardStatusTask] Khởi động task kiểm tra thẻ cào mỗi ${delayTime / 1000} giây`);

    // Chạy lần đầu sau 10 giây
    setTimeout(() => {
        checkPendingCards();

        // Sau đó chạy định kỳ
        taskInterval = setInterval(() => {
            checkPendingCards();
        }, delayTime);
    }, 10000);
}

/**
 * Dừng background task
 */
function stopTask() {
    if (taskInterval) {
        clearInterval(taskInterval);
        taskInterval = null;
        console.log('[CardStatusTask] Đã dừng task kiểm tra thẻ cào');
    }
}

/**
 * Kiểm tra các thẻ đang pending
 */
async function checkPendingCards() {
    if (!clientInstance) {
        console.error('[CardStatusTask] Client chưa được khởi tạo');
        return;
    }

    try {
        const CardRechargeHistory = require('../../../models/cardRechargeHistorySchema');
        const card2kService = new Card2kService();

        // Lấy danh sách thẻ pending
        const pendingCards = await CardRechargeHistory.find({ status: 'pending' });

        if (pendingCards.length === 0) {
            console.log('[CardStatusTask] Không có thẻ đang chờ xử lý');
            return;
        }

        console.log(`[CardStatusTask] Phát hiện ${pendingCards.length} thẻ đang chờ xử lý`);

        for (const card of pendingCards) {
            await processCard(card, card2kService);
        }
    } catch (error) {
        console.error('[CardStatusTask] Lỗi khi kiểm tra thẻ:', error);
    }
}

/**
 * Xử lý từng thẻ cào
 */
async function processCard(card, card2kService) {
    try {
        console.log(`[CardStatusTask] Kiểm tra thẻ #${card.transaction_id}`);

        const data = {
            telco: card.telco,
            amount: card.amount,
            code: card.code,
            serial: card.serial,
            request_id: card.request_id
        };

        const response = await card2kService.checkCardStatus(data);

        if (!response) {
            console.error(`[CardStatusTask] API lỗi cho thẻ #${card.transaction_id}`);
            return;
        }

        // Status 99: Đang xử lý
        if (response.status === 99) {
            console.log(`[CardStatusTask] Thẻ #${card.transaction_id} đang xử lý`);
            return;
        }

        // Status 4: Bảo trì
        if (response.status === 4) {
            console.log(`[CardStatusTask] Hệ thống bảo trì cho thẻ #${card.transaction_id}`);
            return;
        }

        // Status 1: Thành công - đúng mệnh giá
        if (response.status === 1) {
            console.log(`[CardStatusTask] Thẻ #${card.transaction_id} thành công - đúng mệnh giá`);
            await updateCardStatus(card, 'success', response.declared_value || card.amount);
            return;
        }

        // Status 2: Thành công - sai mệnh giá
        if (response.status === 2) {
            console.log(`[CardStatusTask] Thẻ #${card.transaction_id} thành công - sai mệnh giá`);
            await updateCardStatus(card, 'wrong_amount', response.declared_value || card.amount);
            return;
        }

        // Các status khác: Thất bại
        console.error(`[CardStatusTask] Thẻ #${card.transaction_id} thất bại: ${response.message}`);
        await updateCardStatus(card, 'failed', 0, response.message);

    } catch (error) {
        console.error(`[CardStatusTask] Lỗi khi xử lý thẻ #${card.transaction_id}:`, error);
    }
}

/**
 * Cập nhật trạng thái thẻ trong database và Discord
 */
async function updateCardStatus(card, status, cardValue = 0, errorMessage = null) {
    try {
        // Cập nhật database MongoDB
        card.status = status;
        card.card_value = cardValue;
        card.error_message = errorMessage;
        card.updated_at = new Date();
        await card.save();

        console.log(`[CardStatusTask] Đã cập nhật database cho thẻ #${card.transaction_id}: ${status}`);

        // Cập nhật Discord message
        await updateDiscordMessage(card, status, cardValue, errorMessage);

        // Gửi notification
        await sendNotification(card, status, cardValue, errorMessage);

    } catch (error) {
        console.error(`[CardStatusTask] Lỗi khi cập nhật trạng thái:`, error);
    }
}

/**
 * Cập nhật Discord message
 */
async function updateDiscordMessage(card, status, cardValue, errorMessage) {
    try {
        const channel = await clientInstance.channels.fetch(card.channel_id);
        if (!channel) {
            console.error(`[CardStatusTask] Không tìm thấy channel ${card.channel_id}`);
            return;
        }

        const message = await channel.messages.fetch(card.message_id);
        if (!message) {
            console.error(`[CardStatusTask] Không tìm thấy message ${card.message_id}`);
            return;
        }

        const cardHistory = {
            telco: card.telco,
            amount: card.amount,
            code: card.code,
            serial: card.serial,
            transaction_id: card.transaction_id,
            card_value: cardValue
        };

        let embed;
        if (status === 'success') {
            embed = createSuccessEmbed(cardHistory);
        } else if (status === 'wrong_amount') {
            embed = createWrongAmountEmbed(cardHistory);
        } else if (status === 'failed') {
            embed = createFailedEmbed(cardHistory, errorMessage);
        }

        if (embed) {
            await message.edit({ embeds: [embed] });
            console.log(`[CardStatusTask] Đã cập nhật Discord message cho thẻ #${card.transaction_id}`);
        }

    } catch (error) {
        console.error(`[CardStatusTask] Lỗi khi cập nhật Discord message:`, error);
    }
}

/**
 * Gửi notification đến kênh cấu hình
 */
async function sendNotification(card, status, cardValue, errorMessage) {
    try {
        const notificationChannelId = config.notifications?.topup?.channel_id;
        if (!notificationChannelId) {
            return;
        }

        const channel = await clientInstance.channels.fetch(notificationChannelId);
        if (!channel) {
            console.error(`[CardStatusTask] Không tìm thấy notification channel ${notificationChannelId}`);
            return;
        }

        const cardHistory = {
            telco: card.telco,
            amount: card.amount,
            code: card.code,
            serial: card.serial,
            transaction_id: card.transaction_id,
            card_value: cardValue
        };

        let embed;
        if (status === 'success') {
            embed = createSuccessEmbed(cardHistory);
        } else if (status === 'wrong_amount') {
            embed = createWrongAmountEmbed(cardHistory);
        } else if (status === 'failed') {
            embed = createFailedEmbed(cardHistory, errorMessage);
        }

        if (embed) {
            const roleId = config.notifications?.topup?.role_id;
            const content = roleId
                ? `<@&${roleId}> - Người gửi: <@${card.user_id}>`
                : `Người gửi: <@${card.user_id}>`;

            await channel.send({ content, embeds: [embed] });
            console.log(`[CardStatusTask] Đã gửi notification cho thẻ #${card.transaction_id}`);
        }

    } catch (error) {
        console.error(`[CardStatusTask] Lỗi khi gửi notification:`, error);
    }
}

module.exports = {
    startTask,
    stopTask
};
