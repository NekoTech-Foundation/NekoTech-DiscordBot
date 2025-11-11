const mongoose = require('mongoose');

const UserSupportCardSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  cardId: { type: String, required: true },
  name: { type: String, required: true },
  character: { type: String, required: true },
  rarity: { type: String, enum: ['SSR','SR','R'], required: true },
  type: { type: String, enum: ['speed','stamina','power','guts','wisdom','wit','wisdom'], required: true },
  trainingBoost: {
    speed: { type: Number, default: 0 },
    stamina: { type: Number, default: 0 },
    power: { type: Number, default: 0 },
    guts: { type: Number, default: 0 },
    wisdom: { type: Number, default: 0 },
    wit: { type: Number, default: 0 }
  },
  level: { type: Number, default: 1 },
  obtainedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserSupportCard', UserSupportCardSchema);

