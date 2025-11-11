const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const UI = require('./ui');

const api = axios.create({ baseURL: 'https://api.jikan.moe/v4', timeout: 10000 });

async function jikanGet(path, params = {}) {
  try {
    const { data } = await api.get(path, { params });
    return data;
  } catch (err) {
    if (err.response && err.response.status === 429) {
      await new Promise(r => setTimeout(r, 1000));
      const { data } = await api.get(path, { params });
      return data;
    }
    throw err;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anime')
    .setDescription('Thông tin Anime/Manga (Jikan)')
    .addSubcommand(sc =>
      sc.setName('search')
        .setDescription('Tìm kiếm anime')
        .addStringOption(o => o.setName('q').setDescription('Từ khóa').setRequired(true))
        .addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1))
    )
    .addSubcommand(sc =>
      sc.setName('top')
        .setDescription('Top anime')
        .addStringOption(o =>
          o.setName('type')
            .setDescription('Thể loại')
            .addChoices(
              { name: 'Tất cả', value: 'all' },
              { name: 'TV', value: 'tv' },
              { name: 'Movie', value: 'movie' },
              { name: 'OVA', value: 'ova' },
              { name: 'Special', value: 'special' },
              { name: 'ONA', value: 'ona' }
            )
        )
        .addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1))
    )
    .addSubcommand(sc =>
      sc.setName('season')
        .setDescription('Anime theo mùa')
        .addIntegerOption(o => o.setName('year').setDescription('Năm'))
        .addStringOption(o =>
          o.setName('season')
            .setDescription('Mùa')
            .addChoices(
              { name: 'mùa đông', value: 'winter' },
              { name: 'mùa xuân', value: 'spring' },
              { name: 'mùa hè', value: 'summer' },
              { name: 'mùa thu', value: 'fall' }
            )
        )
        .addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1))
    )
    .addSubcommand(sc => sc.setName('random').setDescription('Anime ngẫu nhiên'))
    .addSubcommand(sc =>
      sc.setName('character')
        .setDescription('Tìm nhân vật')
        .addStringOption(o => o.setName('q').setDescription('Tên nhân vật').setRequired(true))
        .addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1))
    )
    .addSubcommand(sc =>
      sc.setName('schedule')
        .setDescription('Lịch phát sóng theo ngày')
        .addStringOption(o =>
          o.setName('day')
            .setDescription('Ngày trong tuần')
            .addChoices(
              { name: 'thứ hai', value: 'monday' },
              { name: 'thứ ba', value: 'tuesday' },
              { name: 'thứ tư', value: 'wednesday' },
              { name: 'thứ năm', value: 'thursday' },
              { name: 'thứ sáu', value: 'friday' },
              { name: 'thứ bảy', value: 'saturday' },
              { name: 'chủ nhật', value: 'sunday' }
            )
        )
        .addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1))
    )
    .addSubcommand(sc =>
      sc.setName('top_range')
        .setDescription('Top anime theo khoảng thời gian')
        .addStringOption(o =>
          o.setName('range')
            .setDescription('Khoảng thời gian')
            .addChoices(
              { name: 'tuần', value: 'week' },
              { name: 'tháng', value: 'month' }
            )
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName('order_by')
            .setDescription('Chỉ số xếp hạng')
            .addChoices(
              { name: 'thành viên (phổ biến)', value: 'members' },
              { name: 'điểm', value: 'score' }
            )
        )
        .addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'search') return await handleSearch(interaction);
      if (sub === 'top') return await handleTop(interaction);
      if (sub === 'season') return await handleSeason(interaction);
      if (sub === 'random') return await handleRandom(interaction);
      if (sub === 'character') return await handleCharacter(interaction);
      if (sub === 'schedule') return await handleSchedule(interaction);
      if (sub === 'top_range') return await handleTopRange(interaction);
    } catch (e) {
      console.error('[Jikan] command error:', e?.response?.data || e);
      if (!interaction.deferred && !interaction.replied) return interaction.reply({ content: 'Đã xảy ra lỗi khi gọi Jikan API.', ephemeral: true });
      return interaction.editReply({ content: 'Đã xảy ra lỗi khi gọi Jikan API.' });
    }
  }
};

