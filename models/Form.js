const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    id: query.id,
    title: 'Form',
    description: null,
    log_channel: null,
    response_message: 'Thank you for your submission!',
    questions: '[]', // JSON array of questions
    created_at: Date.now()
});

module.exports = new SQLiteModel('kenta_forms', ['guildId', 'id'], defaultData);
