const mongoose = require('mongoose');

const serverStatsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    channelId: {
        type: String,
        required: true
    },
    messageId: {
        type: String,
        required: true
    }
});

const ServerStats = mongoose.models.ServerStats || mongoose.model('ServerStats', serverStatsSchema);

module.exports = ServerStats;
