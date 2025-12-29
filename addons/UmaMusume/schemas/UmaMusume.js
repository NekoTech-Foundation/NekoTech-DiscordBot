const SQLiteModel = require('../../../utils/sqliteModel');

const defaultData = (query) => ({
    umaId: query.umaId || Date.now().toString(36) + Math.random().toString(36).substr(2),
    name: query.name,
    baseStats: {
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
    growthRate: {
        speed: 0, stamina: 0, power: 0, guts: 0, wisdom: 0
    },
    initialSkills: [],
    events: [],
    rarity: 1,
    description: ''
});

module.exports = new SQLiteModel('uma_musume_data', 'umaId', defaultData);
