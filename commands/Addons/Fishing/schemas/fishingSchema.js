const SQLiteModel = require('../../../../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    equippedRod: null,
    equippedBait: null,
    equippedFish: null,
    rods: [],
    inventory: [],
    baits: []
});

module.exports = new SQLiteModel('fishing_user', 'userId', defaultData);
