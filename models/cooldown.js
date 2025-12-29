const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    userId: query.userId,
    type: query.type,
    endsAt: 0
});

module.exports = new SQLiteModel('cooldowns', ['userId', 'type'], defaultData);
