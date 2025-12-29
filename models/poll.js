const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    messageId: query.messageId,
    channelId: null,
    question: null,
    authorId: null,
    choices: [],
    multiVote: false,
    createdAt: Date.now()
});

module.exports = new SQLiteModel('polls', 'messageId', defaultData);
