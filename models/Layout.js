const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    name: query.name,
    json_data: '[]', // Stringified JSON array of rows/components
    created_at: Date.now(),
    updated_at: Date.now()
});

module.exports = new SQLiteModel('kenta_layouts', ['guildId', 'name'], defaultData);
