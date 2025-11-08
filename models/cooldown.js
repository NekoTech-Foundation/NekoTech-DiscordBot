const mongoose = require('mongoose');

const cooldownSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    endsAt: { type: Number, required: true }
});

cooldownSchema.index({ userId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Cooldown', cooldownSchema);
