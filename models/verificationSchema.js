const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
    guildID: String,
    msgID: String,
    unverifiedRoleID: String
});

module.exports = mongoose.model('Verification', verificationSchema);
