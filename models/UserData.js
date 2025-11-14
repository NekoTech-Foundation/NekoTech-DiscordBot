const mongoose = require('mongoose');

const CommandDataSchema = new mongoose.Schema({
    lastDaily: { type: Date, default: null },
    dailyStreak: { type: Number, default: 0 },
    lastBeg: { type: Date, default: null },
    lastWork: { type: Date, default: null },
    lastCrime: { type: Date, default: null },
    lastBlackjack: { type: Date, default: null },
    lastSlot: { type: Date, default: null },
    lastRob: { type: Date, default: null },
    lastFishing: { type: Date, default: null }
}, { _id: false });

const InventoryItemSchema = new mongoose.Schema({
    itemId: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    isBooster: { type: Boolean, default: false },
    isRank: { type: Boolean, default: false },
    duration: { type: Number, default: 0 },
    multiplier: { type: Number, default: 1.0 },
    roleIds: [{ type: String, default: '' }]
}, { _id: false });

const BoosterSchema = new mongoose.Schema({
    type: { type: String, default: '' },
    endTime: { type: Number, default: 0 },
    multiplier: { type: Number, default: 1.0 }
}, { _id: false });

const TransactionLogSchema = new mongoose.Schema({
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const EquipmentSchema = new mongoose.Schema({
    FishingRod: { type: String, default: null },
    HuntingWeapon: { type: String, default: null }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    xp: { type: Number, default: 0, index: true },
    level: { type: Number, default: 0, index: true },
    prestige: { type: Number, default: 0 },
    warns: { type: Number, default: 0 },
    bans: { type: Number, default: 0 },
    kicks: { type: Number, default: 0 },
    timeouts: { type: Number, default: 0 },
    note: { type: String, default: '' },
    warnings: [{
        reason: { type: String, default: '' },
        date: { type: Date, default: Date.now },
        moderatorId: { type: String, default: '' }
    }],
    totalMessages: { type: Number, default: 0 },
    messages: [{
        content: { type: String, required: false },
        timeSent: { type: Number, default: Date.now }
    }],
    tempBans: [{
        endTime: { type: Date, required: true },
        reason: { type: String, default: '' },
        moderatorId: { type: String, default: '' },
        lifted: { type: Boolean, default: false }
    }],
    balance: { type: Number, default: 0, index: true },
    bank: { type: Number, default: 0, index: true },
    inventory: [InventoryItemSchema],
    boosters: [BoosterSchema],
    commandData: { type: CommandDataSchema, default: () => ({}) },
    isMuted: { type: Boolean, default: false },
    interestRate: { type: Number, default: null },
    purchasedItems: [{
        itemId: { type: String, required: true },
        quantity: { type: Number, default: 0 }
    }],
    transactionLogs: [TransactionLogSchema],
    roles: [{ type: String }],
    equipment: { type: EquipmentSchema, default: () => ({}) },
    rankTheme: { type: String, default: null }
});

UserSchema.index({ userId: 1, guildId: 1 });
UserSchema.index({ level: 1, xp: -1 });

module.exports = mongoose.model('UserData', UserSchema);
