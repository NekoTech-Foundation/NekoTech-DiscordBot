const mongoose = require('mongoose');

const fishingSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    equippedRod: { type: String }, // Key of the equipped rod, e.g., 'tap_su'
    equippedBait: { type: String }, // Key of the equipped bait, e.g., 'giun'
    rods: [
        {
            key: { type: String }, // e.g., 'tap_su', 'ban_chuyen'
            name: { type: String },
            durability: { type: Number },
        },
    ],
    inventory: [
        {
            name: { type: String },
            rarity: { type: String },
            totalWeight: { type: Number },
            quantity: { type: Number },
        },
    ],
    baits: [
        {
            name: { type: String },
            quantity: { type: Number },
        },
    ],
});

module.exports = mongoose.model('fishingSchema', fishingSchema);
