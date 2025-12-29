const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    method: 'vietqr',
    label: 'Merchant QR',
    imageUrl: '',
    updatedBy: null
});

module.exports = new SQLiteModel('merchant_qr', 'guildId', defaultData);

