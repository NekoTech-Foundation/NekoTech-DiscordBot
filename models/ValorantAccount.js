const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    username: query.username || '',
    discordId: query.discordId,
    valorantAccount: query.valorantAccount || null
});

module.exports = new SQLiteModel('valorant_accounts', ['discordId'], defaultData);
