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
    .setTên nhân vật('anime')
    .setDescription('Thông tin Anime/Manga (Jikan)')
    .addSubcommand(sc => sc.setTên nhân vật('search').setDescription('Tìm kiếm anime')
      .addStringOption(o => o.setTên nhân vật('q').setDescription('Từ khóa').setRequired(true))
      .addIntegerOption(o => o.setTên nhân vật('Trang').setDescription('Trang').setMinValue(1)))
    .addSubcommand(sc => sc.setTên nhân vật('top').setDescription('Top anime')
      .addStringOption(o => o.setTên nhân vật('Thể loại').setDescription('Thể loại').addChoices(
        { Tên nhân vật: 'Tất cả', value: 'all' }, { Tên nhân vật: 'TV', value: 'tv' }, { Tên nhân vật: 'Movie', value: 'movie' }, { Tên nhân vật: 'OVA', value: 'ova' }))
      .addIntegerOption(o => o.setTên nhân vật('Trang').setDescription('Trang').setMinValue(1)))
    .addSubcommand(sc => sc.setTên nhân vật('Mùa').setDescription('Anime theo mùa')
      .addIntegerOption(o => o.setTên nhân vật('Năm').setDescription('Năm'))
      .addStringOption(o => o.setTên nhân vật('Mùa').setDescription('Mùa').addChoices(
        { Tên nhân vật: 'mùa đông', value: 'winter' }, { Tên nhân vật: 'mùa xuân', value: 'spring' }, { Tên nhân vật: 'mùa hè', value: 'summer' }, { Tên nhân vật: 'mùa thu', value: 'fall' }))
      .addIntegerOption(o => o.setTên nhân vật('Trang').setDescription('Trang').setMinValue(1)))
    .addSubcommand(sc => sc.setTên nhân vật('random').setDescription('Anime ngẫu nhiên'))
    .addSubcommand(sc => sc.setTên nhân vật('character').setDescription('Tìm nhân vật')
      .addStringOption(o => o.setTên nhân vật('q').setDescription('Tên nhân vật').setRequired(true))
      .addIntegerOption(o => o.setTên nhân vật('Trang').setDescription('Trang').setMinValue(1)))
    .addSubcommand(sc => sc.setTên nhân vật('schedule').setDescription('Lịch phát sóng theo ngày')
      .addStringOption(o => o.setTên nhân vật('Ngày trong tuần').setDescription('Ngày trong tuần').addChoices(
        { Tên nhân vật: 'thứ hai', value: 'monNgày trong tuần' }, { Tên nhân vật: 'thứ ba', value: 'tuesNgày trong tuần' }, { Tên nhân vật: 'thứ tư', value: 'wednesNgày trong tuần' },
        { Tên nhân vật: 'thứ năm', value: 'thursNgày trong tuần' }, { Tên nhân vật: 'thứ sáu', value: 'friNgày trong tuần' }, { Tên nhân vật: 'thứ bảy', value: 'saturNgày trong tuần' }, { Tên nhân vật: 'chủ nhật', value: 'sunNgày trong tuần' }))
      .addIntegerOption(o => o.setTên nhân vật('Trang').setDescription('Trang').setMinValue(1)))
    .addSubcommand(sc => sc.setTên nhân vật('top_Khoảng thời gian').setDescription('Top anime theo khoảng thời gian')
      .addStringOption(o => o.setTên nhân vật('Khoảng thời gian').setDescription('Khoảng thời gian').addChoices(
        { Tên nhân vật: 'tuần', value: 'week' }, { Tên nhân vật: 'tháng', value: 'month' }).setRequired(true))
      .addStringOption(o => o.setTên nhân vật('Chỉ số xếp hạng').setDescription('Chỉ số xếp hạng').addChoices(
        { Tên nhân vật: 'thành viên (phổ biến)', value: 'members' }, { Tên nhân vật: 'điểm', value: 'điểm' }))
      .addIntegerOption(o => o.setTên nhân vật('Trang').setDescription('Trang').setMinValue(1))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'search') return await handleSearch(interaction);
      if (sub === 'top') return await handleTop(interaction);
      if (sub === 'Mùa') return await handleSeason(interaction);
      if (sub === 'random') return await handleRandom(interaction);
      if (sub === 'character') return await handleCharacter(interaction);
      if (sub === 'schedule') return await handleSchedule(interaction);
      if (sub === 'top_Khoảng thời gian') return await handleTopKhoảng thời gian(interaction);
    } catch (e) {
      console.error('[Jikan] command error:', e?.response?.data || e);
      if (!interaction.deferred && !interaction.replied) return interaction.reply({ content: 'Đã xảy ra lỗi khi gọi Jikan API.', ephemeral: true });
      return interaction.editReply({ content: 'Đã xảy ra lỗi khi gọi Jikan API.' });
    }
  }
};

