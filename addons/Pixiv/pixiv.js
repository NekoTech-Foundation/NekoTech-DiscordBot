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
const recentlySent = new Set();
const CACHE_SIZE = 100;
const ITEMS_PER_PAGE = 1; // Number of images per page for collection view

// Store pagination sessions
const paginationSessions = new Map();

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

            let illusts;
            let searchInfo = {};

            if (subcommand === 'illustration') {
                const tag = interaction.options.getString('tag');
                const searchMode = interaction.options.getString('search_mode') || 'partial_match_for_tags';
                const sortMode = interaction.options.getString('sort_mode') || 'date_desc';
                const nsfw = interaction.options.getBoolean('nsfw') || false;

                searchInfo = { type: 'illustration', tag, searchMode, sortMode, nsfw };

                let response = await pixiv.searchIllust(tag, { search_target: searchMode, sort: sortMode });
                illusts = response.illusts;
                if (!nsfw) {
                    illusts = illusts.filter(i => i.x_restrict === 0);
                }

            } else if (subcommand === 'artwork') {
                const leaderboard = interaction.options.getString('leaderboard');
                searchInfo = { type: 'artwork', leaderboard };

                let response = await pixiv.illustRanking({ mode: leaderboard });
                illusts = response.illusts;

            } else if (subcommand === 'bosuutap') {
                searchInfo = { type: 'collection' };

                const selfInfo = await pixiv.userDetail(pixiv.authInfo().user.id);
                let response = await pixiv.userBookmarksIllust(selfInfo.user.id);
                illusts = response.illusts;

                if (!illusts || !illusts.length) {
                    return interaction.editReply('Bộ sưu tập của bạn đang trống.');
                }

                // Create pagination session for collection
                const sessionId = `${interaction.user.id}_${Date.now()}`;
                paginationSessions.set(sessionId, {
                    illusts: illusts,
                    currentPage: 0,
                    userId: interaction.user.id,
                    createdAt: Date.now()
                });

                // Clean old sessions (older than 15 minutes)
                cleanOldSessions();

                return await sendPaginatedCollection(interaction, sessionId, 0);
            }

            if (!illusts || !illusts.length) {
                return interaction.editReply('Không tìm thấy ảnh nào phù hợp.');
            }

            // Filter out recently sent images
            const availableIllusts = illusts.filter(i => !recentlySent.has(i.id));
            
            let randomIllust;
            if (availableIllusts.length > 0) {
                randomIllust = availableIllusts[Math.floor(Math.random() * availableIllusts.length)];
            } else {
                randomIllust = illusts[Math.floor(Math.random() * illusts.length)];
            }

            await sendIllustEmbed(interaction, randomIllust, searchInfo);

        } catch (error) {
            console.error(error);
            if (error.message.includes('Pixiv Refresh Token')) {
                return interaction.editReply('Lỗi: Không tìm thấy Pixiv Refresh Token trong `config.yml`. Vui lòng cấu hình trước khi sử dụng.');
            }
            return interaction.editReply('Đã có lỗi xảy ra khi thực hiện lệnh.');
        }
    }
};

