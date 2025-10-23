const mongoose = require('mongoose');

const MemePostSchema = new mongoose.Schema({
    guildId: String,
    channelId: String,
    lastPosted: Date,
    nextScheduled: Date,
    memeData: {
        title: String,
        postLink: String,
        subreddit: String,
        url: String,
        ups: Number,
        nsfw: Boolean
    }
});

module.exports = mongoose.model('MemePost', MemePostSchema); 