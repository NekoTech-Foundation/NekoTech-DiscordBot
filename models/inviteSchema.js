const mongoose = require('mongoose');

const joinedUserSchema = new mongoose.Schema({
    userID: { type: String, required: true },
    joinedAt: { type: Date, required: true }
}, { _id: false });

const inviteSchema = new mongoose.Schema({
    inviteCode: { type: String, required: true },
    guildID: { type: String, required: true },
    inviterID: { type: String, required: true },
    joinedUsers: { type: [joinedUserSchema], default: [] },
    uses: { type: Number, default: 0 }
});

module.exports = mongoose.model('Invite', inviteSchema);