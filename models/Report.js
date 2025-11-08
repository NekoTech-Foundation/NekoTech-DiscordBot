const { Schema, model } = require('mongoose');

const reportSchema = new Schema({
    reportId: {
        type: Number,
        required: true,
    },
    guildId: {
        type: String,
        required: true,
    },
    reporterId: {
        type: String,
        required: true,
    },
    reportedUserId: {
        type: String,
        required: true,
    },
    messageId: {
        type: String,
        required: true,
    },
    channelId: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

reportSchema.index({ guildId: 1, reportId: 1 }, { unique: true });

module.exports = model('Report', reportSchema);
