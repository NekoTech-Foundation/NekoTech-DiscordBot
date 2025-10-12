const mongoose = require('mongoose');

const ReactionRoleSchema = new mongoose.Schema({
    panelName: { type: String, required: true, unique: true },
    channelID: { type: String, required: true },
    messageID: { type: String, required: true }
});

module.exports = mongoose.model('ReactionRole', ReactionRoleSchema);