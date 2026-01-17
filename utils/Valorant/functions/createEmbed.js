const { EmbedBuilder } = require('discord.js');

// Used for mullti-page embeds
const createEmbed = (title, fields, author) => {
  const color = global.config?.EmbedColor || '#FF4655';
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setAuthor(author)
    .setThumbnail(author.iconURL)
    .addFields(fields);
};

module.exports = { createEmbed };
