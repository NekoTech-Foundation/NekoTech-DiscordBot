const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    reminderId: query.reminderId || Date.now().toString(36) + Math.random().toString(36).substr(2),
    userId: query.userId,
    channelId: null,
    message: null,
    reminderTime: null,
    sent: false
});

module.exports = new SQLiteModel('reminders', 'reminderId', defaultData);
