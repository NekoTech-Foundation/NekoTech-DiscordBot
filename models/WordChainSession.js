const SQLiteModel = require('../utils/sqliteModel');

// Default data structure for a game session
const defaultData = (query) => ({
    guildId: query.guildId,
    channelId: query.channelId,
    currentWord: null,
    lastLetter: null,
    lastUserId: null,
    lastUsername: null,
    usedWords: [], // Array of strings (converted to JSON by SQLiteModel logic if handled correctly, but let's see how SQLiteModel handles arrays)
    // SQLiteModel stores `data` as a JSON string. So arrays inside the object are fine.
    totalWords: 0,
    startedAt: Date.now()
});

// Table: word_chain_sessions
// PK: guildId, channelId
module.exports = new SQLiteModel('word_chain_sessions', ['guildId', 'channelId'], defaultData);
