const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    ticketPreferences: {
        statusOrder: {
            type: [{
                status: String,
                order: Number
            }],
            default: [
                { status: 'open', order: 1 },
                { status: 'closed', order: 2 },
                { status: 'deleted', order: 3 }
            ]
        }
    },
    theme: {
        type: String,
        enum: ['dark', 'light', 'system'],
        default: 'dark'
    },
    notifications: {
        ticketUpdates: {
            type: Boolean,
            default: true
        },
        mentions: {
            type: Boolean,
            default: true
        },
        email: {
            type: Boolean,
            default: false
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

userSettingsSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('UserSettings', userSettingsSchema); 