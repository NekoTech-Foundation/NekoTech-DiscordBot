const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    logChannels: {},
    prefix: 'k',
    language: 'vn',
    welcome: {
        enabled: false,
        channelId: null,
        message: 'Welcome {user} to {guildName}!'
    },
    leave: {
        enabled: false,
        channelId: null,
        message: '{user} has left the server.'
    },
    tickets: {
        panels: [],
        categories: []
    }
});

module.exports = new SQLiteModel('guild_settings', 'guildId', defaultData);
