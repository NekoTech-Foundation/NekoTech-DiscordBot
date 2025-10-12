const mongoose = require('mongoose');

const botActivitySchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
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
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('BotActivity', botActivitySchema);