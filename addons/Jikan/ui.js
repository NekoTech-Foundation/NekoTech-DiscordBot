const { EmbedBuilder } = require('discord.js');

function truncate(text, max = 300) {
  if (!text) return '-';
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

function colorForType(type) {
  switch ((type || '').toLowerCase()) {
    case 'tv': return 0x4D96FF;
    case 'movie': return 0x00B894;
    case 'ova': return 0x9B59B6;
    case 'special': return 0xE67E22;
    default: return 0x2ECC71;
  }
}

function animeEmbed(anime, opts = {}) {
  const e = new EmbedBuilder()
    .setTitle(`${anime.title || anime.title_english || anime.title_japanese || 'Anime'}`)
    .setURL(anime.url || `https://myanimelist.net/anime/${anime.mal_id}`)
    .setColor(colorForType(anime.type))
    .setDescription(typeof opts.description === 'string' ? opts.description : truncate(anime.synopsis))
    .addFields(
      { name: 'Loại', value: `${anime.type || '-'}`, inline: true },
      { name: 'Điểm', value: anime.score != null ? `${anime.score}` : '-', inline: true },
      { name: 'Hạng', value: anime.rank != null ? `#${anime.rank}` : '-', inline: true },
      { name: 'Tập', value: anime.episodes != null ? `${anime.episodes}` : '-', inline: true },
      { name: 'Trạng thái', value: anime.status || '-', inline: true },
      { name: 'Năm/Mùa', value: `${anime.year || '-'} ${anime.season || ''}`.trim() || '-', inline: true }
    )
    .setTimestamp();
  const image = anime.images?.jpg?.image_url || anime.images?.webp?.image_url;
  if (image) e.setThumbnail(image);
  return e;
}

function characterEmbed(ch, opts = {}) {
  const e = new EmbedBuilder()
    .setTitle(ch.name || 'Character')
    .setURL(ch.url || `https://myanimelist.net/character/${ch.mal_id}`)
    .setColor(0xFF69B4)
    .setDescription(typeof opts.description === 'string' ? opts.description : truncate(ch.about))
    .setTimestamp();
  const image = ch.images?.jpg?.image_url;
  if (image) e.setThumbnail(image);
  return e;
}

function listEmbed({ title, items, page, totalPages }) {
  const e = new EmbedBuilder()
    .setTitle(title)
    .setDescription(items.join('\n'))
    .setFooter({ text: `Trang ${page}/${totalPages}` })
    .setColor(0x3498DB)
    .setTimestamp();
  return e;
}

module.exports = {
  truncate,
  animeEmbed,
  characterEmbed,
  listEmbed,
};
