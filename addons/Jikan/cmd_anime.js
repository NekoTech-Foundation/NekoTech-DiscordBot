const { SlashCommandBuilder } = require('discord.js');
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
    .setDescription('Anime/Manga via Jikan API')
    .addSubcommand(sc => sc.setName('search').setDescription('Search anime')
      .addStringOption(o => o.setName('q').setDescription('Query').setRequired(true))
      .addIntegerOption(o => o.setName('page').setDescription('Page').setMinValue(1)))
    .addSubcommand(sc => sc.setName('top').setDescription('Top anime')
      .addStringOption(o => o.setName('type').setDescription('Type').addChoices(
        { name: 'All', value: 'all' }, { name: 'TV', value: 'tv' }, { name: 'Movie', value: 'movie' }, { name: 'OVA', value: 'ova' }))
      .addIntegerOption(o => o.setName('page').setDescription('Page').setMinValue(1)))
    .addSubcommand(sc => sc.setName('season').setDescription('Seasonal anime')
      .addIntegerOption(o => o.setName('year').setDescription('Year'))
      .addStringOption(o => o.setName('season').setDescription('Season').addChoices(
        { name: 'winter', value: 'winter' }, { name: 'spring', value: 'spring' }, { name: 'summer', value: 'summer' }, { name: 'fall', value: 'fall' }))
      .addIntegerOption(o => o.setName('page').setDescription('Page').setMinValue(1)))
    .addSubcommand(sc => sc.setName('random').setDescription('Random anime'))
    .addSubcommand(sc => sc.setName('character').setDescription('Search character')
      .addStringOption(o => o.setName('q').setDescription('Name').setRequired(true))
      .addIntegerOption(o => o.setName('page').setDescription('Page').setMinValue(1)))
    .addSubcommand(sc => sc.setName('schedule').setDescription('Airing schedule by day')
      .addStringOption(o => o.setName('day').setDescription('Day').addChoices(
        { name: 'monday', value: 'monday' }, { name: 'tuesday', value: 'tuesday' }, { name: 'wednesday', value: 'wednesday' },
        { name: 'thursday', value: 'thursday' }, { name: 'friday', value: 'friday' }, { name: 'saturday', value: 'saturday' }, { name: 'sunday', value: 'sunday' }))
      .addIntegerOption(o => o.setName('page').setDescription('Page').setMinValue(1)))
    .addSubcommand(sc => sc.setName('top_period').setDescription('Top anime in a time window')
      .addStringOption(o => o.setName('period').setDescription('Period').addChoices(
        { name: 'week', value: 'week' }, { name: 'month', value: 'month' }).setRequired(true))
      .addStringOption(o => o.setName('metric').setDescription('Metric').addChoices(
        { name: 'members (popularity)', value: 'members' }, { name: 'score', value: 'score' }))
      .addIntegerOption(o => o.setName('page').setDescription('Page').setMinValue(1))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'search') return await handleSearch(interaction);
      if (sub === 'top') return await handleTop(interaction);
      if (sub === 'season') return await handleSeason(interaction);
      if (sub === 'random') return await handleRandom(interaction);
      if (sub === 'character') return await handleCharacter(interaction);
      if (sub === 'schedule') return await handleSchedule(interaction);
      if (sub === 'top_period') return await handleTopPeriod(interaction);
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
  const lines = items.map((a, idx) => `• ${((page-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.type || '-'} | ⭐ ${a.score ?? '-'} | EP ${a.episodes ?? '-'}${a.year ? ' | ' + a.year : ''}`);
  const embed = UI.listEmbed({ title: `🔎 Kết quả tìm kiếm: "${q}"`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
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
  const lines = items.map((a) => `#${a.rank ?? '?'} • [${a.title}](${a.url}) — ${a.type || '-'} | ⭐ ${a.score ?? '-'} | ${a.year ?? ''}`);
  const embed = UI.listEmbed({ title: `🏆 Top Anime (${type})`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
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
  const lines = items.map((a, idx) => `• ${((page-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.type || '-'} | ${a.season || ''} ${a.year || ''}`.trim());
  const title = year && season ? `📅 Season ${season} ${year}` : '📅 Season hiện tại';
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
      const embedTranslated = UI.animeEmbed(anime, { description: descVi });
      return interaction.editReply({ embeds: [embedTranslated] });
    }
  } catch {}
  const embed = UI.animeEmbed(anime);
  return interaction.editReply({ embeds: [embed] });
}

async function handleCharacter(interaction) {
  const q = interaction.options.getString('q');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();
  const data = await jikanGet('/characters', { q, page });
  const items = (data.data || []).slice(0, 10);
  if (items.length === 0) return interaction.editReply('Không tìm thấy nhân vật phù hợp.');
  try {
    const ch = items[0];
    if (ch?.about) {
      const { translateText } = require('../Translator/translatorUtils');
      const aboutVi = await translateText(ch.about, 'vi', 'auto');
      const embedVi = UI.characterEmbed(ch, { description: aboutVi });
      return interaction.editReply({ embeds: [embedVi] });
    }
  } catch {}
  const embed = UI.characterEmbed(items[0]);
  return interaction.editReply({ embeds: [embed] });
}

async function handleSchedule(interaction) {
  const day = interaction.options.getString('day');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();
  const data = await jikanGet('/schedules', { filter: day, page });
  const items = (data.data || []).slice(0, 10);
  const lines = items.map((a, idx) => `• ${((page-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.broadcast?.string || 'N/A'}`);
  const embed = UI.listEmbed({ title: `🗓️ Lịch phát sóng${day ? ' - ' + day : ''}`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleTopPeriod(interaction) {
  const period = interaction.options.getString('period');
  const metric = interaction.options.getString('metric') || 'members';
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();

  const now = new Date();
  const start = new Date(now);
  if (period === 'week') start.setDate(start.getDate() - 7);
  else start.setDate(start.getDate() - 30);

  const toDate = now.toISOString().slice(0, 10);
  const fromDate = start.toISOString().slice(0, 10);

  // Use /anime search sorted by metric within date range to approximate weekly/monthly top
  const params = {
    start_date: fromDate,
    end_date: toDate,
    order_by: metric,
    sort: 'desc',
    page,
  };
  const data = await jikanGet('/anime', params);
  const items = (data.data || []).slice(0, 10);
  if (items.length === 0) return interaction.editReply('Không có dữ liệu cho khoảng thời gian này.');
  const metricLabel = metric === 'members' ? '👥' : '⭐';
  const lines = items.map((a, idx) => `• ${((page-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.type || '-'} | ${metricLabel} ${metric === 'members' ? (a.members ?? '-') : (a.score ?? '-')}`);
  const title = `📈 Top anime theo ${period} (theo ${metric})`;
  const embed = UI.listEmbed({ title, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}
