const mongoose = require('mongoose');

const userUmaSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    umaId: { type: String, required: true },
    name: { type: String, required: true },
    tier: { type: Number, required: true, min: 1, max: 3 },
    rarity: { type: String, required: true },
    stats: {
        speed: { type: Number, default: 0 },
        stamina: { type: Number, default: 0 },
        power: { type: Number, default: 0 },
        guts: { type: Number, default: 0 },
        wit: { type: Number, default: 0 }
    },
    trackPreferences: {
        grass: { type: String, default: 'C' },
        dirt: { type: String, default: 'C' },
        sprint: { type: String, default: 'C' },
        mile: { type: String, default: 'C' },
        medium: { type: String, default: 'C' },
        long: { type: String, default: 'C' },
        front: { type: String, default: 'C' },
        stalker: { type: String, default: 'C' },
        closer: { type: String, default: 'C' },
        chaser: { type: String, default: 'C' }
    },
    bonuses: {
        powerBonus: { type: Number, default: 0 },
        witBonus: { type: Number, default: 0 },
        speedBonus: { type: Number, default: 0 },
        staminaBonus: { type: Number, default: 0 },
        gutsBonus: { type: Number, default: 0 }
    },
    trainCount: { type: Number, default: 0, max: 30 },
    energy: { type: Number, default: 10, min: 0, max: 10 },
    skillPoints: { type: Number, default: 0 },
    skills: [{
        name: String,
        description: String,
        rarity: String,
        cost: Number,
        effects: mongoose.Schema.Types.Mixed
    }],
    factors: [{
        type: String,
        value: Number,
        stars: Number
    }],
    isRetired: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    isDefense: { type: Boolean, default: false },
    generation: { type: Number, default: 1 },
    fans: { type: Number, default: 0 },
    raceStats: {
        totalRaces: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        places: { type: Number, default: 0 },
        shows: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
});

userUmaSchema.index({ userId: 1, isRetired: 1 });
userUmaSchema.index({ userId: 1, isFavorite: 1 });
userUmaSchema.index({ userId: 1, isDefense: 1 });

module.exports = mongoose.model('UserUma', userUmaSchema);
