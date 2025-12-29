const SQLiteModel = require('../../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    enabled: true,
    notificationChannel: null,
    tickets: [],
    drawHistory: []
});

module.exports = new SQLiteModel('veso', 'guildId', defaultData);
