const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    botActivity: '',
    dashboardSettings: {
        navName: 'DrakoBot',
        favicon: 'None',
        tabName: 'DrakoBot Dashboard',
        defaultTheme: 'dark',
        customNavItems: [],
        navCategories: {
            navigation: 'Navigation',
            custom: 'Custom Links',
            addons: 'Addons'
        }
    }
});

module.exports = new SQLiteModel('settings', 'guildId', defaultData);
