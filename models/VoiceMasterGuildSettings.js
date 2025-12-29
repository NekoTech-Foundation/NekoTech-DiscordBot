const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    channelLimit: 0
});

module.exports = new SQLiteModel('voice_master_guild_settings', 'guildId', defaultData);
