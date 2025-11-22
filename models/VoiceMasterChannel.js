const mongoose = require('mongoose');

const voiceMasterChannelSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    voiceId: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('VoiceMasterChannel', voiceMasterChannelSchema);
