const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    enabled: false,
    receiveChannelId: null,
    muteRoleId: null,
    managerRoleId: null,
    bypassRoleId: null,
    blacklistRoleId: null,
    autoExpireHours: 0,
    concurrentReports: 6,
    successfulMessage: '@{moderator}, đã tiếp nhận một phiếu tố cáo mới.',
    autoDeleteOnTimeout: true,
    autoDeleteOnMute: true,
    autoDeleteOnLeave: true,
    whitelistedChannels: [],
    blacklistedChannels: [],
    whitelistedCategories: [],
    blacklistedCategories: [],
    mode: 'guild'
});

module.exports = new SQLiteModel('quick_report_settings', 'guildId', defaultData);
