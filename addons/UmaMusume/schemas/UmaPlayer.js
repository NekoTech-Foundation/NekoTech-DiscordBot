const SQLiteModel = require('../../../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    coins: 0,
    carrots: 0,
    friendPoints: 0,
    energy: 100,
    maxEnergy: 100,
    trainingTickets: 3,
    raceTickets: 3,
    lastEnergyUpdate: Date.now(),
    lastTicketReset: Date.now(),
    umas: [], // Array of UserUma IDs
    supportCards: [], // Array of UserSupportCard IDs
    items: [],
    settings: {
        voice: true,
        notifications: true
    }
});

module.exports = new SQLiteModel('uma_players', 'userId', defaultData);
