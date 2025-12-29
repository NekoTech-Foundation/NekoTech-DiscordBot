const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    memberid: query.memberid,
    name: query.name
});

module.exports = new SQLiteModel('inventories', ['memberid', 'name'], defaultData);
