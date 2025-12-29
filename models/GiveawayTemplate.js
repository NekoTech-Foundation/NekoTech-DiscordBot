const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    name: query.name,
    description: '',
    embed: {
        color: '#2ecc71',
        image: '',
        button: {
            style: 'Primary',
            emoji: '🎉',
            label: 'Tham gia'
        }
    },
    defaults: {
        winners: 1,
        durationSec: 600,
        requirements: {
            whitelistRoles: [],
            blacklistRoles: [],
            bypassRoles: [],
            requiresJoinBeforeSec: 0
        },
        multipliers: []
    }
});

module.exports = new SQLiteModel('giveaway_templates', 'name', defaultData);

