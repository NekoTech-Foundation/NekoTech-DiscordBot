const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const { getLang } = require('../../utils/langLoader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlang')
        .setDescription('Change the bot language for this server / Thay đổi ngôn ngữ bot')
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Select language / Chọn ngôn ngữ')
                .setRequired(true)
                .addChoices(
                    { name: 'Vietnamese (Tiếng Việt)', value: 'vn' },
                    { name: 'English', value: 'en' },
                    { name: 'Japanese (日本語)', value: 'jp' }
                )),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({ 
                content: '❌ You do not have permission to use this command (Manage Guild required).', 
                ephemeral: true 
            });
        }

        const selectedLang = interaction.options.getString('language');
        let settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        
        if (!settings) {
            settings = await GuildSettings.create({ guildId: interaction.guild.id });
        }

        settings.language = selectedLang;
        await settings.save();

        const lang = await getLang(interaction.guild.id);
        const confirmation = {
            vn: '✅ Ngôn ngữ đã được đổi thành **Tiếng Việt**.',
            en: '✅ Language has been changed to **English**.',
            jp: '✅ 言語が **日本語** に変更されました。'
        };

        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setDescription(confirmation[selectedLang] || confirmation['vn']);

        await interaction.reply({ embeds: [embed] });
    }
};
