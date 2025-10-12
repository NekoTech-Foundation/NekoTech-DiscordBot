const mongoose = require('mongoose');

const guildDataSchema = new mongoose.Schema({
    guildID: { type: String, required: true },
    cases: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    stars: { type: Object, default: {} },
    totalSuggestions: { type: Number, default: 0 },
    timesBotStarted: { type: Number, default: 0 },
    members: { type: [String], default: [] },
    timeoutRoleId: { type: String, default: null }
});

module.exports = mongoose.model('GuildData', guildDataSchema);