// Button handler for Jikan period switchers
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const UI = require('./ui');
const { translateText } = require('../Translator/translatorUtils');

const api = axios.create({ baseURL: 'https://api.jikan.moe/v4', timeout: 15000 });

async function jikanGet(path, params = {}) {
  try {
    const { data } = await api.get(path, { params });
    return data;
  } catch (err) {
    if (err.response && err.response.status === 429) {
       await new Promise(r => setTimeout(r, 2000));
       const { data } = await api.get(path, { params });
       return data;
    }
    throw err;
  }
}

module.exports = {
  run: (client) => {
    client.on('interactionCreate', async (interaction) => {
      try {
        if (!interaction.isButton()) return;

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
            const res = await jikanGet(`/anime/${id}`);
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
              } catch {}
            }
            
            const embed = UI.animeEmbed(anime, { description, footerText });
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`jikan_lang_anime_vi_${id}`).setLabel('Tiếng Việt').setStyle(lang === 'vi' ? ButtonStyle.Primary : ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId(`jikan_lang_anime_en_${id}`).setLabel('English').setStyle(lang === 'en' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            );
            return interaction.update({ embeds: [embed], components: [row] });
          }

          if (kind === 'manga') {
            const res = await jikanGet(`/manga/${id}`);
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
              } catch {}
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
              const full = await jikanGet(`/characters/${id}/full`);
              ch = full?.data;
            } catch {}
            if (!ch) {
              const basic = await jikanGet(`/characters/${id}`);
              ch = basic?.data;
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
              } catch {}
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
        try { if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Lỗi xử lý yêu cầu.', ephemeral: true }); } catch {}
      }
    });
  }
};

