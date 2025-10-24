const mongoose = require('mongoose');

const TicketQuestionSchema = new mongoose.Schema({
    label: { type: String, required: true },
    placeholder: { type: String, default: null },
    style: { type: String, enum: ['Short', 'Paragraph'], default: 'Short' },
    required: { type: Boolean, default: true },
    minLength: { type: Number, default: 1 },
    maxLength: { type: Number, default: 1000 },
});

const TicketCategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    channelName: { type: String, default: 'ticket-{user}-{id}' },
    categoryId: { type: String, required: true },
    supportRoles: [{ type: String }],
    questions: [TicketQuestionSchema],
});

const TicketPanelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: null },
    embed: {
        title: { type: String, default: 'Ticket Panel' },
        description: { type: String, default: 'Select a category to open a ticket.' },
        color: { type: String, default: '#0099ff' },
    },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TicketCategory' }],
});

const GuildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    logChannels: {
        type: Map,
        of: String,
        default: new Map()
    },
    welcome: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        message: { type: String, default: 'Welcome {user} to {guildName}!' }
    },
    leave: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        message: { type: String, default: '{user} has left the server.' }
    },
    tickets: {
        panels: [TicketPanelSchema],
        categories: [TicketCategorySchema],
    }
});

module.exports = mongoose.model('GuildSettings', GuildSettingsSchema);