const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    voiceId: query.voiceId,
    userId: null,
    createdAt: Date.now(),
    textChannelId: null
});

module.exports = new SQLiteModel('voice_master_channels', 'voiceId', defaultData);
