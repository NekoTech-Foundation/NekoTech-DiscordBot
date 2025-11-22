const mongoose = require('mongoose');

const voiceMasterGuildSettingsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    channelLimit: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('VoiceMasterGuildSettings', voiceMasterGuildSettingsSchema);