async function sendIllustEmbed(interaction, illust, searchInfo = {}) {
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

        // Format numbers with commas
        const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        // Create enhanced embed
        const embed = new EmbedBuilder()
            .setTitle(`🎨 ${illust.title}`)
            .setURL(`https://www.pixiv.net/en/artworks/${illust.id}`)
            .setColor('#0096FA')
            .setImage(`attachment://${imageName}`)
            .setAuthor({
                name: illust.user.name,
                url: `https://www.pixiv.net/en/users/${illust.user.id}`,
                iconURL: illust.user.profile_image_urls.medium.replace('i.pximg.net', 'i.pixiv.cat')
            })
            .addFields(
                { 
                    name: '👤 Artist', 
                    value: `[${illust.user.name}](https://www.pixiv.net/en/users/${illust.user.id})`, 
                    inline: true 
                },
                { 
                    name: '🆔 ID', 
                    value: `\`${illust.id}\``, 
                    inline: true 
                },
                { 
                    name: '📅 Date', 
                    value: new Date(illust.create_date).toLocaleDateString('vi-VN'), 
                    inline: true 
                },
                { 
                    name: '❤️ Likes', 
                    value: `${formatNumber(illust.total_bookmarks)}`, 
                    inline: true 
                },
                { 
                    name: '👁️ Views', 
                    value: `${formatNumber(illust.total_view)}`, 
                    inline: true 
                },
                { 
                    name: '📊 Type', 
                    value: illust.type === 'illust' ? 'Illustration' : illust.type === 'manga' ? 'Manga' : 'Ugoira', 
                    inline: true 
                }
            );

        // Add tags field
        if (illust.tags && illust.tags.length > 0) {
            const tagsList = illust.tags.slice(0, 10).map(t => `\`${t.name}\``).join(' ');
            const moreTagsText = illust.tags.length > 10 ? ` +${illust.tags.length - 10} more` : '';
            embed.addFields({ 
                name: '🏷️ Tags', 
                value: tagsList + moreTagsText, 
                inline: false 
            });
        }

        // Add description if available
        if (illust.caption && illust.caption.trim()) {
            const cleanCaption = illust.caption.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
            if (cleanCaption.length > 0) {
                embed.addFields({ 
                    name: '📝 Description', 
                    value: cleanCaption.length > 200 ? cleanCaption.substring(0, 200) + '...' : cleanCaption, 
                    inline: false 
                });
            }
        }

        embed.setFooter({ 
            text: `Pixiv • ${illust.page_count > 1 ? `${illust.page_count} pages` : 'Single page'}`,
            iconURL: 'https://i.imgur.com/mXdyW7I.png'
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`pixiv_save_${illust.id}`)
                    .setLabel('Lưu')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('❤️'),
                new ButtonBuilder()
                    .setLabel('Xem trên Pixiv')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.pixiv.net/en/artworks/${illust.id}`)
                    .setEmoji('🔗'),
                new ButtonBuilder()
                    .setLabel('Artist Profile')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.pixiv.net/en/users/${illust.user.id}`)
                    .setEmoji('👤')
            );
        
        // Add to cache
        if (recentlySent.size >= CACHE_SIZE) {
            const oldestEntry = recentlySent.values().next().value;
            recentlySent.delete(oldestEntry);
        }
        recentlySent.add(illust.id);

        await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
    } catch (error) {
        console.error("Failed to send illust embed:", error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi tải hoặc hiển thị hình ảnh.' });
    }
}

async function sendPaginatedCollection(interaction, sessionId, page) {
    const session = paginationSessions.get(sessionId);
    if (!session) {
        return interaction.editReply({ content: 'Phiên xem đã hết hạn. Vui lòng thử lại lệnh.', components: [] });
    }

    const { illusts } = session;
    const totalPages = illusts.length;
    const currentPage = Math.max(0, Math.min(page, totalPages - 1));
    
    // Update session
    session.currentPage = currentPage;

    const illust = illusts[currentPage];

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
        const attachment = new AttachmentBuilder(imageBuffer, { name: imageName });

        // Format numbers
        const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        // Create embed for collection view
        const embed = new EmbedBuilder()
            .setTitle(`💝 ${illust.title}`)
            .setURL(`https://www.pixiv.net/en/artworks/${illust.id}`)
            .setColor('#FF69B4')
            .setImage(`attachment://${imageName}`)
            .setAuthor({
                name: illust.user.name,
                url: `https://www.pixiv.net/en/users/${illust.user.id}`,
                iconURL: illust.user.profile_image_urls.medium.replace('i.pximg.net', 'i.pixiv.cat')
            })
            .addFields(
                { name: '👤 Artist', value: `[${illust.user.name}](https://www.pixiv.net/en/users/${illust.user.id})`, inline: true },
                { name: '❤️ Likes', value: `${formatNumber(illust.total_bookmarks)}`, inline: true },
                { name: '👁️ Views', value: `${formatNumber(illust.total_view)}`, inline: true }
            );

        // Add tags
        if (illust.tags && illust.tags.length > 0) {
            const tagsList = illust.tags.slice(0, 8).map(t => `\`${t.name}\``).join(' ');
            embed.addFields({ name: '🏷️ Tags', value: tagsList, inline: false });
        }

        embed.setFooter({ 
            text: `Bộ sưu tập • Trang ${currentPage + 1}/${totalPages}`,
            iconURL: 'https://i.imgur.com/mXdyW7I.png'
        });

        // Create navigation buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`pixiv_collection_first_${sessionId}`)
                    .setLabel('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId(`pixiv_collection_prev_${sessionId}`)
                    .setLabel('◀️ Trước')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId(`pixiv_collection_page_${sessionId}`)
                    .setLabel(`${currentPage + 1}/${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`pixiv_collection_next_${sessionId}`)
                    .setLabel('Sau ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages - 1),
                new ButtonBuilder()
                    .setCustomId(`pixiv_collection_last_${sessionId}`)
                    .setLabel('⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === totalPages - 1)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Xem trên Pixiv')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.pixiv.net/en/artworks/${illust.id}`)
                    .setEmoji('🔗'),
                new ButtonBuilder()
                    .setCustomId(`pixiv_remove_${sessionId}_${illust.id}`)
                    .setLabel('Xóa khỏi bộ sưu tập')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );

        await interaction.editReply({ 
            embeds: [embed], 
            files: [attachment], 
            components: [row, row2] 
        });

    } catch (error) {
        console.error("Failed to send paginated collection:", error);
        await interaction.editReply({ 
            content: 'Đã xảy ra lỗi khi hiển thị bộ sưu tập.', 
            components: [] 
        });
    }
}

