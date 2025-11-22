/**
 * CardRecharge History Schema
 * Lưu lịch sử giao dịch nạp thẻ cào
 */

const mongoose = require('mongoose');

const cardRechargeHistorySchema = new mongoose.Schema({
    // Thông tin người dùng
    user_id: {
        type: String,
        required: true,
        index: true
    },

    // Thông tin thẻ
    telco: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    serial: {
        type: String,
        required: true
    },
    card_value: {
        type: Number,
        default: 0
    },

    // Thông tin Discord
    message_id: {
        type: String,
        required: true
    },
    channel_id: {
        type: String
    },

    // Thông tin giao dịch với API
    request_id: {
        type: String,
        required: true,
        unique: true
    },
    transaction_id: {
        type: String
    },

    // Trạng thái
    status: {
        type: String,
        enum: ['pending', 'success', 'wrong_amount', 'failed'],
        default: 'pending',
        index: true
    },
    error_message: {
        type: String
    },

    // Timestamps
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// Update updated_at on save
cardRechargeHistorySchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('CardRechargeHistory', cardRechargeHistorySchema);
