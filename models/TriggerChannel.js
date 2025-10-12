const mongoose = require('mongoose');

const TriggerChannelSchema = new mongoose.Schema({
    triggerChannelId: String,
    namePattern: String,
    categoryId: String,
});

module.exports = mongoose.model('TriggerChannel', TriggerChannelSchema);