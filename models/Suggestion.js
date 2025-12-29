const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    uniqueId: query.uniqueId,
    text: null,
    authorId: null,
    channelId: null,
    messageId: null,
    threadId: null,
    upvotes: 0,
    downvotes: 0,
    voters: [],
    createdAt: Date.now(),
    status: 'Pending',
    modalData: {}
});

module.exports = new SQLiteModel('suggestions', 'uniqueId', defaultData);