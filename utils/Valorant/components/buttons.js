const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const buttons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setLabel('Tracker.gg')
    .setURL('https://tracker.gg/valorant')
    .setStyle(ButtonStyle.Link)
);

const helpButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setLabel('Tracker.gg')
    .setURL('https://tracker.gg/valorant')
    .setStyle(ButtonStyle.Link)
);

const voteButton = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setLabel('Help')
    .setStyle(ButtonStyle.Secondary)
    .setCustomId('help_valorant')
);

module.exports = { buttons, helpButtons, voteButton };
