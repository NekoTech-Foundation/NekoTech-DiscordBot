// Button handler for Jikan period switchers
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const JikanService = require('../../../utils/jikan/jikanService');
const UI = require('./ui');
const { translateText } = require('../Translator/translatorUtils');

module.exports = {
  run: (client) => {
    client.on('interactionCreate', async (interaction) => {
      try {
        // Select Menu Handler
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('jikan_select_')) {
          const parts = interaction.customId.split('_');
          const type = parts[2]; // anime | manga | character
          // const userId = parts[3]; // Verification if needed

          if (interaction.values.length === 0) return;
          const id = interaction.values[0];
          await interaction.deferReply(); // Fetching detail might take a moment

          const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); // Re-require if needed scope

          if (type === 'anime') {
            const res = await JikanService.getAnimeById(id);
            const anime = res?.data;
            if (!anime) return interaction.editReply('❌ Không tải được thông tin.');

            let description = anime.synopsis || '-';
            let footerText;

            // Construct Embed
            const embed = UI.animeEmbed(anime, { description, footerText });

            // Add Translate Buttons
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`jikan_lang_anime_vi_${id}`).setLabel('Tiếng Việt').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId(`jikan_lang_anime_en_${id}`).setLabel('English').setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({ embeds: [embed], components: [row] });
          }
          else if (type === 'manga') {
            const res = await JikanService.getMangaById(id);
            const manga = res?.data;
            if (!manga) return interaction.editReply('❌ Không tải được thông tin.');

            let description = manga.synopsis || '-';
            const embed = UI.mangaEmbed(manga, { description });
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`jikan_lang_manga_vi_${id}`).setLabel('Tiếng Việt').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId(`jikan_lang_manga_en_${id}`).setLabel('English').setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({ embeds: [embed], components: [row] });
          }
          else if (type === 'character') {
            let ch;
            try {
              const full = await JikanService.getCharacterFullById(id);
              ch = full?.data;
            } catch { }
            if (!ch) {
              try { const basic = await JikanService.getCharacterById(id); ch = basic?.data; } catch { }
            }
            if (!ch) return interaction.editReply('❌ Không tải được thông tin.');

            const embed = UI.characterEmbed(ch, { description: ch.about });
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`jikan_lang_character_vi_${id}`).setLabel('Tiếng Việt').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId(`jikan_lang_character_en_${id}`).setLabel('English').setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({ embeds: [embed], components: [row] });
          }
          return;
        }

        if (!interaction.isButton()) return;
        // ... rest of button logic

        // Period switchers for charts
        if (interaction.customId.startsWith('jikan_top_')) {
          const parts = interaction.customId.split('_');
          // jikan_top_{kind}_{metric}_{period}_{page}
          const kind = parts[2];
          const metric = parts[3];
          const period = parts[4];
          const page = parseInt(parts[5] || '1', 10) || 1;

          if (kind === 'anime') {
            const { _buildAnimePeriodEmbed } = require('./cmd_jikan');
            const { embed, row } = await _buildAnimePeriodEmbed(metric, period, page);
            return interaction.update({ embeds: [embed], components: [row] });
          } else if (kind === 'manga') {
            const { _buildMangaPeriodEmbed } = require('./cmd_jikan');
            const { embed, row } = await _buildMangaPeriodEmbed(metric, period, page);
            return interaction.update({ embeds: [embed], components: [row] });
          }
          return;
        }

        // Language toggles: jikan_lang_{kind}_{lang}_{id}
        if (interaction.customId.startsWith('jikan_lang_')) {
          const parts = interaction.customId.split('_');
          const kind = parts[2]; // anime | manga | character
          const lang = parts[3]; // vi | en
          const id = parts[4];

          if (!id) return;

          if (kind === 'anime') {
            const res = await JikanService.getAnimeById(id);
            const anime = res?.data;
            if (!anime) return;

            let description = anime.synopsis || '-';
            let footerText;
            if (lang === 'vi' && anime.synopsis) {
              try {
                const vi = await translateText(anime.synopsis, 'vi', 'auto');
                if (vi) {
                  description = vi;
                  footerText = 'Bản dịch được thực hiện bởi Google Translate';
                }
              } catch { }
            }

            const embed = UI.animeEmbed(anime, { description, footerText });
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`jikan_lang_anime_vi_${id}`).setLabel('Tiếng Việt').setStyle(lang === 'vi' ? ButtonStyle.Primary : ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId(`jikan_lang_anime_en_${id}`).setLabel('English').setStyle(lang === 'en' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            );
            return interaction.update({ embeds: [embed], components: [row] });
          }

          if (kind === 'manga') {
            const res = await JikanService.getMangaById(id);
            const manga = res?.data;
            if (!manga) return;

            let description = manga.synopsis || '-';
            let footerText;
            if (lang === 'vi' && manga.synopsis) {
              try {
                const vi = await translateText(manga.synopsis, 'vi', 'auto');
                if (vi) {
                  description = vi;
                  footerText = 'Bản dịch được thực hiện bởi Google Translate';
                }
              } catch { }
            }

            const embed = UI.mangaEmbed(manga, { description, footerText });
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`jikan_lang_manga_vi_${id}`).setLabel('Tiếng Việt').setStyle(lang === 'vi' ? ButtonStyle.Primary : ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId(`jikan_lang_manga_en_${id}`).setLabel('English').setStyle(lang === 'en' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            );
            return interaction.update({ embeds: [embed], components: [row] });
          }

          if (kind === 'character') {
            let ch;
            try {
              const full = await JikanService.getCharacterFullById(id);
              ch = full?.data;
            } catch { }
            if (!ch) {
              // try basic
              try {
                const basic = await JikanService.getCharacterById(id);
                ch = basic?.data;
              } catch { }
            }
            if (!ch) return;

            let description = (ch.about || '').toString().trim();
            let footerText;
            if (lang === 'vi' && description) {
              try {
                const vi = await translateText(description, 'vi', 'auto');
                if (vi) {
                  description = vi;
                  footerText = 'Bản dịch được thực hiện bởi Google Translate';
                }
              } catch { }
            }

            const embed = UI.characterEmbed(ch, { description, footerText });
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`jikan_lang_character_vi_${id}`).setLabel('Tiếng Việt').setStyle(lang === 'vi' ? ButtonStyle.Primary : ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId(`jikan_lang_character_en_${id}`).setLabel('English').setStyle(lang === 'en' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            );
            return interaction.update({ embeds: [embed], components: [row] });
          }
          return;
        }
      } catch (e) {
        console.error('[Jikan buttons] error:', e);
        try { if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Lỗi xử lý yêu cầu.', ephemeral: true }); } catch { }
      }
    });
  }
};

