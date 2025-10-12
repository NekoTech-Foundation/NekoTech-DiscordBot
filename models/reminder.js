const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: String,
    channelId: String,
    message: String,
    reminderTime: Date,
    sent: Boolean
});

const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);

module.exports = Reminder;