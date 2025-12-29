const SQLiteModel = require('../../../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    balance: 0
});

module.exports = new SQLiteModel('farming_bank', 'userId', defaultData);