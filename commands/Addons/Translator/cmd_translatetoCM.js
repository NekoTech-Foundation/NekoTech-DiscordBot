const { ContextMenuCommandBuilder, ApplicationCommandType, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { translateText, createTranslationEmbed } = require('./translatorUtils');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Dịch Tin Nhắn Sang...')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const config = yaml.load(fs.readFileSync(path.join(__dirname, 'config.yml'), 'utf8'));
        const targetMessage = interaction.targetMessage;

        if (!targetMessage.content) {
            return interaction.reply({ content: 'No text to translate.', ephemeral: true });
        }

        const languageEntries = Object.entries(config.languages);
        const itemsPerPage = 10;
        let currentPage = 0;
        const maxPages = Math.ceil(languageEntries.length / itemsPerPage);

        const getPageOptions = (page) => {
            return languageEntries
                .slice(page * itemsPerPage, (page + 1) * itemsPerPage)
                .map(([code, name]) => ({
                    label: name,
                    value: code,
                    description: `Translate to ${name}`
                }));
        };

        const createMenuRow = (page) => {
            return new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('language_select')
                        .setPlaceholder(`Chọn ngôn ngữ (Trang ${page + 1}/${maxPages})`)
                        .addOptions(getPageOptions(page))
                );
        };

        const createButtonRow = (page) => {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('◀️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === maxPages - 1)
                );
        };

        const response = await interaction.reply({
            content: 'Hãy chọn ngôn ngữ đích:',
            components: [createMenuRow(currentPage), createButtonRow(currentPage)],
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.customId === 'language_select') {
                const translated = await translateText(targetMessage.content, i.values[0]);
                
                if (!translated) {
                    collector.stop();
                    return i.update({ 
                        content: 'Dịch thuật thất bại.', 
                        components: [] 
                    });
                }

                collector.stop();
                const embed = createTranslationEmbed(targetMessage.content, translated, 'auto', i.values[0]);
                await i.update({ 
                    content: null,
                    embeds: [embed], 
                    components: [] 
                });
            }
            else if (i.customId === 'prev_page' || i.customId === 'next_page') {
                currentPage = i.customId === 'prev_page' ? 
                    Math.max(0, currentPage - 1) : 
                    Math.min(maxPages - 1, currentPage + 1);

                await i.update({
                    components: [createMenuRow(currentPage), createButtonRow(currentPage)]
                });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({
                    content: 'Quá thời gian chọn ngôn ngữ,yêu cầu bị hủy.',
                    components: []
                });
            }
        });
    }
};
