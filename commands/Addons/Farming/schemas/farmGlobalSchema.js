const SQLiteModel = require('../../../../utils/sqliteModel');

const defaultData = (query) => ({
    identifier: query.identifier || 'global',
    currentWeather: null,
    weatherStartTime: Date.now(),
    weatherEndTime: Date.now() + 3600000,
    activeMutationRate: 0,
    storeNextRestock: 0,
    currentStockLimits: {}
});

module.exports = new SQLiteModel('farming_global', 'identifier', defaultData);
