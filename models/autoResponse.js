const mongoose = require('mongoose');

const autoResponseSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    trigger: {
        type: String,
        required: true
    },
    responseType: {
        type: String,
        enum: ['TEXT', 'EMBED'],
        required: true
    },
    responseText: {
        type: String,
        required: function() {
            return this.responseType === 'TEXT';
        }
    },
    embedData: {
        type: Object,
        required: function() {
            return this.responseType === 'EMBED';
        }
    },
    whitelistRoles: {
        type: [String],
        default: []
    },
    blacklistRoles: {
        type: [String],
        default: []
    },
    whitelistChannels: {
        type: [String],
        default: []
    },
    blacklistChannels: {
        type: [String],
        default: []
    }
});

autoResponseSchema.index({ guildId: 1, trigger: 1 }, { unique: true });

const AutoResponse = mongoose.models.AutoResponse || mongoose.model('AutoResponse', autoResponseSchema);

module.exports = AutoResponse; 