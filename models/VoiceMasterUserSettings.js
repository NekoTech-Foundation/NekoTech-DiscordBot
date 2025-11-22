const mongoose = require('mongoose');

const voiceMasterUserSettingsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    channelName: {
        type: String,
        default: null
    },
    channelLimit: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('VoiceMasterUserSettings', voiceMasterUserSettingsSchema);
