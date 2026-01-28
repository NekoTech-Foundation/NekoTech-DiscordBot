const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const JikanService = require('../../../utils/jikan/jikanService'); // Updated path
const UI = require('./ui');
const { translateText } = require('../Translator/translatorUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jikan')
    .setDescription('Tra cứu thông tin Anime/Manga từ MyAnimeList (Jikan API)')
    .addSubcommandGroup(group =>
      group.setName('anime').setDescription('Tra cứu Anime')
        .addSubcommand(sc => sc.setName('search').setDescription('Tìm kiếm anime').addStringOption(o => o.setName('q').setDescription('Từ khóa').setRequired(true)).addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1)))
        .addSubcommand(sc => sc.setName('top').setDescription('Top anime').addStringOption(o => o.setName('type').setDescription('Thể loại').addChoices({ name: 'Tất cả', value: 'all' }, { name: 'TV', value: 'tv' }, { name: 'Movie', value: 'movie' }, { name: 'OVA', value: 'ova' }, { name: 'Special', value: 'special' }, { name: 'ONA', value: 'ona' })).addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1)))
        .addSubcommand(sc => sc.setName('season').setDescription('Anime theo mùa').addIntegerOption(o => o.setName('year').setDescription('Năm')).addStringOption(o => o.setName('season').setDescription('Mùa').addChoices({ name: 'mùa đông', value: 'winter' }, { name: 'mùa xuân', value: 'spring' }, { name: 'mùa hè', value: 'summer' }, { name: 'mùa thu', value: 'fall' })).addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1)))
        .addSubcommand(sc => sc.setName('random').setDescription('Anime ngẫu nhiên'))
        .addSubcommand(sc => sc.setName('character').setDescription('Tìm nhân vật').addStringOption(o => o.setName('q').setDescription('Tên nhân vật').setRequired(true)).addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1)))
        .addSubcommand(sc => sc.setName('schedule').setDescription('Lịch phát sóng').addStringOption(o => o.setName('day').setDescription('Ngày').addChoices({ name: 'thứ hai', value: 'monday' }, { name: 'thứ ba', value: 'tuesday' }, { name: 'thứ tư', value: 'wednesday' }, { name: 'thứ năm', value: 'thursday' }, { name: 'thứ sáu', value: 'friday' }, { name: 'thứ bảy', value: 'saturday' }, { name: 'chủ nhật', value: 'sunday' })).addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1)))
    )
    .addSubcommandGroup(group =>
      group.setName('manga').setDescription('Tra cứu Manga')
        .addSubcommand(sc => sc.setName('search').setDescription('Tìm kiếm manga').addStringOption(o => o.setName('q').setDescription('Từ khóa').setRequired(true)).addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1)))
        .addSubcommand(sc => sc.setName('top').setDescription('Top manga').addStringOption(o => o.setName('type').setDescription('Loại').addChoices({ name: 'Tất cả', value: 'all' }, { name: 'Manga', value: 'manga' }, { name: 'Novel', value: 'novel' }, { name: 'One-shot', value: 'one_shot' }, { name: 'Doujin', value: 'doujin' }, { name: 'Manhwa', value: 'manhwa' }, { name: 'Manhua', value: 'manhua' })).addIntegerOption(o => o.setName('page').setDescription('Trang').setMinValue(1)))
        .addSubcommand(sc => sc.setName('random').setDescription('Manga ngẫu nhiên'))
    )
    .addSubcommand(sc =>
      sc.setName('chart')
        .setDescription('Biểu đồ Top Anime')
        .addStringOption(o => o.setName('metric').setDescription('Chỉ số').addChoices({ name: 'Thành viên', value: 'members' }, { name: 'Điểm', value: 'score' }))
    )
    .addSubcommand(sc =>
      sc.setName('manga_chart')
        .setDescription('Biểu đồ Top Manga')
        .addStringOption(o => o.setName('metric').setDescription('Chỉ số').addChoices({ name: 'Thành viên', value: 'members' }, { name: 'Điểm', value: 'score' }))
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    try {
      if (group === 'anime') {
        if (sub === 'search') return await handleAnimeSearch(interaction);
        if (sub === 'top') return await handleAnimeTop(interaction);
        if (sub === 'season') return await handleAnimeSeason(interaction);
        if (sub === 'random') return await handleAnimeRandom(interaction);
        if (sub === 'character') return await handleAnimeCharacter(interaction);
        if (sub === 'schedule') return await handleAnimeSchedule(interaction);
      } else if (group === 'manga') {
        if (sub === 'search') return await handleMangaSearch(interaction);
        if (sub === 'top') return await handleMangaTop(interaction);
        if (sub === 'random') return await handleMangaRandom(interaction);
      } else if (sub === 'chart') {
        return await handleAnimeChart(interaction);
      } else if (sub === 'manga_chart') {
        return await handleMangaChart(interaction);
      }
    } catch (e) {
      console.error('[Jikan] command error:', e?.response?.data || e);
      let msg = '❌ Đã xảy ra lỗi khi gọi Jikan API.';
      if (e?.response?.status === 404) msg = '⚠️ Không tìm thấy dữ liệu.';
      if (e?.response?.status === 429) msg = '⏳ API đang bận, vui lòng thử lại sau vài giây.';
      else if (e?.code === 'ECONNABORTED') msg = '⏱️ Quá thời gian chờ (Timeout).';

      if (!interaction.deferred && !interaction.replied) return interaction.reply({ content: msg, ephemeral: true });
      return interaction.editReply({ content: msg });
    }
  }
};

