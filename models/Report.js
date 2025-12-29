const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    reportId: query.reportId,
    guildId: query.guildId,
    reporterId: null,
    reportedUserId: null,
    messageId: null,
    channelId: null,
    reason: null,
    status: 'pending',
    createdAt: Date.now()
});

module.exports = new SQLiteModel('reports', ['guildId', 'reportId'], defaultData);
