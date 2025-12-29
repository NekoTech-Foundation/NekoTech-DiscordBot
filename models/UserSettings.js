const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    ticketPreferences: {
        statusOrder: [
            { status: 'open', order: 1 },
            { status: 'closed', order: 2 },
            { status: 'deleted', order: 3 }
        ]
    },
    theme: 'dark',
    notifications: {
        ticketUpdates: true,
        mentions: true,
        email: false
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
});

module.exports = new SQLiteModel('user_settings', 'userId', defaultData);
