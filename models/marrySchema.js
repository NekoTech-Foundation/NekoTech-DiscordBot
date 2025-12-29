const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    authorid: query.authorid,
    wifeid: query.wifeid,
    husbandid: query.husbandid,
    nhan: null,
    loihua: 'Yêu nhau suốt kiếp',
    together: 0
});

module.exports = new SQLiteModel('marriages', 'authorid', defaultData);
