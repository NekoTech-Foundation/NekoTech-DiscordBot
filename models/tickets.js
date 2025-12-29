const SQLiteModel = require('../utils/sqliteModel');

// Reconstruct default data from schema
const defaultData = (query) => ({
    ticketId: null, // Should be auto-generated or passed? Schema says required.
    userId: query.userId,
    channelId: query.channelId,
    channelName: null,
    guildId: query.guildId,
    ticketType: null,
    status: 'open',
    priority: null,
    rating: 'No Rating Yet',
    reviewFeedback: '',
    messageCount: 0,
    messages: [],
    attachments: [],
    logMessageId: null,
    alertMessageId: null,
    questions: [],
    createdAt: Date.now(),
    closedAt: null,
    alertTime: null,
    firstMessageId: null,
    claimed: false,
    claimedBy: null,
    closeReason: null,
    customCloseReason: null,
    alertReason: 'No reason provided',
    channelTopic: '',
    processingClaim: false
});

class TicketModel extends SQLiteModel {
    constructor() {
        super('tickets', 'ticketId', defaultData);
    }
    
    // Add create helper to handle ticketId generation if needed
    async create(doc) {
        // Simple auto-increment ticketId?
        if (!doc.ticketId) {
             const max = db.prepare('SELECT MAX(CAST(ticketId AS INTEGER)) as maxId FROM tickets').get();
             doc.ticketId = (max.maxId || 0) + 1;
        }
        return super.create(doc);
    }
}

const db = require('../utils/database'); // Need db for manual queries
const model = new TicketModel();
// We need to export both the model instance methods AND the specific static methods used by the bot
// Ideally we just export the model instance which has findOne/create/etc.

// Custom find logic often used: findOne({ channelId: ... })
// Our default SQLiteModel.findOne only uses PKs.
// We should enhance SQLiteModel or override here.
// But for now, let's keep it simple and attach custom finders if needed.

model.findByChannelId = (channelId) => {
    // Custom query
    const row = db.prepare('SELECT data FROM tickets WHERE data LIKE ?').get(`%"channelId":"${channelId}"%`); 
    // ^ This LIKE query is risky for JSON, better to extract property with json_extract if sqlite version supports it
    // standard better-sqlite3 bundles new sqlite which supports json_extract
    const safeRow = db.prepare("SELECT data FROM tickets WHERE json_extract(data, '$.channelId') = ?").get(channelId);
    if (safeRow) {
        return model._wrap(JSON.parse(safeRow.data));
    }
    return null;
}

// Override findOne to support non-PK queries via JSON extract?
// That might be too heavy. Let's stick to simple for now and rely on refactoring usages later if needed.
// Actually, tickets are often looked up by channelId.

module.exports = model;
