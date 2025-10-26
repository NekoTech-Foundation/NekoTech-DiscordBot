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

const EconomyUserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0, index: true },
    bank: { type: Number, default: 0, index: true },
    inventory: [InventoryItemSchema],
    boosters: [BoosterSchema],
    commandData: { type: CommandDataSchema, default: () => ({}) },
    interestRate: { type: Number, default: null },
    purchasedItems: [{
        itemId: { type: String, required: true },
        quantity: { type: Number, default: 0 }
    }],
    transactionLogs: [TransactionLogSchema],
    equipment: { type: EquipmentSchema, default: () => ({}) }
});

module.exports = mongoose.model('EconomyUserData', EconomyUserSchema);