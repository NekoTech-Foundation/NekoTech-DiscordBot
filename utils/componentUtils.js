const {
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonStyle
} = require('discord.js');

module.exports = {
    // Utility to parse Layout JSON structure and return DJS payload options
    // Layout JSON structure example:
    // [
    //   { type: 'content', content: 'Hello World' },
    //   { type: 'action_row', components: [ { type: 'button', id: 'born_btn' } ] }
    // ]
    
    // Actually, based on User Request, Layout has specific components:
    // Text Display, Button, Select, Separator, Section, Media Gallery, Container.
    
    // buildLayout Payload
};
