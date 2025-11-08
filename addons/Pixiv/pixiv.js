const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const PixivApi = require('pixiv-api-client');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load config
const configPath = path.join(__dirname, '..', '..', 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

const pixiv = new PixivApi();

async function refreshToken() {
    if (config.API_Keys.Pixiv && config.API_Keys.Pixiv.RefreshToken) {
        await pixiv.refreshAccessToken(config.API_Keys.Pixiv.RefreshToken);
    } else {
        throw new Error('Pixiv Refresh Token not found in config.yml');
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pixiv')
        .setDescription('Tìm kiếm ảnh trên Pixiv')
        .addSubcommand(subcommand =>
            subcommand
                .setName('illustration')
                .setDescription('Tìm kiếm illustration theo tag')
                .addStringOption(option =>
                    option.setName('tag')
                        .setDescription('Tag để tìm kiếm')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('search_mode')
                        .setDescription('Chế độ tìm kiếm (mặc định: theo tag)')
                        .addChoices(
                            { name: 'Partial Match for Tags', value: 'partial_match_for_tags' },
                            { name: 'Exact Match for Tags', value: 'exact_match_for_tags' },
                            { name: 'Title and Caption', value: 'title_and_caption' }
                        ))
                .addStringOption(option =>
                    option.setName('sort_mode')
                        .setDescription('Chế độ sắp xếp (mặc định: không)')
                        .addChoices(
                            { name: 'Date Descending', value: 'date_desc' },
                            { name: 'Date Ascending', value: 'date_asc' },
                            { name: 'Popular Descending', value: 'popular_desc' }
                        ))
                .addBooleanOption(option =>
                    option.setName('nsfw')
                        .setDescription('Tìm kiếm ảnh NSFW (mặc định: không)')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('artwork')
                .setDescription('Tìm kiếm artwork từ bảng xếp hạng')
                .addStringOption(option =>
                    option.setName('leaderboard')
                        .setDescription('Phạm vi ngày cho bảng xếp hạng')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Daily', value: 'day' },
                            { name: 'Weekly', value: 'week' },
                            { name: 'Monthly', value: 'month' },
                            { name: 'Rookie', value: 'day_rookie' },
                            { name: 'Original', value: 'week_original' },
                            { name: 'By AI', value: 'day_ai' },
                            { name: 'By Male Users', value: 'day_male' },
                            { name: 'By Female Users', value: 'day_female' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bosuutap')
                .setDescription('Xem các ảnh bạn đã yêu thích')),
    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            await refreshToken();
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'illustration') {
                const tag = interaction.options.getString('tag');
                const searchMode = interaction.options.getString('search_mode') || 'partial_match_for_tags';
                const sortMode = interaction.options.getString('sort_mode') || 'date_desc';
                const nsfw = interaction.options.getBoolean('nsfw') || false;

                let illusts = await pixiv.searchIllust(tag, { search_target: searchMode, sort: sortMode });
                if (!nsfw) {
                    illusts.illusts = illusts.illusts.filter(i => i.x_restrict === 0);
                }

                if (!illusts.illusts.length) {
                    return interaction.editReply('Không tìm thấy ảnh nào với tag này.');
                }

                const randomIllust = illusts.illusts[Math.floor(Math.random() * illusts.illusts.length)];
                await sendIllustEmbed(interaction, randomIllust);

            } else if (subcommand === 'artwork') {
                const leaderboard = interaction.options.getString('leaderboard');
                let ranking = await pixiv.illustRanking({ mode: leaderboard });

                if (!ranking.illusts.length) {
                    return interaction.editReply('Không tìm thấy ảnh nào trong bảng xếp hạng này.');
                }

                const randomIllust = ranking.illusts[Math.floor(Math.random() * ranking.illusts.length)];
                await sendIllustEmbed(interaction, randomIllust);

            } else if (subcommand === 'bosuutap') {
                // This requires the user's Pixiv ID. For simplicity, we'll use the logged-in user's bookmarks.
                const selfInfo = await pixiv.userDetail(pixiv.authInfo().user.id);
                let bookmarks = await pixiv.userBookmarksIllust(selfInfo.user.id);

                if (!bookmarks.illusts.length) {
                    return interaction.editReply('Bạn chưa yêu thích ảnh nào.');
                }

                const randomIllust = bookmarks.illusts[Math.floor(Math.random() * bookmarks.illusts.length)];
                await sendIllustEmbed(interaction, randomIllust);
            }

        } catch (error) {
            console.error(error);
            if (error.message.includes('Pixiv Refresh Token')) {
                return interaction.editReply('Lỗi: Không tìm thấy Pixiv Refresh Token trong `config.yml`. Vui lòng cấu hình trước khi sử dụng.');
            }
            return interaction.editReply('Đã có lỗi xảy ra khi thực hiện lệnh.');
        }
    }
};

async function sendIllustEmbed(interaction, illust) {
    try {
        const imageUrl = illust.image_urls.large.replace('i.pximg.net', 'i.pixiv.cat');
        const imageName = `pixiv_${illust.id}.jpg`;

        // Fetch the image data
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: {
                'Referer': 'https://www.pixiv.net/'
            }
        });
        const imageBuffer = Buffer.from(response.data, 'binary');

        // Create an attachment
        const attachment = new AttachmentBuilder(imageBuffer, { name: imageName });

        const embed = new EmbedBuilder()
            .setTitle(illust.title)
            .setURL(`https://www.pixiv.net/en/artworks/${illust.id}`)
            .setColor(config.EmbedColors || '#1769FF')
            .setImage(`attachment://${imageName}`)
            .addFields(
                { name: 'Author', value: `[${illust.user.name}](https://www.pixiv.net/en/users/${illust.user.id})`, inline: true },
                { name: 'Tags', value: illust.tags.map(t => `\`${t.name}\``).join(', ') || 'Không có tag', inline: false }
            )
            .setFooter({ text: 'Powered by Pixiv' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`pixiv_save_${illust.id}`)
                    .setLabel('Lưu vào bộ sưu tập')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('❤️'),
                new ButtonBuilder()
                    .setLabel('Link')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.pixiv.net/en/artworks/${illust.id}`)
            );

        await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
    } catch (error) {
        console.error("Failed to send illust embed:", error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi tải hoặc hiển thị hình ảnh.' });
    }
}

// It's also good practice to handle the button interaction.
// This would typically be in your bot's main interactionCreate event handler.
// For now, I'll add a comment on how to handle it.
/*
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || !interaction.customId.startsWith('pixiv_save_')) return;

    const illustId = interaction.customId.split('_')[2];
    try {
        await refreshToken();
        await pixiv.illustBookmarkAdd(illustId);
        await interaction.reply({ content: 'Đã lưu ảnh vào bộ sưu tập của bạn!', ephemeral: true });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Không thể lưu ảnh. Có thể bạn đã lưu ảnh này rồi.', ephemeral: true });
    }
});
*/

