const mongoose = require('mongoose');

const SequenceSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    value: { type: Number, required: true }
});

const Sequence = mongoose.model('Sequence', SequenceSchema);

module.exports = Sequence;