function cleanOldSessions() {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    
    for (const [sessionId, session] of paginationSessions.entries()) {
        if (now - session.createdAt > fifteenMinutes) {
            paginationSessions.delete(sessionId);
        }
    }
}

// Export handler for button interactions
module.exports.handleButtonInteraction = async (interaction) => {
    if (!interaction.isButton()) return false;

    const customId = interaction.customId;

    // Handle save button
    if (customId.startsWith('pixiv_save_')) {
        const illustId = customId.split('_')[2];
        try {
            await refreshToken();
            await pixiv.illustBookmarkAdd(illustId);
            await interaction.reply({ 
                content: '✅ Đã lưu ảnh vào bộ sưu tập của bạn!', 
                ephemeral: true 
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ Không thể lưu ảnh. Có thể bạn đã lưu ảnh này rồi.', 
                ephemeral: true 
            });
        }
        return true;
    }

    // Handle collection navigation
    if (customId.startsWith('pixiv_collection_')) {
        const parts = customId.split('_');
        const action = parts[2];
        const sessionId = parts.slice(3).join('_');

        const session = paginationSessions.get(sessionId);
        if (!session) {
            await interaction.reply({ 
                content: 'Phiên xem đã hết hạn. Vui lòng dùng lệnh `/pixiv bosuutap` lại.', 
                ephemeral: true 
            });
            return true;
        }

        // Check if user owns this session
        if (session.userId !== interaction.user.id) {
            await interaction.reply({ 
                content: 'Bạn không thể điều khiển bộ sưu tập của người khác!', 
                ephemeral: true 
            });
            return true;
        }

        await interaction.deferUpdate();

        let newPage = session.currentPage;
        const totalPages = session.illusts.length;

        switch (action) {
            case 'first':
                newPage = 0;
                break;
            case 'prev':
                newPage = Math.max(0, session.currentPage - 1);
                break;
            case 'next':
                newPage = Math.min(totalPages - 1, session.currentPage + 1);
                break;
            case 'last':
                newPage = totalPages - 1;
                break;
        }

        await sendPaginatedCollection(interaction, sessionId, newPage);
        return true;
    }

    // Handle remove from collection
    if (customId.startsWith('pixiv_remove_')) {
        const parts = customId.split('_');
        const illustId = parts[parts.length - 1];
        
        try {
            await refreshToken();
            await pixiv.illustBookmarkDelete(illustId);
            await interaction.reply({ 
                content: '✅ Đã xóa ảnh khỏi bộ sưu tập!', 
                ephemeral: true 
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ Không thể xóa ảnh khỏi bộ sưu tập.', 
                ephemeral: true 
            });
        }
        return true;
    }

    return false;
};