const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    enabled: 0,
    autoReceive: 1,
    channels: [],
    announcementChannelId: null,
    receivers: [],
    receiverRoles: [],
    notificationThreshold: 0,
    message: null,
    rewards: [],
    embed: {
        enabled: false,
        title: null,
        description: null,
        color: '#FF0000', // Default Red
        image: null,
        thumbnail: null,
        footer: null,
        timestamp: false
    }
});

module.exports = new SQLiteModel('donation_settings', 'guildId', defaultData);
