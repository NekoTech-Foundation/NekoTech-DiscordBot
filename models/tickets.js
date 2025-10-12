const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
    url: String,
    proxyURL: String,
    contentType: String,
    name: String,
    id: String,
    timestamp: Date,
    binaryData: {
        type: Buffer,
        required: false
    },
    width: Number,
    height: Number,
    size: Number,
    compressed: {
        type: Boolean,
        default: false
    }
});

const messageSchema = new mongoose.Schema({
    author: String,
    authorId: String,
    content: String,
    timestamp: Date,
    attachments: [attachmentSchema]
});

const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true }
});

const ticketSchema = new mongoose.Schema({
    ticketId: {
        type: Number,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    channelId: {
        type: String,
        required: true
    },
    channelName: String,
    guildId: {
        type: String,
        required: true
    },
    ticketType: {
        type: String,
        required: true
    },
    status: { type: String, default: 'open' },
    priority: String,
    rating: {
        type: String,
        default: 'No Rating Yet'
    },
    reviewFeedback: {
        type: String,
        default: ''
    },
    messageCount: Number,
    messages: {
        type: [messageSchema],
        default: []
    },
    attachments: {
        type: [attachmentSchema],
        default: []
    },
    logMessageId: String,
    alertMessageId: String,
    questions: {
        type: [questionSchema],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    closedAt: Date,
    alertTime: Date,
    firstMessageId: { type: String },
    claimed: { type: Boolean, default: false },
    claimedBy: { type: String, default: null },
    closeReason: {
        type: String,
        default: null
    },
    customCloseReason: {
        type: String,
        default: null
    },
    alertReason: {
        type: String,
        default: 'No reason provided'
    },
    channelTopic: { type: String, default: '' },
    processingClaim: { type: Boolean, default: false }
});

ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ ticketType: 1, status: 1 });
ticketSchema.index({ priority: 1, status: 1 });
ticketSchema.index({ claimed: 1, claimedBy: 1 });
ticketSchema.index({ createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

async function ensureTextIndex() {
    try {
        const collection = mongoose.connection.collection('tickets');
        
        try {
            await collection.dropIndex('channelName_text_messages.content_text_ticketType_text');
        } catch (dropErr) {
            if (dropErr.code !== 27) {
              //  console.error('Error dropping index:', dropErr);
            }
        }

        await collection.createIndex(
            { 
                channelName: 'text',
                'messages.content': 'text',
                userId: 'text',
                ticketType: 'text'
            },
            {
                weights: {
                    'messages.content': 10,
                    userId: 8,
                    ticketType: 6,
                    channelName: 4
                },
                name: 'tickets_text_search',
                background: true
            }
        );
    } catch (err) {
        console.error('Error managing text index:', err);
    }
}

mongoose.connection.once('connected', async () => {
    try {
        await ensureTextIndex();
        await Ticket.createIndexes();
    } catch (err) {
      //  console.error('Error creating indexes:', err);
    }
});

module.exports = Ticket;