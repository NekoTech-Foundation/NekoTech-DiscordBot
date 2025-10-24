const mongoose = require('mongoose');

const botActivitySchema = new mongoose.Schema({
    botId: {
        type: String,
        default: 'global_settings',
        unique: true
    },
    activities: [{
        status: {
            type: String,
            required: true
        },
        activityType: {
            type: String,
            enum: ['PLAYING', 'LISTENING', 'WATCHING', 'STREAMING', 'COMPETING'],
            required: true
        },
        statusType: {
            type: String,
            enum: ['online', 'idle', 'dnd'],
            required: true
        },
        streamingURL: {
            type: String,
            required: function() {
                return this.activityType === 'STREAMING';
            }
        }
    }],
    lastActivityIndex: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BotActivity', botActivitySchema);