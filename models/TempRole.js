const mongoose = require('mongoose');

const tempRoleSchema = new mongoose.Schema({
    userId: String,
    guildId: String,
    roleId: String,
    expiration: Date,
});

module.exports = mongoose.model('TempRole', tempRoleSchema);