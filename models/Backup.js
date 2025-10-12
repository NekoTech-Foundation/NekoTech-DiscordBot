const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
    backupId: String,
    guildId: String,
    data: mongoose.Schema.Types.Mixed,
    createdAt: Date
});

module.exports = mongoose.model('Backup', BackupSchema);