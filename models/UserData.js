const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    guildId: query.guildId,
    xp: 0,
    level: 0,
    prestige: 0,
    warns: 0,
    bans: 0,
    kicks: 0,
    timeouts: 0,
    note: '',
    warnings: [],
    totalMessages: 0,
    messages: [],
    tempBans: [],
    balance: 0,
    bank: 0,
    inventory: [],
    boosters: [],
    commandData: {
        lastDaily: null, dailyStreak: 0, lastBeg: null, lastWork: null,
        lastCrime: null, lastBlackjack: null, lastSlot: null, lastRob: null, lastFishing: null
    },
    isMuted: false,
    interestRate: null,
    purchasedItems: [],
    transactionLogs: [],
    roles: [],
    equipment: { FishingRod: null, HuntingWeapon: null },
    rankTheme: null
});

module.exports = new SQLiteModel('users', ['userId', 'guildId'], defaultData);
