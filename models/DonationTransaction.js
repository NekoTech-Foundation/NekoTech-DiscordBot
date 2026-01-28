const SQLiteModel = require('../utils/sqliteModel');
const { v4: uuidv4 } = require('uuid');

const defaultData = (query) => ({
    id: query.id || uuidv4(),
    guildId: query.guildId,
    userId: query.userId,
    receiverId: query.receiverId,
    amount: query.amount || 0,
    currency: query.currency || 'Manual',
    timestamp: query.timestamp || Date.now(),
    reason: query.reason || null
});

module.exports = new SQLiteModel('donation_transactions', 'id', defaultData);
