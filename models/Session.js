const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    sessionId: query.sessionId,
    session: {},
    expires: null
});

module.exports = new SQLiteModel('sessions', 'sessionId', defaultData);