const { EmbedBuilder } = require('discord.js');

function truncate(text, max = 500) {
  if (!text) return 'N/A';
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

function colorForType(type) {
  switch ((type || '').toLowerCase()) {
    case 'tv': return 0x4D96FF;
    case 'movie': return 0x00B894;
    case 'ova': return 0x9B59B6;
    case 'special': return 0xE67E22;
    case 'music': return 0xFF7675;
    case 'ona': return 0xFD79A8;
    case 'manga': return 0x2ECC71;
    case 'novel': return 0xF1C40F;
    case 'oneshot': return 0xE17055;
    case 'doujin': return 0xA29BFE;
    case 'manhwa': return 0x0984E3;
    case 'manhua': return 0xD63031;
    default: return 0x34495E;
  }
}

function formatNumber(num) {
  return num != null ? num.toLocaleString('en-US') : 'N/A';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getSafeList(arr, prop = 'name', limit = 5) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return 'N/A';
  const mapping = arr.map(i => i[prop]);
  if (mapping.length <= limit) return mapping.join(', ');
  return mapping.slice(0, limit).join(', ') + ` (+${mapping.length - limit} more)`;
}

function animeEmbed(anime, opts = {}) {
  const e = new EmbedBuilder()
    .setTitle(`${anime.title || anime.title_english || 'Anime'} ${anime.year ? `(${anime.year})` : ''}`)
    .setURL(anime.url || `https://myanimelist.net/anime/${anime.mal_id}`)
    .setColor(colorForType(anime.type))
    .setThumbnail(anime.images?.jpg?.image_url || anime.images?.webp?.image_url)
    .setImage(anime.trailer?.images?.maximum_image_url || anime.trailer?.images?.large_image_url || null)
    .setTimestamp();

  if (opts.footerText) e.setFooter({ text: opts.footerText });

  const desc = typeof opts.description === 'string' ? opts.description : anime.synopsis;
  e.setDescription(truncate(desc, 1024));

  // Basic Info
  e.addFields(
    { name: '⭐ Điểm', value: `${anime.score || 'N/A'} (by ${formatNumber(anime.scored_by)} users)`, inline: true },
    { name: '🏆 Hạng', value: `#${anime.rank || 'N/A'}`, inline: true },
    { name: '🔥 Phổ biến', value: `#${anime.popularity || 'N/A'}`, inline: true },
    { name: '📺 Loại', value: `${anime.type || 'N/A'} (${anime.episodes || '?'} eps)`, inline: true },
    { name: '📡 Trạng thái', value: anime.status || 'N/A', inline: true },
    { name: '⏱️ Thời lượng', value: anime.duration || 'N/A', inline: true },
    { name: '🗓️ Phát sóng', value: anime.aired?.string || 'N/A', inline: false },
    { name: '🏢 Studio', value: getSafeList(anime.studios), inline: true },
    { name: '🎭 Thể loại', value: getSafeList(anime.genres), inline: true },
    { name: '🔞 Rating', value: anime.rating || 'N/A', inline: true }
  );
  
  // Extra stats if space permits
  if (anime.members) e.addFields({ name: '👥 Thành viên', value: formatNumber(anime.members), inline: true });
  if (anime.favorites) e.addFields({ name: '❤️ Yêu thích', value: formatNumber(anime.favorites), inline: true });

  if (anime.trailer?.url) {
    e.addFields({ name: '🎬 Trailer', value: `[Xem trên YouTube](${anime.trailer.url})`, inline: true });
  }

  return e;
}

function mangaEmbed(manga, opts = {}) {
  const e = new EmbedBuilder()
    .setTitle(`${manga.title || manga.title_english || 'Manga'} ${manga.published?.from ? `(${new Date(manga.published.from).getFullYear()})` : ''}`)
    .setURL(manga.url || `https://myanimelist.net/manga/${manga.mal_id}`)
    .setColor(colorForType(manga.type))
    .setThumbnail(manga.images?.jpg?.image_url || manga.images?.webp?.image_url)
    .setTimestamp();

  if (opts.footerText) e.setFooter({ text: opts.footerText });

  const desc = typeof opts.description === 'string' ? opts.description : manga.synopsis;
  e.setDescription(truncate(desc, 1024));

  e.addFields(
    { name: '⭐ Điểm', value: `${manga.score || 'N/A'} (by ${formatNumber(manga.scored_by)} users)`, inline: true },
    { name: '🏆 Hạng', value: `#${manga.rank || 'N/A'}`, inline: true },
    { name: '🔥 Phổ biến', value: `#${manga.popularity || 'N/A'}`, inline: true },
    { name: '📚 Loại', value: `${manga.type || 'N/A'}`, inline: true },
    { name: '📖 Vol/Chapt', value: `Vol: ${manga.volumes || '?'} | Ch: ${manga.chapters || '?'}`, inline: true },
    { name: '📡 Trạng thái', value: manga.status || 'N/A', inline: true },
    { name: '🗓️ Xuất bản', value: manga.published?.string || 'N/A', inline: false },
    { name: '✍️ Tác giả', value: getSafeList(manga.authors), inline: true }, // Authors often have {name, url}
    { name: '🎭 Thể loại', value: getSafeList(manga.genres), inline: true },
    { name: '📰 Tuần san', value: getSafeList(manga.serializations), inline: true }
  );

  return e;
}

function characterEmbed(ch, opts = {}) {
  const e = new EmbedBuilder()
    .setTitle(`${ch.name || 'Character'} ${ch.name_kanji ? `(${ch.name_kanji})` : ''}`)
    .setURL(ch.url || `https://myanimelist.net/character/${ch.mal_id}`)
    .setColor(0xFF69B4)
    .setThumbnail(ch.images?.jpg?.image_url)
    .setTimestamp();

  if (opts.footerText) e.setFooter({ text: opts.footerText });

  const desc = typeof opts.description === 'string' ? opts.description : ch.about;
  e.setDescription(truncate(desc, 2048));

  if (ch.nicknames && ch.nicknames.length > 0) {
    e.addFields({ name: 'Biệt danh', value: ch.nicknames.join(', '), inline: true });
  }
  if (ch.favorites) {
    e.addFields({ name: '❤️ Yêu thích', value: formatNumber(ch.favorites), inline: true });
  }

  return e;
}

function listEmbed({ title, items, page, totalPages }) {
  const description = items && items.length > 0 ? items.join('\n') : 'Không có dữ liệu hiển thị.';
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: `Trang ${page}/${totalPages}` })
    .setColor(0x3498DB)
    .setTimestamp();
}

module.exports = {
  truncate,
  animeEmbed,
  mangaEmbed,
  characterEmbed,
  listEmbed,
};
