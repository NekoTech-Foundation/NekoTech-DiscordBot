const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  sessionId: String,
  session: Object,
  expires: Date
}, { timestamps: true });

SessionSchema.index({ sessionId: 1 });
SessionSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', SessionSchema); 