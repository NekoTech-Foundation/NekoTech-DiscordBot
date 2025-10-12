const mongoose = require('mongoose');
const { Schema } = mongoose;

const applicationSchema = new Schema({
    userId: { type: String, required: true },
    channelId: { type: String },
    responses: { type: [String], default: [] },
    decisionTimestamp: { type: Number, default: null },
    status: { type: String, default: 'Open' },
});

applicationSchema.pre('find', function(next) {
  this.populate('createdBy', 'username')
      .populate('claimedBy', 'username')
  next()
})

applicationSchema.pre('findOne', function(next) {
  this.populate('createdBy', 'username')
      .populate('claimedBy', 'username')
  next()
})

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;