const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    ownerId: null,
    voiceChannelId: null,
    voiceCategoryId: null
});

module.exports = new SQLiteModel('voice_master', 'guildId', defaultData);
