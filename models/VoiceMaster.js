const mongoose = require('mongoose');

const voiceMasterSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    ownerId: {
        type: String,
        required: true
    },
    voiceChannelId: {
        type: String,
        required: true
    },
    voiceCategoryId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('VoiceMaster', voiceMasterSchema);
