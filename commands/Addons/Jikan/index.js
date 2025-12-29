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
      // Simple backoff then retry once
      await new Promise(r => setTimeout(r, 1000));
      const { data } = await api.get(path, { params });
      return data;
    }
    throw err;
  }
}

module.exports = {
  name: 'Jikan',
  description: 'Anime/Manga via Jikan API (MAL)',
  version: '0.1.0',

  commands: [
    {
      data: new SlashCommandBuilder()
        .setName('anime')
        .setDescription('Anime/Manga commands (Jikan)')
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
        ,

      async execute(interaction) {
        const sub = interaction.options.getSubcommand(false);
        if (!sub) return interaction.reply({ content: 'Vui lòng chọn một lệnh con (subcommand)!', ephemeral: true });
        try {
          if (sub === 'search') return await this.handleSearch(interaction);
          if (sub === 'top') return await this.handleTop(interaction);
          if (sub === 'season') return await this.handleSeason(interaction);
          if (sub === 'random') return await this.handleRandom(interaction);
          if (sub === 'character') return await this.handleCharacter(interaction);
          if (sub === 'schedule') return await this.handleSchedule(interaction);
        } catch (e) {
          console.error('[Jikan] command error:', e?.response?.data || e);
          if (!interaction.deferred && !interaction.replied) return interaction.reply({ content: 'Đã xảy ra lỗi khi gọi Jikan API.', ephemeral: true });
          return interaction.editReply({ content: 'Đã xảy ra lỗi khi gọi Jikan API.' });
        }
      },

      async handleSearch(interaction) {
        const q = interaction.options.getString('q');
        const page = interaction.options.getInteger('page') || 1;
        await interaction.deferReply();
        const data = await jikanGet('/anime', { q, page });
        const items = (data.data || []).slice(0, 10);
        if (items.length === 0) return interaction.editReply('Không tìm thấy anime phù hợp.');
        const lines = items.map((a, idx) => `• ${((page-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.type || '-'} | ⭐ ${a.score ?? '-'} | EP ${a.episodes ?? '-'}${a.year ? ' | ' + a.year : ''}`);
        const embed = UI.listEmbed({ title: `🔎 Kết quả tìm kiếm: "${q}"`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
        return interaction.editReply({ embeds: [embed] });
      },

      async handleTop(interaction) {
        const type = interaction.options.getString('type') || 'all';
        const page = interaction.options.getInteger('page') || 1;
        await interaction.deferReply();
        const params = { page };
        if (type && type !== 'all') params.type = type;
        const data = await jikanGet('/top/anime', params);
        const items = (data.data || []).slice(0, 10);
        const lines = items.map((a, idx) => `#${a.rank ?? '?'} • [${a.title}](${a.url}) — ${a.type || '-'} | ⭐ ${a.score ?? '-'} | ${a.year ?? ''}`);
        const embed = UI.listEmbed({ title: `🏆 Top Anime (${type})`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
        return interaction.editReply({ embeds: [embed] });
      },

      async handleSeason(interaction) {
        const year = interaction.options.getInteger('year');
        const season = interaction.options.getString('season');
        const page = interaction.options.getInteger('page') || 1;
        await interaction.deferReply();
        let path = '/seasons/now';
        if (year && season) path = `/seasons/${year}/${season}`;
        const data = await jikanGet(path, { page });
        const items = (data.data || []).slice(0, 10);
        const lines = items.map((a, idx) => `• ${((page-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.type || '-'} | ${a.season || ''} ${a.year || ''}`);
        const title = year && season ? `📅 Season ${season} ${year}` : '📅 Season hiện tại';
        const embed = UI.listEmbed({ title, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
        return interaction.editReply({ embeds: [embed] });
      },

      async handleRandom(interaction) {
        await interaction.deferReply();
        const data = await jikanGet('/random/anime');
        const anime = data.data;
        const embed = UI.animeEmbed(anime);
        return interaction.editReply({ embeds: [embed] });
      },

      async handleCharacter(interaction) {
        const q = interaction.options.getString('q');
        const page = interaction.options.getInteger('page') || 1;
        await interaction.deferReply();
        const data = await jikanGet('/characters', { q, page });
        const items = (data.data || []).slice(0, 10);
        if (items.length === 0) return interaction.editReply('Không tìm thấy nhân vật phù hợp.');
        const embed = UI.characterEmbed(items[0]);
        return interaction.editReply({ embeds: [embed] });
      },

      async handleSchedule(interaction) {
        const day = interaction.options.getString('day');
        const page = interaction.options.getInteger('page') || 1;
        await interaction.deferReply();
        const data = await jikanGet('/schedules', { filter: day, page });
        const items = (data.data || []).slice(0, 10);
        const lines = items.map((a, idx) => `• ${((page-1)*10)+idx+1}. [${a.title}](${a.url}) — ${a.broadcast?.string || 'N/A'}`);
        const embed = UI.listEmbed({ title: `🗓️ Lịch phát sóng${day ? ' - ' + day : ''}`, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
        return interaction.editReply({ embeds: [embed] });
      },
    },
  ],
};

