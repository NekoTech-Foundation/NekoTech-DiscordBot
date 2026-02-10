const SQLiteModel = require('../../../../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    equippedRod: null,
    equippedBait: null,
    equippedFish: null,
    rods: [],
    inventory: [],
    baits: [],
    nets: [],
    equippedNet: null,
    netSession: null,
    traps: [],
    activeTraps: []
});

module.exports = new SQLiteModel('fishing_user', 'userId', defaultData);
