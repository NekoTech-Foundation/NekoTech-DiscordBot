const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    panelName: query.panelName,
    channelID: null,
    messageID: null
});

module.exports = new SQLiteModel('reaction_roles', 'panelName', defaultData);