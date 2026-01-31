const SQLiteModel = require('../../../../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    channelId: null,
    startTime: Date.now(),
    endTime: 0,
    type: 'heaviest', // heaviest, most_caught, rarest
    targetFish: null,
    participants: [], // Array of objects { userId, score, bestFish, bestFishWeight }
    active: false,
    rewardsDistributed: false
});

// Table Name: 'fishing_tournaments', Key: 'guildId'
module.exports = new SQLiteModel('fishing_tournaments', 'guildId', defaultData);