// Helper to create Select Menu
function createSelectMenu(items, type, userId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`jikan_select_${type}_${userId}`)
    .setPlaceholder('👉 Chọn một mục để xem chi tiết...')
    .addOptions(
      items.slice(0, 25).map(item => { // Discord limits to 25 options
        const label = (item.title || item.name || 'Unknown').substring(0, 100);
        const desc = (item.year ? `${item.year} ` : '') + (item.score ? `⭐${item.score}` : '');
        return new StringSelectMenuOptionBuilder()
          .setLabel(label)
          .setDescription(desc || '...')
          .setValue(item.mal_id.toString());
      })
    );
  return new ActionRowBuilder().addComponents(menu);
}

// --- Anime Handlers ---
async function handleAnimeSearch(interaction) {
  const q = interaction.options.getString('q');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();

  const data = await JikanService.searchAnime(q, page);
  if (!data || !data.data) return interaction.editReply('❌ Đã xảy ra lỗi kết nối API.');

  const items = (data.data || []).slice(0, 10);
  if (items.length === 0) return interaction.editReply('⚠️ Không tìm thấy anime phù hợp.');
  const lines = items.map((a, idx) => `• ${((page - 1) * 10) + idx + 1}. [${a.title}](${a.url}) - ${a.type || '-'} | ★ ${a.score ?? '-'} | EP ${a.episodes ?? '-'}${a.year ? ' | ' + a.year : ''}`);
  const embed = UI.listEmbed({ title: `Kết quả tìm kiếm: "${q}"`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleAnimeTop(interaction) {
  const type = interaction.options.getString('type') || 'all';
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();

  const data = await JikanService.getTopAnime(type, page);
  if (!data) return interaction.editReply('❌ Lỗi API.');

  const items = (data.data || []).slice(0, 10);
  const lines = items.map(a => `#${a.rank ?? '?'} • [${a.title}](${a.url}) - ${a.type || '-'} | ★ ${a.score ?? '-'} | ${a.year ?? ''}`);
  const embed = UI.listEmbed({ title: `Top Anime (${type})`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleAnimeSeason(interaction) {
  const year = interaction.options.getInteger('year');
  const season = interaction.options.getString('season');
  const page = interaction.options.getInteger('page') || 1;

  if (year && !season) {
    return interaction.reply({ content: '⚠️ Bạn cần chọn thêm **Mùa (Season)** (Winter, Spring, Summer, Fall) khi tìm kiếm theo Năm.', ephemeral: true });
  }
  await interaction.deferReply();

  let data;
  if (year && season) {
    data = await JikanService.getSeason(year, season, page);
  } else {
    data = await JikanService.getSeasonNow(page);
  }

  if (!data) return interaction.editReply('❌ Lỗi API hoặc không tìm thấy mùa này.');

  const items = (data.data || []).slice(0, 10);
  const title = year && season ? `Season ${season} ${year}` : 'Season hiện tại';
  const embed = UI.richListEmbed({ title, items, page, totalPages: data.pagination?.last_visible_page || page, type: 'anime' });
  const row = createSelectMenu(items, 'anime', interaction.user.id);

  return interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleAnimeRandom(interaction) {
  await interaction.deferReply();
  const data = await JikanService.getRandomAnime();
  if (!data || !data.data) return interaction.editReply('❌ Không thể lấy anime ngẫu nhiên.');

  const anime = data.data;
  let description = anime.synopsis;
  let footerText;

  // Auto Translate Check
  if (anime.synopsis) {
    try {
      const descVi = await translateText(anime.synopsis, 'vi', 'auto');
      if (descVi) {
        description = descVi;
        footerText = 'Bản dịch được thực hiện bởi Google Translate';
      }
    } catch { }
  }

  const embed = UI.animeEmbed(anime, { description, footerText });
  const components = [];
  if (anime?.mal_id) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`jikan_lang_anime_vi_${anime.mal_id}`).setLabel('Tiếng Việt').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`jikan_lang_anime_en_${anime.mal_id}`).setLabel('English').setStyle(ButtonStyle.Secondary)
    ));
  }
  return interaction.editReply({ embeds: [embed], components });
}

async function handleAnimeCharacter(interaction) {
  const q = interaction.options.getString('q');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();

  const data = await JikanService.searchCharacter(q, page);
  if (!data || !data.data) return interaction.editReply('❌ Lỗi API.');

  const items = (data.data || []).slice(0, 10);
  if (items.length === 0) return interaction.editReply('⚠️ Không tìm thấy nhân vật phù hợp.');

  const target = items[0];
  let full;
  // Try get full info optimized
  try { if (target?.mal_id) full = await JikanService.getCharacterFullById(target.mal_id); } catch { }

  let ch = full?.data || target;
  // If full failed or returned partial, try basic ID lookup if 'about' is missing
  if (!ch?.about && target?.mal_id) {
    try { const basic = await JikanService.getCharacterById(target.mal_id); if (basic?.data) ch = { ...ch, ...basic.data }; } catch { }
  }

  let description = (ch?.about || '').toString().trim();
  let footerText;
  if (description) {
    try {
      const aboutVi = await translateText(description, 'vi', 'auto');
      if (aboutVi) {
        description = aboutVi;
        footerText = 'Bản dịch bởi Google Translate';
      }
    } catch { }
  }

  const embed = UI.characterEmbed(ch, { description, footerText });
  const components = [];
  if (ch?.mal_id) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`jikan_lang_character_vi_${ch.mal_id}`).setLabel('Tiếng Việt').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`jikan_lang_character_en_${ch.mal_id}`).setLabel('English').setStyle(ButtonStyle.Secondary)
    ));
  }
  return interaction.editReply({ embeds: [embed], components });
}

