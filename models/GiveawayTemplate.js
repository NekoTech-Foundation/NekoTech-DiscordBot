const mongoose = require('mongoose');

const giveawayTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  embed: {
    color: { type: String, default: '#2ecc71' },
    image: { type: String, default: '' },
    button: {
      style: { type: String, default: 'Primary' },
      emoji: { type: String, default: '🎉' },
      label: { type: String, default: 'Tham gia' }
    }
  },
  defaults: {
    winners: { type: Number, default: 1 },
    durationSec: { type: Number, default: 600 },
    requirements: {
      whitelistRoles: [String],
      blacklistRoles: [String],
      bypassRoles: [String],
      requiresJoinBeforeSec: { type: Number, default: 0 }
    },
    multipliers: [{ roleId: String, bonus: Number }]
  }
});

module.exports = mongoose.model('giveaway_templates', giveawayTemplateSchema);

