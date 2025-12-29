const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    name: query.name,
    value: 0
});

module.exports = new SQLiteModel('sequences', 'name', defaultData);
