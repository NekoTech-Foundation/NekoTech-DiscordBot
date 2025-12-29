const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    authorid: query.authorid,
    wifeid: null,
    anhcuoi: null
});

module.exports = new SQLiteModel('anhcuoi', 'authorid', defaultData);
