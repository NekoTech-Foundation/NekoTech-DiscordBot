const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildID: query.guildID,
    roleID: null,         // Role to give after verification
    channelID: null,      // Channel where the panel is located
    unverifiedRoleID: null, // Role to give on join (optional)
    mode: 'BUTTON',       // BUTTON, CAPTCHA, MATH
    msgID: null           // Panel message ID
});

module.exports = new SQLiteModel('verifications', 'guildID', defaultData);
