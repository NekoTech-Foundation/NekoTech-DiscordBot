const { SlashCommandBuilder } = require('@discordjs/builders');
const { translateText, createTranslationEmbed } = require('./translatorUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Dịch văn bản tới một văn bản đã chọn.')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('đoạn văn bản để dịch')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('to')
                .setDescription('Ngôn ngữ đích (ví dụ: Tiếng Nhật,en,vi,jp)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('from')
                .setDescription('Ngôn ngữ nguồn (mặc định: tự động phát hiện)')),

    async execute(interaction, client) {
        const text = interaction.options.getString('text');
        const targetLang = interaction.options.getString('to');
        const sourceLang = interaction.options.getString('from') || 'auto';

        const translated = await translateText(text, targetLang, sourceLang);
        
        if (!translated) {
            return await interaction.reply({ content: 'Dịch Thất Bại!,nếu bạn nghĩ đây không phải lỗi,hãy báo cáo tại dsc.gg/nekocomics !.', ephemeral: true });
        }

        const embed = createTranslationEmbed(text, translated, sourceLang, targetLang);
        await interaction.reply({ embeds: [embed] });
    }
};