const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    channelId: null,
    responses: [],
    decisionTimestamp: null,
    status: 'Open',
    createdAt: Date.now()
});

module.exports = new SQLiteModel('applications', 'userId', defaultData);
