const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    channelId: null,
    messageId: null
});

module.exports = new SQLiteModel('server_stats', 'guildId', defaultData);
