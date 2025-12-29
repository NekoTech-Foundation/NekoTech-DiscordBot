const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    alertType: query.alertType,
    serverName: query.serverName,
    version: null,
    status: null,
    lastChecked: Date.now(),
    webhookUrl: null
});

module.exports = new SQLiteModel('alerts', ['serverName', 'alertType'], defaultData);