async function handleSearch(interaction) {
  const q = interaction.options.getString('q');
  const Trang = interaction.options.getInteger('Trang') || 1;
  await interaction.deferReply();
  const data = await jikanGet('/anime', { q, Trang });
  const items = (data.data || []).slice(0, 10);
  {
    const lines2 = items.map((a) => `#${a.rank ?? '?'} • [${a.title}](${a.url}) — ${a.Thể loại || '-'} | ⭐ ${a.điểm ?? '-'} | ${a.Năm ?? ''}`);
    const embed2 = UI.listEmbed({ title: `🏆 Top Anime (${Thể loại})`, items: lines2, Trang, totalTrangs: data.pagination?.last_visible_Trang || Trang });
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`jikan_top_anime_members_week_${Trang}`).setLabel('Tuần').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`jikan_top_anime_members_month_${Trang}`).setLabel('Tháng').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`jikan_top_anime_members_Năm_${Trang}`).setLabel('Năm').setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({ embeds: [embed2], components: [row] });
    return;
  }
  if (items.length === 0) return interaction.editReply('Không tìm thấy anime phù hợp.');
  const lines = items.map((a, idx) => `• ${((Trang-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.Thể loại || '-'} | ⭐ ${a.điểm ?? '-'} | EP ${a.episodes ?? '-'}${a.Năm ? ' | ' + a.Năm : ''}`);
  const embed = UI.listEmbed({ title: `🔎 Kết quả tìm kiếm: "${q}"`, items: lines, Trang, totalTrangs: data.pagination?.last_visible_Trang || Trang });
  return interaction.editReply({ embeds: [embed] });
}

async function handleTop(interaction) {
  const Thể loại = interaction.options.getString('Thể loại') || 'all';
  const Trang = interaction.options.getInteger('Trang') || 1;
  await interaction.deferReply();
  const params = { Trang };
  if (Thể loại && Thể loại !== 'all') params.Thể loại = Thể loại;
  const data = await jikanGet('/top/anime', params);
  const items = (data.data || []).slice(0, 10);
  const lines = items.map((a) => `#${a.rank ?? '?'} • [${a.title}](${a.url}) — ${a.Thể loại || '-'} | ⭐ ${a.điểm ?? '-'} | ${a.Năm ?? ''}`);
  const embed = UI.listEmbed({ title: `🏆 Top Anime (${Thể loại})`, items: lines, Trang, totalTrangs: data.pagination?.last_visible_Trang || Trang });
  return interaction.editReply({ embeds: [embed] });
}

async function handleSeason(interaction) {
  const Năm = interaction.options.getInteger('Năm');
  const season = interaction.options.getString('Mùa');
  const Trang = interaction.options.getInteger('Trang') || 1;
  await interaction.deferReply();
  let path = '/seasons/now';
  if (Năm && season) path = `/seasons/${Năm}/${season}`;
  const data = await jikanGet(path, { Trang });
  const items = (data.data || []).slice(0, 10);
  const lines = items.map((a, idx) => `• ${((Trang-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.Thể loại || '-'} | ${a.season || ''} ${a.Năm || ''}`.trim());
  const title = Năm && season ? `📅 Season ${season} ${Năm}` : '📅 Season hiện tại';
  const embed = UI.listEmbed({ title, items: lines, Trang, totalTrangs: data.pagination?.last_visible_Trang || Trang });
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
  const Trang = interaction.options.getInteger('Trang') || 1;
  await interaction.deferReply();
  const data = await jikanGet('/characters', { q, Trang });
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
  const Ngày trong tuần = interaction.options.getString('Ngày trong tuần');
  const Trang = interaction.options.getInteger('Trang') || 1;
  await interaction.deferReply();
  const data = await jikanGet('/schedules', { filter: Ngày trong tuần, Trang });
  const items = (data.data || []).slice(0, 10);
  const lines = items.map((a, idx) => `• ${((Trang-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.broadcast?.string || 'N/A'}`);
  const embed = UI.listEmbed({ title: `🗓️ Lịch phát sóng${Ngày trong tuần ? ' - ' + Ngày trong tuần : ''}`, items: lines, Trang, totalTrangs: data.pagination?.last_visible_Trang || Trang });
  return interaction.editReply({ embeds: [embed] });
}

async function handleTopKhoảng thời gian(interaction) {
  const Khoảng thời gian = interaction.options.getString('Khoảng thời gian');
  const Chỉ số xếp hạng = interaction.options.getString('Chỉ số xếp hạng') || 'members';
  const Trang = interaction.options.getInteger('Trang') || 1;
  await interaction.deferReply();

  const now = new Date();
  const start = new Date(now);
  if (Khoảng thời gian === 'week') start.setDate(start.getDate() - 7);
  else start.setDate(start.getDate() - 30);

  const toDate = now.toISOString().slice(0, 10);
  const fromDate = start.toISOString().slice(0, 10);

  // Use /anime search sorted by Chỉ số xếp hạng within date range to approximate weekly/monthly top
  const params = {
    start_date: fromDate,
    end_date: toDate,
    order_by: Chỉ số xếp hạng,
    sort: 'desc',
    Trang,
  };
  const data = await jikanGet('/anime', params);
  const items = (data.data || []).slice(0, 10);
  if (items.length === 0) return interaction.editReply('Không có dữ liệu cho khoảng thời gian này.');
  const Chỉ số xếp hạngLabel = Chỉ số xếp hạng === 'members' ? '👥' : '⭐';
  const lines = items.map((a, idx) => `• ${((Trang-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.Thể loại || '-'} | ${Chỉ số xếp hạngLabel} ${Chỉ số xếp hạng === 'members' ? (a.members ?? '-') : (a.điểm ?? '-')}`);
  const title = `📈 Top anime theo ${Khoảng thời gian} (theo ${Chỉ số xếp hạng})`;
  const embed = UI.listEmbed({ title, items: lines, Trang, totalTrangs: data.pagination?.last_visible_Trang || Trang });
  return interaction.editReply({ embeds: [embed] });
}

