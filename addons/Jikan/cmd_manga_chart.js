const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const UI = require('./ui');

const api = axios.create({ baseURL: 'https://api.jikan.moe/v4', timeout: 10000 });

async function jikanGet(path, params = {}) {
  const { data } = await api.get(path, { params });
  return data;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('manga_chart')
    .setDescription('Top manga theo tuần/tháng/năm (nút chuyển kỳ)')
    .addStringOption(o => o.setName('metric').setDescription('Chỉ số').addChoices(
      { name: 'thành viên (phổ biến)', value: 'members' }, { name: 'điểm', value: 'score' })),

  async execute(interaction) {
    const metric = interaction.options.getString('metric') || 'members';
    await interaction.deferReply();
    const page = 1, period = 'week';
    const { embed, row } = await buildMangaPeriodEmbed(metric, period, page);
    return interaction.editReply({ embeds: [embed], components: [row] });
  }
};

async function buildMangaPeriodEmbed(metric, period, page) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'week') start.setDate(start.getDate() - 7);
  else if (period === 'month') start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 365);
  const params = {
    start_date: start.toISOString().slice(0,10),
    end_date: now.toISOString().slice(0,10),
    order_by: metric, sort: 'desc', page
  };
  const data = await jikanGet('/manga', params);
  const items = (data.data || []).slice(0, 10);
  const metricLabel = metric === 'members' ? '👥' : '⭐';
  const lines = items.map((m, idx) => `• ${((page-1)*10)+idx+1}. [${m.title}](${m.url}) — ${m.type || '-'} | ${metricLabel} ${metric==='members'?(m.members ?? '-'):(m.score ?? '-')}`);
  const title = `📈 Top Manga theo ${period} (theo ${metric})`;
  const embed = UI.listEmbed({ title, items: lines, page, totalPages: data.pagination?.last_visible_page || page });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`jikan_top_manga_${metric}_week_${page}`).setLabel('Tuần').setStyle(period==='week'?ButtonStyle.Primary:ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`jikan_top_manga_${metric}_month_${page}`).setLabel('Tháng').setStyle(period==='month'?ButtonStyle.Primary:ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`jikan_top_manga_${metric}_year_${page}`).setLabel('Năm').setStyle(period==='year'?ButtonStyle.Primary:ButtonStyle.Secondary)
  );
  return { embed, row };
}

module.exports._buildMangaPeriodEmbed = buildMangaPeriodEmbed;

