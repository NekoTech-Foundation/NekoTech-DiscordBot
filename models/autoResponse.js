const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    trigger: query.trigger,
    response: null,
    mode: 'exact',
    ignoreCase: false,
    attachmentUrl: null
});

module.exports = new SQLiteModel('auto_response', ['guildId', 'trigger'], defaultData);