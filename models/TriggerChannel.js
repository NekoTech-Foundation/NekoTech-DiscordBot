const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    triggerChannelId: query.triggerChannelId,
    namePattern: null,
    categoryId: null
});

module.exports = new SQLiteModel('trigger_channels', 'triggerChannelId', defaultData);