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
    language: 'vn',
    safety: {
        antinuke: {
            enabled: false,
            whitelistedUsers: [],
            whitelistedRoles: [],
            limits: {
                ban: { threshold: 3, period: 60000 },
                kick: { threshold: 3, period: 60000 },
                channelDelete: { threshold: 2, period: 60000 },
                roleDelete: { threshold: 2, period: 60000 }
            },
            actions: {
                ban: 'ban',
                kick: 'ban',
                channelDelete: 'ban',
                roleDelete: 'ban'
            }
        },
        antihoist: {
            enabled: false,
            disallowedChars: ['!', '"', '#', '$', '%', '&', '\'', '(', ')', '*', '+', ',', '-', '.', '/', ':', ';', '<', '=', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|', '}', '~'],
            action: 'nickname'
        },
        disabledCommands: []
    }
});

module.exports = new SQLiteModel('guilds', 'guildID', defaultData);