async function handleAnimeSchedule(interaction) {
  const day = interaction.options.getString('day');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();

  const data = await JikanService.getSchedules(day, page);
  if (!data) return interaction.editReply('❌ Lỗi API.');

  const items = (data.data || []).slice(0, 10);
  const lines = items.map((a, idx) => `• ${((page - 1) * 10) + idx + 1}. [${a.title}](${a.url}) - ${a.broadcast?.string || 'N/A'}`);
  const embed = UI.listEmbed({ title: `Lịch phát sóng${day ? ' - ' + day : ''}`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}


// --- Manga Handlers ---
async function handleMangaSearch(interaction) {
  const q = interaction.options.getString('q');
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();

  const data = await JikanService.searchManga(q, page);
  if (!data) return interaction.editReply('❌ Lỗi API.');

  const items = (data.data || []).slice(0, 10);
  if (items.length === 0) return interaction.editReply('⚠️ Không tìm thấy manga phù hợp.');
  const lines = items.map((m, idx) => `• ${((page - 1) * 10) + idx + 1}. [${m.title}](${m.url}) — ${m.type || '-'} | ⭐ ${m.score ?? '-'} | Chương ${m.chapters ?? '-'} | Tập ${m.volumes ?? '-'}`);
  const embed = UI.listEmbed({ title: `🔎 Kết quả tìm kiếm manga: "${q}"`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleMangaTop(interaction) {
  const type = interaction.options.getString('type') || 'all';
  const page = interaction.options.getInteger('page') || 1;
  await interaction.deferReply();

  const data = await JikanService.getTopManga(type, page);
  if (!data) return interaction.editReply('❌ Lỗi API.');

  const items = (data.data || []).slice(0, 10);
  const lines = items.map((m) => `#${m.rank ?? '?'} • [${m.title}](${m.url}) — ${m.type || '-'} | ⭐ ${m.score ?? '-'} | Chương ${m.chapters ?? '-'}`);
  const embed = UI.listEmbed({ title: `🏆 Top Manga (${type})`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  return interaction.editReply({ embeds: [embed] });
}

async function handleMangaRandom(interaction) {
  await interaction.deferReply();
  const data = await JikanService.getRandomManga();
  if (!data || !data.data) return interaction.editReply('❌ Lỗi API.');

  const manga = data.data;
  let description = manga.synopsis;
  let footerText;
  if (manga.synopsis) {
    try {
      const descVi = await translateText(manga.synopsis, 'vi', 'auto');
      if (descVi) {
        description = descVi;
        footerText = 'Bản dịch được thực hiện bởi Google Translate';
      }
    } catch { }
  }

  const embed = UI.mangaEmbed(manga, { description, footerText });
  const components = [];
  if (manga?.mal_id) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`jikan_lang_manga_vi_${manga.mal_id}`).setLabel('Tiếng Việt').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`jikan_lang_manga_en_${manga.mal_id}`).setLabel('English').setStyle(ButtonStyle.Secondary)
    ));
  }
  return interaction.editReply({ embeds: [embed], components });
}


// --- Chart Handler ---
async function buildAnimePeriodEmbed(metric, period, page) {
  const now = new Date();
  const start = new Date(now);
  // Calculate relative dates for chart
  if (period === 'week') start.setDate(start.getDate() - 7);
  else if (period === 'month') start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 365);

  const startDateStr = start.toISOString().slice(0, 10);
  const endDateStr = now.toISOString().slice(0, 10);

  const data = await JikanService.getTopAnimeByMetric(metric, startDateStr, endDateStr, page);
  // If data is null, handle gracefully
  const items = (data?.data || []).slice(0, 10);

  const metricLabel = metric === 'members' ? '👥' : '⭐';
  const lines = items.map((a, idx) => `• ${((page - 1) * 10) + idx + 1}. [${a.title}](${a.url}) — ${a.type || '-'} | ${metricLabel} ${metric === 'members' ? (a.members ?? '-') : (a.score ?? '-')}`);
  const title = `📈 Top Anime theo ${period} (theo ${metric})`;

  const embed = UI.listEmbed({ title, items: lines, page, totalPages: data?.pagination?.last_visible_page || page });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`jikan_top_anime_${metric}_week_${page}`).setLabel('Tuần').setStyle(period === 'week' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`jikan_top_anime_${metric}_month_${page}`).setLabel('Tháng').setStyle(period === 'month' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`jikan_top_anime_${metric}_year_${page}`).setLabel('Năm').setStyle(period === 'year' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
  return { embed, row };
}

async function buildMangaPeriodEmbed(metric, period, page) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'week') start.setDate(start.getDate() - 7);
  else if (period === 'month') start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 365);

  const startDateStr = start.toISOString().slice(0, 10);
  const endDateStr = now.toISOString().slice(0, 10);

  const data = await JikanService.getTopMangaByMetric(metric, startDateStr, endDateStr, page);
  const items = (data?.data || []).slice(0, 10);

  const metricLabel = metric === 'members' ? '👥' : '⭐';
  const lines = items.map((m, idx) => `• ${((page - 1) * 10) + idx + 1}. [${m.title}](${m.url}) — ${m.type || '-'} | ${metricLabel} ${metric === 'members' ? (m.members ?? '-') : (m.score ?? '-')}`);
  const title = `📈 Top Manga theo ${period} (theo ${metric})`;

  const embed = UI.listEmbed({ title, items: lines, page, totalPages: data?.pagination?.last_visible_page || page });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`jikan_top_manga_${metric}_week_${page}`).setLabel('Tuần').setStyle(period === 'week' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`jikan_top_manga_${metric}_month_${page}`).setLabel('Tháng').setStyle(period === 'month' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`jikan_top_manga_${metric}_year_${page}`).setLabel('Năm').setStyle(period === 'year' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
  return { embed, row };
}

async function handleAnimeChart(interaction) {
  const metric = interaction.options.getString('metric') || 'members';
  await interaction.deferReply();
  const page = 1, period = 'week';
  const { embed, row } = await buildAnimePeriodEmbed(metric, period, page);
  return interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleMangaChart(interaction) {
  const metric = interaction.options.getString('metric') || 'members';
  await interaction.deferReply();
  const page = 1, period = 'week';
  const { embed, row } = await buildMangaPeriodEmbed(metric, period, page);
  return interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports._buildAnimePeriodEmbed = buildAnimePeriodEmbed;
module.exports._buildMangaPeriodEmbed = buildMangaPeriodEmbed;
