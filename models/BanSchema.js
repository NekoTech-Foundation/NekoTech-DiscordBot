const mongoose = require('mongoose');

const BanSchema = new mongoose.Schema({
  memberid: { type: String, required: true },
});

module.exports = mongoose.model('Ban', BanSchema);
