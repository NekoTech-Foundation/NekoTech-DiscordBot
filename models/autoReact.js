const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    reactions: []
});

module.exports = new SQLiteModel('auto_react', 'guildId', defaultData);
