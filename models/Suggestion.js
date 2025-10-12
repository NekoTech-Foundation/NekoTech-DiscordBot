const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
    uniqueId: {
        type: String,
        required: true,
        unique: true
    },
    text: {
        type: String,
        required: true,
    },
    authorId: {
        type: String,
        required: true,
    },
    channelId: {
        type: String,
        required: true,
    },
    messageId: {
        type: String,
        required: true,
    },
    threadId: {
        type: String,
        required: false,
    },
    upvotes: {
        type: Number,
        default: 0,
    },
    downvotes: {
        type: Number,
        default: 0,
    },
    voters: [{
        userId: String,
        voteType: String,
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Denied'],
        default: 'Pending',
    },
    modalData: {
        type: Map,
        of: String,
        default: {}
    }
});

const Suggestion = mongoose.model('Suggestion', suggestionSchema);

module.exports = Suggestion;