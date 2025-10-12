const mongoose = require('mongoose');

const autoReactSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    reactions: [{
        id: { type: Number, required: true },
        keyword: { type: String, required: true },
        emoji: { type: String, required: true },
        whitelistRoles: [String],
        whitelistChannels: [String],
    }]
});

module.exports = mongoose.model('AutoReact', autoReactSchema);