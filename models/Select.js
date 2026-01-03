const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    id: query.id,
    placeholder: 'Select an option...',
    min_values: 1,
    max_values: 1,
    options: '[]', // JSON array of options
    created_at: Date.now()
});

module.exports = new SQLiteModel('kenta_selects', ['guildId', 'id'], defaultData);
