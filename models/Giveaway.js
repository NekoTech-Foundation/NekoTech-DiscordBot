const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    messageId: String,
    channelId: String,
    giveawayId: String,
    guildId: String,
    startAt: Number,
    endAt: Number,
    ended: Boolean,
    winnerCount: Number,
    prize: String,
    entries: Number,
    messageWinner: Boolean,
    notifyEntrantOnEnter: Boolean,
    requirements: {
        whitelistRoles: [String],
        blacklistRoles: [String],
        minServerJoinDate: Date,
        minAccountAge: Date,
        minInvites: { type: Number, default: 0 },
        minMessages: { type: Number, default: 0 },
    },
    winners: [{
        winnerId: String,
    }],
    embed: {
        embedColor: String,
        embedImage: String,
        EmbedThumbnail: String,
        embedDescription: String,
        buttons: {
            joinButton: {
                JoinButtonStyle: String,
                JoinButtonEmoji: String,
                JoinButtonText: String,
            },
        },
    },
    messages: {
        winMessage: String,
        endMessage: String,
        noParticipantsMessage: String,
        noRoleRequirementMessage: String,
        noMinimumServerJoinDateMessage: String,
        noMinimumAccountAgeMessage: String,
    },
    entrants: [{
        entrantId: String,
        entrantUsername: String,
        extraEntries: { type: Number, default: 0 }
    }],
    extraEntries: [{
        roleId: String,
        entries: Number
    }],
    hostedBy: String,
}, { id: false });

module.exports = mongoose.model('giveaways', giveawaySchema);