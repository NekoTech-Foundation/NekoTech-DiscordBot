const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { translateText, createTranslationEmbed } = require('./translatorUtils');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Dịch Tin Nhắn...')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const config = yaml.load(fs.readFileSync(path.join(__dirname, 'config.yml'), 'utf8'));
        const targetMessage = interaction.targetMessage;

        if (!targetMessage.content) {
            return interaction.reply({ content: 'Chưa nhận văn bản.', ephemeral: true });
        }

        const translated = await translateText(targetMessage.content, config.context_menu.default_language);
        
        if (!translated) {
            return interaction.reply({ content: 'Dịch thuật thất bại.', ephemeral: true });
        }

        const embed = createTranslationEmbed(targetMessage.content, translated, 'auto', config.context_menu.default_language);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
