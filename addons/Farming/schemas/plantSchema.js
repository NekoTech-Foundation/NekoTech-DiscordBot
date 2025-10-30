const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    plant: { type: String, required: true },
    plantedAt: { type: Date, required: true, default: Date.now },
    quantity: { type: Number, required: true, default: 1 },
});

module.exports = mongoose.model('plantSchema', plantSchema);