async function handleSearch(interaction) {
  const q = interaction.options.getString('q');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();
  const data = await jikanGet('/anime', { q, page });
  const items = (data.data || []).slice(0, 10);
  if (items.length === 0) return interaction.editReply('Không tìm thấy anime phù hợp.');
  const lines = items.map((a, idx) => `• ${((page - 1) * 10) + idx + 1}. [${a.title}](${a.url}) - ${a.type || '-'} | ★ ${a.score ?? '-'} | EP ${a.episodes ?? '-'}${a.year ? ' | ' + a.year : ''}`);
  const embed = UI.listEmbed({ title: `Kết quả tìm kiếm: "${q}"`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleTop(interaction) {
  const type = interaction.options.getString('type') || 'all';
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();
  const params = { page };
  if (type && type !== 'all') params.type = type;
  const data = await jikanGet('/top/anime', params);
  const items = (data.data || []).slice(0, 10);
  const lines = items.map(a => `#${a.rank ?? '?'} • [${a.title}](${a.url}) - ${a.type || '-'} | ★ ${a.score ?? '-'} | ${a.year ?? ''}`);
  const embed = UI.listEmbed({ title: `Top Anime (${type})`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleSeason(interaction) {
  const year = interaction.options.getInteger('year');
  const season = interaction.options.getString('season');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();
  let path = '/seasons/now';
  if (year && season) path = `/seasons/${year}/${season}`;
  const data = await jikanGet(path, { page });
  const items = (data.data || []).slice(0, 10);
  const lines = items.map((a, idx) => `• ${((page - 1) * 10) + idx + 1}. [${a.title}](${a.url}) - ${a.type || '-'} | ${a.season || ''} ${a.year || ''}`.trim());
  const title = year && season ? `Season ${season} ${year}` : 'Season hiện tại';
  const embed = UI.listEmbed({ title, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleRandom(interaction) {
  await interaction.deferReply();
  const data = await jikanGet('/random/anime');
  const anime = data.data;
  try {
    const { translateText } = require('../Translator/translatorUtils');
    if (anime?.synopsis) {
      const descVi = await translateText(anime.synopsis, 'vi', 'auto');
      const description = (descVi || anime.synopsis);
      const footerText = descVi ? 'Bản dịch được thực hiện bởi Google Translate' : undefined;
      const embedTranslated = UI.animeEmbed(anime, { description, footerText });
      let components = [];
      if (anime?.mal_id) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`jikan_lang_anime_vi_${anime.mal_id}`).setLabel('Tiếng Việt').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`jikan_lang_anime_en_${anime.mal_id}`).setLabel('English').setStyle(ButtonStyle.Secondary)
        );
        components = [row];
      }
      return interaction.editReply({ embeds: [embedTranslated], components });
    }
  } catch {}
  const embed = UI.animeEmbed(anime);
  let components2 = [];
  if (anime?.mal_id) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`jikan_lang_anime_vi_${anime.mal_id}`).setLabel('Tiếng Việt').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`jikan_lang_anime_en_${anime.mal_id}`).setLabel('English').setStyle(ButtonStyle.Primary)
    );
    components2 = [row];
  }
  return interaction.editReply({ embeds: [embed], components: components2 });
}

async function handleCharacter(interaction) {
  const q = interaction.options.getString('q');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();
  const data = await jikanGet('/characters', { q, page });
  const items = (data.data || []).slice(0, 10);
  if (items.length === 0) return interaction.editReply('Không tìm thấy nhân vật phù hợp.');

  // Fetch full character details to get biography/about
  const target = items[0];
  let full;
  try {
    if (target?.mal_id) full = await jikanGet(`/characters/${target.mal_id}/full`);
  } catch {}
  let ch = full?.data || target;
  // Fallback: try non-full endpoint if needed
  if (!ch?.about && target?.mal_id) {
    try {
      const basic = await jikanGet(`/characters/${target.mal_id}`);
      if (basic?.data) ch = { ...ch, ...basic.data };
    } catch {}
  }

  try {
    const about = (ch?.about || '').toString().trim();
    if (about) {
      let finalDesc = about;
      try {
        const { translateText } = require('../Translator/translatorUtils');
        const aboutVi = await translateText(about, 'vi', 'auto');
        finalDesc = aboutVi || about; // always prefer Vietnamese when available
      } catch {}
      // Clamp to Discord embed description limit (~4096), keep some headroom
      if (finalDesc.length > 3900) {
        finalDesc = finalDesc.slice(0, 3890) + '…';
      }
      const embedVi = UI.characterEmbed(ch, { description: finalDesc, footerText: 'Bản dịch bởi Google Translate' });
      let components = [];
      if (ch?.mal_id) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`jikan_lang_character_vi_${ch.mal_id}`).setLabel('Tiếng Việt').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`jikan_lang_character_en_${ch.mal_id}`).setLabel('English').setStyle(ButtonStyle.Secondary)
        );
        components = [row];
      }
      return interaction.editReply({ embeds: [embedVi], components });
    }
  } catch {}
  const embed = UI.characterEmbed(ch);
  let components2 = [];
  if (ch?.mal_id) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`jikan_lang_character_vi_${ch.mal_id}`).setLabel('Tiếng Việt').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`jikan_lang_character_en_${ch.mal_id}`).setLabel('English').setStyle(ButtonStyle.Primary)
    );
    components2 = [row];
  }
  return interaction.editReply({ embeds: [embed], components: components2 });
}

async function handleSchedule(interaction) {
  const day = interaction.options.getString('day');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();
  const data = await jikanGet('/schedules', { filter: day, page });
  const items = (data.data || []).slice(0, 10);
  const lines = items.map((a, idx) => `• ${((page - 1) * 10) + idx + 1}. [${a.title}](${a.url}) - ${a.broadcast?.string || 'N/A'}`);
  const embed = UI.listEmbed({ title: `Lịch phát sóng${day ? ' - ' + day : ''}`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleTopRange(interaction) {
  const range = interaction.options.getString('range');
  const orderBy = interaction.options.getString('order_by') || 'members';
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();

  const now = new Date();
  const start = new Date(now);
  if (range === 'week') start.setDate(start.getDate() - 7);
  else start.setDate(start.getDate() - 30);

  const toDate = now.toISOString().slice(0, 10);
  const fromDate = start.toISOString().slice(0, 10);

  const params = {
    start_date: fromDate,
    end_date: toDate,
    order_by: orderBy,
    sort: 'desc',
    page,
  };
  const data = await jikanGet('/anime', params);
  const items = (data.data || []).slice(0, 10);
  if (items.length === 0) return interaction.editReply('Không có dữ liệu cho khoảng thời gian này.');
  const orderLabel = orderBy === 'members' ? '👥' : '★';
  const lines = items.map((a, idx) => `• ${((page - 1) * 10) + idx + 1}. [${a.title}](${a.url}) - ${a.type || '-'} | ${orderLabel} ${orderBy === 'members' ? (a.members ?? '-') : (a.score ?? '-')}`);
  const title = `Top anime theo ${range} (theo ${orderBy})`;
  const embed = UI.listEmbed({ title, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}
