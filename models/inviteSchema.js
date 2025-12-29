const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    inviteCode: query.inviteCode,
    guildID: null,
    inviterID: null,
    joinedUsers: [],
    uses: 0
});

module.exports = new SQLiteModel('invites', 'inviteCode', defaultData);