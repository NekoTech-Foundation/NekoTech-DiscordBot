const mongoose = require('mongoose');

const merchantQRSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true, unique: true },
  method: { type: String, default: 'vietqr' }, // vietqr | zalopay_qr | other
  label: { type: String, default: 'Merchant QR' },
  imageUrl: { type: String, required: true },
  updatedBy: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('MerchantQR', merchantQRSchema);

