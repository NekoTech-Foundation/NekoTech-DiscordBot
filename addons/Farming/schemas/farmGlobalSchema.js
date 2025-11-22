const mongoose = require('mongoose');

const farmGlobalSchema = new mongoose.Schema({
    identifier: { type: String, required: true, default: 'global' }, // Singleton
    currentWeather: { type: Object, default: null },
    weatherStartTime: { type: Date, default: Date.now },
    weatherEndTime: { type: Date, default: () => Date.now() + 3600000 } // Default 1 hour
});

module.exports = mongoose.model('farmGlobalSchema', farmGlobalSchema);
