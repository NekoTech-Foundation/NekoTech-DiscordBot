const mongoose = require('mongoose');

const systemAlertSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    type: { type: String, enum: ['Website', 'Minecraft', 'Bots', 'Pterodactyl'], required: true },
    pterodactylId: { type: String },
    apiKey: { type: String },
    status: { type: String, enum: ['Online', 'Offline', 'Pending'], default: 'Pending' },
    lastChecked: { type: Date, default: Date.now },
    lastStatusChange: { type: Date, default: Date.now },
    notificationChannel: { type: String }
});

module.exports = mongoose.model('SystemAlert', systemAlertSchema);