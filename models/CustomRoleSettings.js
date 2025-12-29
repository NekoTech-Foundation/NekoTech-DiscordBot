const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    onExpireAction: 'removeMembers',
    defaultPermissions: {
        editName: false,
        editIcon: false,
        editColor: false,
        manageMembers: false,
        mentionable: false
    }
});

module.exports = new SQLiteModel('custom_role_settings', 'guildId', defaultData);
