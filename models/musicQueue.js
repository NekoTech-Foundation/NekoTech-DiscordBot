const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    nowPlayingMessageId: null,
    nowPlayingChannelId: null,
    currentTrack: null,
    queue: [],
    volume: 80,
    repeatMode: 0,
    voiceChannelId: null,
    textChannelId: null,
    isPaused: false,
    updatedAt: Date.now()
});

module.exports = new SQLiteModel('music_queues', 'guildId', defaultData);
