const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    channelId: {
        type: String,
        required: true
    },
    question: {
        type: String,
        required: true
    },
    authorId: {
        type: String,
        required: true
    },
    choices: [
        {
            name: { type: String, required: true },
            votes: { type: Number, default: 0 },
            emoji: { type: String, required: true }
        }
    ],
    multiVote: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Poll', pollSchema);