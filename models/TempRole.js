const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    guildId: query.guildId,
    roleId: query.roleId,
    expiration: null
});

module.exports = new SQLiteModel('temp_roles', ['userId', 'guildId', 'roleId'], defaultData);
