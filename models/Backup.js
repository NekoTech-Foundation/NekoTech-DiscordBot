const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    backupId: query.backupId,
    guildId: null,
    data: {},
    createdAt: null
});

module.exports = new SQLiteModel('backups', 'backupId', defaultData);
