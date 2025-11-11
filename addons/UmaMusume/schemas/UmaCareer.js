const mongoose = require('mongoose');

const UmaCareerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  umaId: { type: mongoose.Schema.Types.ObjectId, ref: 'UmaMusume', required: true },
  isActive: { type: Boolean, default: false },
  currentDay: { type: Number, default: 0 },
  totalTrainingDays: { type: Number, default: 7 },
  totalRaces: { type: Number, default: 10 },
  phase: { type: String, default: 'training', enum: ['training', 'racing', 'completed'] },
  currentRace: { type: Number, default: 0 },
  mood: { type: String, default: 'Normal', enum: ['Worst', 'Bad', 'Normal', 'Good', 'Great'] },
  careerStats: {
    speed: { type: Number, default: 0 },
    stamina: { type: Number, default: 0 },
    power: { type: Number, default: 0 },
    guts: { type: Number, default: 0 },
    wisdom: { type: Number, default: 0 },
  },
  energy: { type: Number, default: 100 },
  skills: [{
    name: { type: String },
    rarity: { type: String },
    cost: { type: Number }
  }],
  raceResults: [{
    raceName: { type: String },
    position: { type: Number },
    totalRacers: { type: Number },
    reward: { type: Number }
  }],
  // Selected support cards for this career run
  supportCards: [{
    cardId: { type: String },
    name: { type: String },
    rarity: { type: String },
    type: { type: String },
    trainingBoost: {
      speed: { type: Number, default: 0 },
      stamina: { type: Number, default: 0 },
      power: { type: Number, default: 0 },
      guts: { type: Number, default: 0 },
      wisdom: { type: Number, default: 0 },
      wit: { type: Number, default: 0 }
    }
  }],
  supportSummary: {
    speed: { type: Number, default: 0 },
    stamina: { type: Number, default: 0 },
    power: { type: Number, default: 0 },
    guts: { type: Number, default: 0 },
    wisdom: { type: Number, default: 0 },
    wit: { type: Number, default: 0 }
  },
  totalWins: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UmaCareer', UmaCareerSchema);
