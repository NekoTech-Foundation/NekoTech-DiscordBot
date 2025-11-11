// Button handler for Jikan period switchers
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  run: (client) => {
    client.on('interactionCreate', async (interaction) => {
      try {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('jikan_top_')) return;
        const parts = interaction.customId.split('_');
        // jikan_top_{kind}_{metric}_{period}_{page}
        const kind = parts[2];
        const metric = parts[3];
        const period = parts[4];
        const page = parseInt(parts[5] || '1', 10) || 1;
        if (kind === 'anime') {
          const { _buildAnimePeriodEmbed } = require('./cmd_anime_chart');
          const { embed, row } = await _buildAnimePeriodEmbed(metric, period, page);
          return interaction.update({ embeds: [embed], components: [row] });
        } else if (kind === 'manga') {
          const { _buildMangaPeriodEmbed } = require('./cmd_manga_chart');
          const { embed, row } = await _buildMangaPeriodEmbed(metric, period, page);
          return interaction.update({ embeds: [embed], components: [row] });
        }
      } catch (e) {
        console.error('[Jikan buttons] error:', e);
        try { if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Lỗi chuyển kỳ.', ephemeral: true }); } catch {}
      }
    });
  }
};

