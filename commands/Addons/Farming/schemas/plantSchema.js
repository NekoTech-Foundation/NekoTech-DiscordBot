const SQLiteModel = require('../../../../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    plant: query.plant,
    plantedAt: Date.now(),
    quantity: 1,
    fertilizers: [],
    event: null,
    mutation: null,
    lastEventCheck: Date.now()
});

module.exports = new SQLiteModel('farming_plants', ['userId', 'plant'], defaultData);
