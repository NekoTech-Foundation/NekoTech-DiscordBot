const mongoose = require('mongoose');

const InvSchema = new mongoose.Schema({
  memberid: { type: String, required: true },
  name: { type: String, required: true },
});

module.exports = mongoose.model('Inventory', InvSchema);
