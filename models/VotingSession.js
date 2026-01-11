const SQLiteModel = require('../utils/sqliteModel');
const { v4: uuidv4 } = require('uuid');

const defaultData = (query) => ({
    sessionId: query.sessionId || uuidv4(),
    guildId: query.guildId,
    channelId: query.channelId,
    startMessageId: query.startMessageId,
    startTime: Date.now(),
    endTime: null,
    status: 'ACTIVE', // ACTIVE, ENDED
    config: {
        countingMethod: 'REACTION_COUNT', // REACTION_COUNT, USER_COUNT, USER_SINGLE_VOTE
        allowedRoles: [], // Whitelist
        blockedRoles: [], // Blacklist
        minAccountAge: 0, // ms
        joinServerTime: 0, // ms
        removeVoteOnLeave: false,
        maxVotesPerUser: 0, // 0 = unlimited
        allowSelfVote: true,
        allowBotVote: false,
        ignoreZeroVote: true
    },
    // We don't necessarily need to store every single vote here if we index by messageID or just scan reactions,
    // but for "limiting votes per user across the SESSION", we might need to track user participation.
    // However, the prompt implies "counting session" for a channel.
    // Let's store a map of UserID -> [MessageID] to track how many times they voted if we need to enforce limits.
    // Since basic SQLiteModel might not handle complex nested maps well on updates without full rewrite,
    // we'll rely on fetching reactions for "counts" or store simple stats.
    // For "MAX VOTES PER USER" enforcement, we need to track user participation.
    votes: {} // userId: [messageId1, messageId2]
});

module.exports = new SQLiteModel('voting_sessions', 'sessionId', defaultData);
