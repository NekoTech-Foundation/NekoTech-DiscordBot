const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildID: query.guildID,
    cases: 0,
    totalMessages: 0,
    stars: {},
    totalSuggestions: 0,
    timesBotStarted: 0,
    members: [],
    timeoutRoleId: null,
    language: 'vn'
});

module.exports = new SQLiteModel('guilds', 'guildID', defaultData);
