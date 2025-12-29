const SQLiteModel = require('../../../utils/sqliteModel');

const defaultData = (query) => ({
    id: query.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
    userId: query.userId,
    cardId: query.cardId,
    level: 1,
    limitBreak: 0,
    exp: 0,
    obtainedAt: Date.now(),
    locked: false,
    rarity: query.rarity || 1, // Default rarity if not provided
    type: query.type || 'Speed', // Default type
    trainingBoost: 0
});

// Using 'id' as primary key for individual card instances
module.exports = new SQLiteModel('user_support_cards', 'id', defaultData);
