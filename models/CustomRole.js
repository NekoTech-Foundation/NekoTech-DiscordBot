const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    roleId: query.roleId,
    guildId: query.guildId,
    authorId: query.authorId,
    maxUsers: 1,
    expiresAt: null,
    permissions: {
        editName: false,
        editIcon: false,
        editColor: false,
        manageMembers: false,
        mentionable: false
    }
});

module.exports = new SQLiteModel('custom_roles', 'roleId', defaultData);
