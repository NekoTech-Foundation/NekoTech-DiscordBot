const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    defaultConfig: {
        countingMethod: 'REACTION_COUNT',
        allowedRoles: [],
        blockedRoles: [],
        minAccountAge: 0,
        joinServerTime: 0,
        removeVoteOnLeave: false,
        maxVotesPerUser: 0,
        allowSelfVote: true,
        allowBotVote: false
    }
});

module.exports = new SQLiteModel('voting_configs', 'guildId', defaultData);
