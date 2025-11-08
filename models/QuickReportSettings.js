const { Schema, model } = require('mongoose');

const quickReportSettingsSchema = new Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
    },
    enabled: {
        type: Boolean,
        default: false,
    },
    receiveChannelId: {
        type: String,
        default: null,
    },
    muteRoleId: {
        type: String,
        default: null,
    },
    managerRoleId: {
        type: String,
        default: null,
    },
    bypassRoleId: {
        type: String,
        default: null,
    },
    blacklistRoleId: {
        type: String,
        default: null,
    },
    autoExpireHours: {
        type: Number,
        default: 0,
    },
    concurrentReports: {
        type: Number,
        default: 6,
    },
    successfulMessage: {
        type: String,
        default: '@{moderator}, đã tiếp nhận một phiếu tố cáo mới.',
    },
    autoDeleteOnTimeout: {
        type: Boolean,
        default: true,
    },
    autoDeleteOnMute: {
        type: Boolean,
        default: true,
    },
    autoDeleteOnLeave: {
        type: Boolean,
        default: true,
    },
    whitelistedChannels: {
        type: [String],
        default: [],
    },
    blacklistedChannels: {
        type: [String],
        default: [],
    },
    whitelistedCategories: {
        type: [String],
        default: [],
    },
    blacklistedCategories: {
        type: [String],
        default: [],
    },
    mode: {
        type: String,
        enum: ['whitelist', 'blacklist', 'guild'],
        default: 'guild',
    },
});

module.exports = model('QuickReportSettings', quickReportSettingsSchema);
