const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    logChannels: {}, // Legacy
    prefix: 'k',
    language: 'vn',
    welcome: {
        enabled: false,
        channelId: null,
        message: 'Welcome {user} to {guildName}!',
        embed: {
            title: '',
            description: 'Welcome {user} to {guildName}!',
            color: '#00ff00',
            image: '',
            thumbnail: '',
            footer: ''
        },
        useEmbed: false
    },
    leave: {
        enabled: false,
        channelId: null,
        message: '{user} has left the server.',
        embed: {
            title: '',
            description: '{user} has left the server.',
            color: '#ff0000',
            image: '',
            thumbnail: '',
            footer: ''
        },
        useEmbed: false
    },
    moderation: {
        logChannels: {
            ban: null,
            kick: null,
            timeout: null,
            voice: null,
            message: null
        },
        ignoredChannels: [],
        ignoredRoles: []
    },
    tickets: {
        panels: [],
        categories: []
    },
    autoresponder: [], // { trigger: '', response: '', matchMode: 'exact'|'contains' }
    leveling: {
        enabled: true,
        levelUpChannelId: null,
        notificationMode: 'current'
    }
});

const model = new SQLiteModel('guild_settings', 'guildId', defaultData);
model.createInstance = (db) => new SQLiteModel('guild_settings', 'guildId', defaultData, db);
module.exports = model;
