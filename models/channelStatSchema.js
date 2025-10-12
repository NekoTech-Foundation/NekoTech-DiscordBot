const mongoose = require('mongoose');

const channelStatSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    type: { type: String, required: true },
    channelId: { type: String, required: true },
    channelName: { type: String, required: true },
    roleId: { type: String, required: false }
});

module.exports = mongoose.model('ChannelStat', channelStatSchema);