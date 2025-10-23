const mongoose = require('mongoose');

const statisticsSchema = new mongoose.Schema({
    guildId: String,
    messageIds: {
        single: String,
        multiple: {
            type: Map,
            of: {
                id: String,
                position: Number
            }
        }
    },
    timestamp: { type: Date, default: Date.now },
    stats: {
        members: { type: Number, default: 0 },
        bots: { type: Number, default: 0 },
        totalUsers: { type: Number, default: 0 },
        channels: {
            text: { type: Number, default: 0 },
            voice: { type: Number, default: 0 },
            categories: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        roles: { type: Number, default: 0 },
        boosts: { type: Number, default: 0 },
        moderation: {
            bans: { type: Number, default: 0 },
            kicks: { type: Number, default: 0 }
        },
        messages: { type: Number, default: 0 },
        emojis: {
            normal: { type: Number, default: 0 },
            animated: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        stickers: { type: Number, default: 0 },
        boostTier: { type: Number, default: 0 },
        scheduledEvents: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model('ServerStatistics', statisticsSchema);