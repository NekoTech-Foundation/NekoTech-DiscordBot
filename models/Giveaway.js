const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    messageId: query.messageId,
    channelId: null,
    giveawayId: null,
    guildId: null,
    startAt: null,
    endAt: null,
    ended: false,
    winnerCount: 1,
    prize: '',
    entries: 0,
    messageWinner: false,
    notifyEntrantOnEnter: false,
    requirements: {
        whitelistRoles: [],
        blacklistRoles: [],
        minServerJoinDate: null,
        minAccountAge: null,
        minInvites: 0,
        minMessages: 0
    },
    winners: [],
    embed: {
        embedColor: null,
        embedImage: null,
        EmbedThumbnail: null,
        embedDescription: null,
        buttons: {
            joinButton: {
                JoinButtonStyle: null,
                JoinButtonEmoji: null,
                JoinButtonText: null,
            },
        },
    },
    messages: {
        winMessage: null,
        endMessage: null,
        noParticipantsMessage: null,
        noRoleRequirementMessage: null,
        noMinimumServerJoinDateMessage: null,
        noMinimumAccountAgeMessage: null,
    },
    entrants: [],
    extraEntries: [],
    hostedBy: null
});

module.exports = new SQLiteModel('giveaways', 'messageId', defaultData);
