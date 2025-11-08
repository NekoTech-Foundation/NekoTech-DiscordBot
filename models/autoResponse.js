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
    response: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        enum: ['exact', 'contains', 'startswith', 'endswith'],
        required: true
    },
    ignoreCase: {
        type: Boolean,
        default: false
    },
    attachmentUrl: {
        type: String
    }
});

autoResponseSchema.index({ guildId: 1, trigger: 1 }, { unique: true });

const AutoResponse = mongoose.models.AutoResponse || mongoose.model('AutoResponse', autoResponseSchema);

module.exports = AutoResponse;