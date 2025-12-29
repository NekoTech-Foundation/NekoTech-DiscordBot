const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    channelName: null,
    channelLimit: 0
});

module.exports = new SQLiteModel('voice_master_user_settings', 'userId', defaultData);
