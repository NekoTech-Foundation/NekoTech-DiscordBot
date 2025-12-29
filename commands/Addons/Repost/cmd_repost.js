const { SlashCommandBuilder } = require('discord.js');
const repost = require('./repost');
const { getCommands } = require('../../../utils/configLoader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('repost')
        .setDescription('Các lệnh repost video.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('tiktok')
                .setDescription('Repost một video từ TikTok.')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('Link video TikTok.')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('youtube')
                .setDescription('Repost một video từ YouTube.')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('Link video YouTube.')
                        .setRequired(true))
        ),
    async execute(interaction) {
        const enabledCommands = getCommands();
        if (!enabledCommands[module.exports.data.name]) {
            return interaction.reply({ content: 'Lệnh này hiện đang bị tắt.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'tiktok') {
            const url = interaction.options.getString('url');
            await repost.handleTikTok(interaction, url);
        } else if (subcommand === 'youtube') {
            const url = interaction.options.getString('url');
            await repost.handleYouTube(interaction, url);
        }
    },
};
