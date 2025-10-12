const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    author: { type: String },
    duration: { type: String },
    thumbnail: { type: String },
    durationMS: { type: Number },
    requestedBy: { type: String }
});

const MusicQueueSchema = new mongoose.Schema({
    guildId: { 
        type: String, 
        required: true,
        index: true
    },
    nowPlayingMessageId: { 
        type: String, 
        default: null 
    },
    nowPlayingChannelId: { 
        type: String, 
        default: null 
    },
    currentTrack: { 
        type: SongSchema, 
        default: null 
    },
    queue: [SongSchema],
    volume: { 
        type: Number, 
        default: 80 
    },
    repeatMode: { 
        type: Number, 
        default: 0 
    },
    voiceChannelId: { 
        type: String, 
        default: null 
    },
    textChannelId: { 
        type: String, 
        default: null 
    },
    isPaused: { 
        type: Boolean, 
        default: false 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

MusicQueueSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

MusicQueueSchema.index({ guildId: 1, updatedAt: 1 });

const MusicQueue = mongoose.model('MusicQueue', MusicQueueSchema);

module.exports = MusicQueue; 