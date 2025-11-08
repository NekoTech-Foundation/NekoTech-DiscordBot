const { Schema, model } = require('mongoose');

const greetingsSchema = new Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
    },
    welcomeChannel: {
        type: String,
        default: null,
    },
    welcomeMessage: {
        type: String,
        default: null,
    },
    goodbyeChannel: {
        type: String,
        default: null,
    },
    goodbyeMessage: {
        type: String,
        default: null,
    },
});

module.exports = model('Greetings', greetingsSchema);
