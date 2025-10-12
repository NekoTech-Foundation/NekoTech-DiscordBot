const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    alertType: { type: String, required: true },
    serverName: { type: String, required: true },
    version: { type: String },
    status: { type: String, required: true },
    lastChecked: { type: Date, default: Date.now },
    webhookUrl: { type: String, required: true }
});

module.exports = mongoose.model('Alert', alertSchema);