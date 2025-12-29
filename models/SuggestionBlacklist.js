const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    addedAt: Date.now()
});

module.exports = new SQLiteModel('suggestion_blacklist', 'userId', defaultData);
