const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: String,
    quantity: Number,
    type: String
});

const farmSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: [itemSchema]
});

module.exports = mongoose.model('farmSchema', farmSchema);
