const SQLiteModel = require('../../../../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    items: []
});

module.exports = new SQLiteModel('farming_farm', 'userId', defaultData);
