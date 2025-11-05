const mongoose = require('mongoose');

const UmaMusumeSchema = new mongoose.Schema({
  ownerId: { type: String, required: true },
  name: { type: String, required: true },
  tier: { type: Number, required: true }, // 1, 2, or 3 star
  stats: {
    speed: { type: Number, default: 0 },
    stamina: { type: Number, default: 0 },
    power: { type: Number, default: 0 },
    guts: { type: Number, default: 0 },
    wit: { type: Number, default: 0 },
  },
  trackAptitude: {
    turf: { type: String, default: 'G' },
    dirt: { type: String, default: 'G' },
  },
  distanceAptitude: {
    sprint: { type: String, default: 'G' },
    mile: { type: String, default: 'G' },
    medium: { type: String, default: 'G' },
    long: { type: String, default: 'G' },
  },
  strategyAptitude: {
    runner: { type: String, default: 'G' },
    leader: { type: String, default: 'G' },
    betweener: { type: String, default: 'G' },
    chaser: { type: String, default: 'G' },
  },
  growthRate: {
    speed: { type: Number, default: 0 },
    stamina: { type: Number, default: 0 },
    power: { type: Number, default: 0 },
    guts: { type: Number, default: 0 },
    wit: { type: Number, default: 0 },
  },
  skillPoints: { type: Number, default: 0 },
  skills: [{ type: String }],
  retired: { type: Boolean, default: false },
});

module.exports = mongoose.model('UmaMusume', UmaMusumeSchema);
