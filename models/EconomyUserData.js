const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    balance: 0,
    bank: 0,
    carrots: 0,
    fishingXp: 0,
    fishingLevel: 1,
    inventory: [],
    boosters: [],
    commandData: {
        lastDaily: null, dailyStreak: 0, lastBeg: null, lastWork: null,
        lastCrime: null, lastBlackjack: null, lastSlot: null, lastRob: null, lastFishing: null
    },
    interestRate: null,
    purchasedItems: [],
    transactionLogs: [],
    equipment: { FishingRod: null, HuntingWeapon: null }
});

module.exports = new SQLiteModel('economy_users', 'userId', defaultData);
