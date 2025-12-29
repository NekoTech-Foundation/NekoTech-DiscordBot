const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    welcomeChannel: null,
    welcomeMessage: null,
    goodbyeChannel: null,
    goodbyeMessage: null
});

module.exports = new SQLiteModel('greetings', 'guildId', defaultData);
