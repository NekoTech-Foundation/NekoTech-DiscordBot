const mongoose = require('mongoose');

const UmaPlayerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  coins: { type: Number, default: 0 },
  carrots: { type: Number, default: 0 },
  energy: { type: Number, default: 100 }, // Max energy
  trainingTickets: { type: Number, default: 5 },
  lastTrain: { type: Date, default: 0 },
  favoriteUma: { type: mongoose.Schema.Types.ObjectId, ref: 'UmaMusume' },
  daily: { type: Date, default: 0 },
  umas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UmaMusume' }],
  defenseTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UmaMusume' }],
});

module.exports = mongoose.model('UmaPlayer', UmaPlayerSchema);
