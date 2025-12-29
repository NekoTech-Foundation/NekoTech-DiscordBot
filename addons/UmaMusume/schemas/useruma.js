const SQLiteModel = require('../../../utils/sqliteModel');

const defaultData = (query) => ({
    id: query.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
    userId: query.userId,
    umaId: query.umaId, // ID from UmaMusume data
    name: query.name || 'Unknown',
    nickname: '',
    level: 1,
    limitBreak: 0,
    exp: 0,
    rarity: query.rarity || 1,
    stats: {
        speed: 50,
        stamina: 50,
        power: 50,
        guts: 50,
        wisdom: 50
    },
    aptitudes: {
        turf: 'G', dirt: 'G',
        short: 'G', mile: 'G', medium: 'G', long: 'G',
        runner: 'G', leader: 'G', betweener: 'G', chaser: 'G'
    },
    skills: [], // Array of skill objects/IDs
    fans: 0,
    rank: 'G',
    obtainedAt: Date.now(),
    isFavorite: false,
    trainingStatus: {
        inTraining: false,
        careerId: null
    },
    raceStats: {
        runs: 0,
        wins: 0,
        places: 0
    },
    customOutfit: null,
    awakeningLevel: 1
});

module.exports = new SQLiteModel('user_umas', 'id', defaultData);
