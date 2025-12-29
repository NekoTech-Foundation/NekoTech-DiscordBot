const SQLiteModel = require('../../../utils/sqliteModel');

const defaultData = (query) => ({
    careerId: query.careerId || Date.now().toString(36) + Math.random().toString(36).substr(2),
    userId: query.userId,
    umaId: query.umaId || null, // Reference to UserUma id
    startTime: Date.now(),
    endTime: null,
    totalTurns: 0,
    races: [], // Array of race objects
    stats: {
        speed: 0,
        stamina: 0,
        power: 0,
        guts: 0,
        wisdom: 0
    },
    skills: [], // Array of learned skills
    fans: 0,
    mood: 'Normal', // Current mood
    energy: 100,
    maxEnergy: 100,
    trainingLevel: {
        speed: 1,
        stamina: 1,
        power: 1,
        guts: 1,
        wisdom: 1
    },
    supportCards: [], // IDs of support cards used
    inheritance: [], // IDs of parent umas
    scenario: 'URA', // Scenario played
    score: 0,
    rank: 'G',
    events: [] // Log of events
});

module.exports = new SQLiteModel('uma_careers', 'careerId', defaultData);
