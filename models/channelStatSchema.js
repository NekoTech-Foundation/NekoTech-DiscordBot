const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    channelId: query.channelId,
    guildId: query.guildId,
    type: null,
    channelName: null,
    roleId: null
});

module.exports = new SQLiteModel('channel_stats', 'channelId', defaultData);
