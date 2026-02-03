const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    channelId: query.channelId,
    userId: query.userId,
    username: '',
    correctWords: 0,
    wrongWords: 0,
    lastWord: null
});

// Table: word_chain_stats
// PK: guildId, channelId, userId
module.exports = new SQLiteModel('word_chain_stats', ['guildId', 'channelId', 'userId'], defaultData);
