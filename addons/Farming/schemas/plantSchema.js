const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    plant: { type: String, required: true },
    plantedAt: { type: Date, required: true, default: Date.now },
    quantity: { type: Number, required: true, default: 1 },
    fertilizer: {
        type: Object, default: null,
        properties: {
            key: { type: String },
            effect: { type: String },
            qualityReduced: { type: Boolean, default: false }
        }
    },
    event: { type: Object, default: null },
    mutation: { type: Object, default: null },
    lastEventCheck: { type: Date, default: Date.now }
});

module.exports = mongoose.model('plantSchema', plantSchema);
