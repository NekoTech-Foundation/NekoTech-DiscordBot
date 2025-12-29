const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    request_id: query.request_id,
    user_id: null,
    telco: null,
    amount: 0,
    code: null,
    serial: null,
    card_value: 0,
    message_id: null,
    channel_id: null,
    transaction_id: null,
    status: 'pending',
    error_message: null,
    created_at: Date.now(),
    updated_at: Date.now()
});

const model = new SQLiteModel('card_recharge_history', 'request_id', defaultData);

// Hook wrapper for save to update updated_at?
// SQLiteModel doesn't support pre-save hooks directly but we can override save if needed.
// For now, simpler is better.

module.exports = model;
