const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    channelId: query.channelId,
    content: '', // Message content
    mode: 'ChatInactive', // Enum: 'ChatInactive', 'MessageThreshold'
    delay: 15, // Seconds
    threshold: 50, // Message count
    currentCount: 0,
    lastMessageId: null,
    lastActivity: Date.now(), // Storing as number (timestamp) is usually better for SQLite
    useWebhook: false,
    webhookUrl: null,
    allowMentions: false
});

module.exports = new SQLiteModel('sticky_messages', ['guildId', 'channelId'], defaultData);
