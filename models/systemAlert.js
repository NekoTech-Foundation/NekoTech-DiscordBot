const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    name: query.name,
    address: query.address,
    type: 'Website',
    pterodactylId: null,
    apiKey: null,
    status: 'Pending',
    lastChecked: Date.now(),
    lastStatusChange: Date.now(),
    notificationChannel: null
});

module.exports = new SQLiteModel('system_alerts', 'name', defaultData);
