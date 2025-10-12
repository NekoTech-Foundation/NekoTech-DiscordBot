const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    interactionId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    address: { type: String, required: true },
    qrCodeURL: { type: String, required: true }
});

module.exports = mongoose.model('Transaction', transactionSchema);