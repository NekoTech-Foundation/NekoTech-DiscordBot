const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    name: query.name,
    embedData: {},
    linkButtons: []
});

module.exports = new SQLiteModel('embed_templates', 'name', defaultData);
