const SQLiteModel = require('../../../../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    items: [],
    storeCycleId: 0,
    seedPurchases: {}
});

module.exports = new SQLiteModel('farming_farm', 'userId', defaultData);
