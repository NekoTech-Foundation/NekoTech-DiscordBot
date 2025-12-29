const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    botId: query.botId || 'global_settings',
    activities: [],
    lastActivityIndex: 0
});

module.exports = new SQLiteModel('bot_activity', 'botId', defaultData);
