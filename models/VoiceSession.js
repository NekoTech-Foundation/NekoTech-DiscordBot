const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    guildId: query.guildId,
    channelId: query.channelId,
    startTime: Date.now(),
    endTime: null,
    duration: 0,
    date: new Date().toISOString().split('T')[0] // YYYY-MM-DD for easier querying by day
});

// We need a way to store multiple entries, so the primary key can't just be userId/guildId.
// SQLiteModel typically assumes unique keys. If it doesn't support auto-increment IDs easily,
// we might need to adjust. However, looking at SQLiteModel usage, it seems to be a wrapper around `better-sqlite3` or similar.
// If it enforces uniqueness on the keys provided in constructor, we might have an issue if we want multiple sessions.
// Let's check `sqliteModel.js` to see how it handles keys.
// If it's a key-value store wrapper, we might need a different approach or use a composite key (userId + startTime).

module.exports = new SQLiteModel('voice_sessions', ['userId', 'guildId', 'startTime'], defaultData);
