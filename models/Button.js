const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    id: query.id,
    label: 'Button',
    emoji: null,
    style: 'Primary', // Primary, Secondary, Success, Danger, Link
    type: 'response', // response, form, link
    content: null, // Response text, Form ID, or URL
    created_at: Date.now()
});

module.exports = new SQLiteModel('kenta_buttons', ['guildId', 'id'], defaultData);
