const mongoose = require('mongoose');

const vesoSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    notificationChannel: {
        type: String,
        default: null
    },
    tickets: [{
        userId: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        numbers: {
            type: String,
            required: true
        },
        purchaseDate: {
            type: Date,
            default: Date.now
        },
        drawn: {
            type: Boolean,
            default: false
        },
        won: {
            type: Boolean,
            default: false
        },
        prize: {
            type: Number,
            default: 0
        }
    }],
    drawHistory: [{
        date: {
            type: Date,
            required: true
        },
        winningNumbers: [{
            price: Number,
            numbers: String
        }],
        winners: [{
            userId: String,
            price: Number,
            numbers: String,
            prize: Number
        }]
    }]
}, {
    timestamps: true
});

// Index để tìm kiếm nhanh hơn
vesoSchema.index({ guildId: 1, 'tickets.drawn': 1 });
vesoSchema.index({ guildId: 1, 'tickets.userId': 1 });

module.exports = mongoose.model('VeSo', vesoSchema);
