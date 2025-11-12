const mongoose = require('mongoose');

const zaloPayOrderSchema = new mongoose.Schema({
  appTransId: { type: String, required: true, index: true, unique: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  status: { type: String, default: 'created' }, // created, paid, canceled, expired, etc.
  zpTransToken: { type: String, default: '' },
  orderUrl: { type: String, default: '' },
  payUrl: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ZaloPayOrder', zaloPayOrderSchema);

