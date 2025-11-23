const mongoose = require('mongoose');

const mcuserSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    minecraftUsername: { type: String, required: true },
});

module.exports = mongoose.model('MCUser', mcuserSchema);
