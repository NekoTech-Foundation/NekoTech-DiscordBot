const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    memberid: query.memberid
});

module.exports = new SQLiteModel('bans', 'memberid', defaultData);
