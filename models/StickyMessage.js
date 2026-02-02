const mongoose = require('mongoose');

const StickyMessageSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    content: { type: String, required: true }, // KentaScratch format
    mode: {
        type: String,
        enum: ['ChatInactive', 'MessageThreshold'],
        default: 'ChatInactive'
    },
    delay: { type: Number, default: 15 }, // Seconds (1-15)
    threshold: { type: Number, default: 50 }, // Message count (1-500)
    currentCount: { type: Number, default: 0 },
    lastMessageId: { type: String, default: null }, // ID of the last sticky message sent
    lastActivity: { type: Date, default: Date.now },
    useWebhook: { type: Boolean, default: false },
    webhookUrl: { type: String, default: null },
    allowMentions: { type: Boolean, default: false }
});

// Ensure unique sticky config per channel
StickyMessageSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('StickyMessage', StickyMessageSchema);
