const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildID: query.guildID,
    msgID: null,
    unverifiedRoleID: null
});

module.exports = new SQLiteModel('verifications', 'guildID', defaultData);
