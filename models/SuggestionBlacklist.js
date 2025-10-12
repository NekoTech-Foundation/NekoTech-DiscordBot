const mongoose = require('mongoose');

const suggestionBlacklistSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const SuggestionBlacklist = mongoose.model('SuggestionBlacklist', suggestionBlacklistSchema);

module.exports = SuggestionBlacklist;