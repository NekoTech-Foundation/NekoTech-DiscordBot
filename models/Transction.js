const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    interactionId: query.interactionId,
    userId: null,
    address: null,
    qrCodeURL: null
});

module.exports = new SQLiteModel('transactions', 'interactionId', defaultData);