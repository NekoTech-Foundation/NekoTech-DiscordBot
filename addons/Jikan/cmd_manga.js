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
    .setName('manga')
    .setDescription('Thông tin Manga (Jikan)')
    .addSubcommand(sc => sc.setName('search').setDescription('Tìm kiếm manga')
      .addStringOption(o => o.setName('q').setDescription('Từ khóa').setRequired(true))
      .addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1)))
    .addSubcommand(sc => sc.setName('top').setDescription('Top manga')
      .addStringOption(o => o.setName('type').setDescription('Loại').addChoices(
        { name: 'Tất cả', value: 'all' }, { name: 'Manga', value: 'manga' }, { name: 'Novel', value: 'novel' },
        { name: 'One-shot', value: 'one_shot' }, { name: 'Doujin', value: 'doujin' }, { name: 'Manhwa', value: 'manhwa' }, { name: 'Manhua', value: 'manhua' }))
      .addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1)))
    .addSubcommand(sc => sc.setName('random').setDescription('Manga ngẫu nhiên')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'search') return await handleSearch(interaction);
      if (sub === 'top') return await handleTop(interaction);
      if (sub === 'random') return await handleRandom(interaction);
    } catch (e) {
      console.error('[Jikan][manga] command error:', e?.response?.data || e);
      if (!interaction.deferred && !interaction.replied) return interaction.reply({ content: 'Đã xảy ra lỗi khi gọi Jikan API.', ephemeral: true });
      return interaction.editReply({ content: 'Đã xảy ra lỗi khi gọi Jikan API.' });
    }
  }
};

async function handleSearch(interaction) {
  const q = interaction.options.getString('q');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();
  const data = await jikanGet('/manga', { q, page });
  const items = (data.data || []).slice(0, 10);
  {
    const lines2 = items.map((m) => `#${m.rank ?? '?'} • [${m.title}](${m.url}) — ${m.type || '-'} | ⭐ ${m.score ?? '-'} | Chương ${m.chapters ?? '-'}`);
    const embed2 = UI.listEmbed({ title: `🏆 Top Manga (${type})`, items: lines2, page, totalPages: data.pagination?.last_visible_page || page });
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`jikan_top_manga_members_week_${page}`).setLabel('Tuần').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`jikan_top_manga_members_month_${page}`).setLabel('Tháng').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`jikan_top_manga_members_year_${page}`).setLabel('Năm').setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({ embeds: [embed2], components: [row] });
    return;
  }
  if (items.length === 0) return interaction.editReply('Không tìm thấy manga phù hợp.');
  const lines = items.map((m, idx) => `• ${((page-1)*10)+idx+1}. [${m.title}](${m.url}) — ${m.type || '-'} | ⭐ ${m.score ?? '-'} | Chương ${m.chapters ?? '-'} | Tập ${m.volumes ?? '-'}`);
  const embed = UI.listEmbed({ title: `🔎 Kết quả tìm kiếm manga: "${q}"`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleTop(interaction) {
  const type = interaction.options.getString('type') || 'all';
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();
  const params = { page };
  if (type && type !== 'all') params.type = type;
  const data = await jikanGet('/top/manga', params);
  const items = (data.data || []).slice(0, 10);
  const lines = items.map((m) => `#${m.rank ?? '?'} • [${m.title}](${m.url}) — ${m.type || '-'} | ⭐ ${m.score ?? '-'} | Chương ${m.chapters ?? '-'}`);
  const embed = UI.listEmbed({ title: `🏆 Top Manga (${type})`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleRandom(interaction) {
  await interaction.deferReply();
  const data = await jikanGet('/random/manga');
  const manga = data.data;
  try {
    const { translateText } = require('../Translator/translatorUtils');
    if (manga?.synopsis) {
      const descVi = await translateText(manga.synopsis, 'vi', 'auto');
      const embedT = UI.mangaEmbed(manga, { description: descVi });
      return interaction.editReply({ embeds: [embedT] });
    }
  } catch {}
  const embed = UI.mangaEmbed(manga);
  return interaction.editReply({ embeds: [embed] });
}

