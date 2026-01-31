const mongoose = require('mongoose');

const fishingTournamentSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, required: true },
    type: { type: String, enum: ['heaviest', 'most_caught', 'rarest'], default: 'heaviest' },
    targetFish: { type: String, default: null }, // If null, any fish
    participants: [
        {
            userId: String,
            score: { type: Number, default: 0 }, // Weight or Count or Rarity Score
            bestFish: String, // Name of best fish caught
            bestFishWeight: Number
        }
    ],
    active: { type: Boolean, default: true },
    rewardsDistributed: { type: Boolean, default: false }
});

module.exports = mongoose.model('FishingTournament', fishingTournamentSchema);
