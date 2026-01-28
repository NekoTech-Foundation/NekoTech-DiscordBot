const SQLiteModel = require('../utils/sqliteModel');
const itemsDb = require('../utils/rpg/data/items.json');

const defaultData = (query) => ({
    userId: query.userId,
    // Kinh tế
    gold: 0,
    gems: 0,

    // Chỉ số cơ bản
    xp: 0,
    level: 1,
    stats: {
        hp: 100,
        str: 10,
        spd: 10,
        def: 5
    },

    // Kho chứa
    zoo: [],         // Danh sách thú
    inventory: [],   // Danh sách item [{ id: 'wood', count: 5 }]
    equipment: {
        weapon: null,
        armor: null,
        accessory: null
    },

    // Đội hình & Chiến đấu
    team: [], // Array of animal IDs
    battleSettings: {
        autoSkill: true,
        usePotionAtHp: 30 // % HP
    },

    // Tính năng mới
    nekodex: [], // Danh sách ID loài đã từng sở hữu (Collection Log)

    // Auto Hunt (AFK)
    autoHuntStartTime: 0, // Timestamp khi bắt đầu AFK, 0 là tắt
    lastAutoHuntClaim: 0,

    // Cooldowns
    lastHuntTime: 0,
    lastBattleTime: 0,
    battlesWon: 0,
    battlesLost: 0
});

// Helper tính chỉ số tổng (Base + Equipment)
function getPlayerTotalStats(playerData) {
    let base = { ...playerData.stats };

    if (playerData.equipment.weapon) {
        const wItem = itemsDb.find(i => i.id === playerData.equipment.weapon);
        if (wItem && wItem.stats) {
            if (wItem.stats.str) base.str += wItem.stats.str;
            if (wItem.stats.hp) base.hp += wItem.stats.hp;
            if (wItem.stats.def) base.def = (base.def || 0) + wItem.stats.def;
        }
    }

    if (playerData.equipment.armor) {
        const aItem = itemsDb.find(i => i.id === playerData.equipment.armor);
        if (aItem && aItem.stats) {
            if (aItem.stats.str) base.str += aItem.stats.str;
            if (aItem.stats.hp) base.hp += aItem.stats.hp;
            if (aItem.stats.def) base.def = (base.def || 0) + aItem.stats.def;
        }
    }

    return base;
}

const model = new SQLiteModel('rpg_players', 'userId', defaultData);
model.getPlayerTotalStats = getPlayerTotalStats;

module.exports = model;
