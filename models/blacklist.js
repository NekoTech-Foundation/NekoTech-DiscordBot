const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    addedBy: null,
    addedAt: Date.now(),
    reason: 'No reason provided'
});

module.exports = new SQLiteModel('blacklist', 'userId', defaultData);