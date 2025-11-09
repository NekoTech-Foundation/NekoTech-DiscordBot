const axios = require('axios');
const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tiktok = require('@tobyg74/tiktok-api-dl');

// Hàm format số với k, M
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

async function handleTikTok(interaction, url) {
    await interaction.deferReply();

    try {
        // Thử v1 trước
        let downloaderResponse = await tiktok.Downloader(url, { version: "v1" });
        
        // Nếu v1 fail, thử v2
        if (downloaderResponse.status === 'error') {
            downloaderResponse = await tiktok.Downloader(url, { version: "v2" });
        }
        
        // Nếu v2 fail, thử v3
        if (downloaderResponse.status === 'error') {
            downloaderResponse = await tiktok.Downloader(url, { version: "v3" });
        }

        if (downloaderResponse.status === 'error' || !downloaderResponse.result) {
            return interaction.editReply('Không thể lấy video từ link TikTok này. Vui lòng kiểm tra lại link hoặc thử lại sau.');
        }

        const videoData = downloaderResponse.result;
        
        // Lấy video URL
        let videoUrl;
        if (videoData.video) {
            videoUrl = videoData.video.playAddr?.[0] || videoData.video.noWatermark || videoData.video[0];
        } else if (videoData.download) {
            videoUrl = videoData.download.nowm || videoData.download.wm;
        }

        if (!videoUrl) {
            return interaction.editReply('Không tìm thấy link video. Vui lòng thử lại.');
        }

        // Tải video về
        const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const videoBuffer = Buffer.from(videoResponse.data);
        
        // Kiểm tra kích thước file
        const fileSizeMB = videoBuffer.length / (1024 * 1024);
        
        if (fileSizeMB > 25) {
            // File quá lớn
            const authorName = videoData.author?.nickname || 'Unknown';
            const authorUsername = videoData.author?.uniqueId || videoData.author?.username || 'unknown';
            const description = videoData.desc || 'No description';
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ 
                    name: `${authorName} (@${authorUsername})`,
                    iconURL: videoData.author?.avatarThumb?.[0]
                })
                .setDescription(description)
                .setFooter({ text: `⚠️ File quá lớn (${fileSizeMB.toFixed(2)}MB) - Click nút bên dưới để tải` });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Tải Video')
                        .setStyle(ButtonStyle.Link)
                        .setURL(videoUrl),
                    new ButtonBuilder()
                        .setCustomId(`repost-delete-${interaction.user.id}`)
                        .setLabel('Delete')
                        .setStyle(ButtonStyle.Danger)
                );

            return interaction.editReply({ embeds: [embed], components: [row] });
        }

        // Upload video trực tiếp
        const attachment = new AttachmentBuilder(videoBuffer, { name: 'tiktok_video.mp4' });

        // Lấy thông tin
        const authorName = videoData.author?.nickname || 'Unknown';
        const authorUsername = videoData.author?.uniqueId || videoData.author?.username || 'unknown';
        const description = videoData.desc || 'No description';
        
        // Lấy statistics
        const stats = videoData.statistics || {};
        const likes = formatNumber(stats.likeCount || 0);
        const views = formatNumber(stats.playCount || 0);
        const comments = formatNumber(stats.commentCount || 0);
        const shares = formatNumber(stats.shareCount || 0);

        const embed = new EmbedBuilder()
            .setColor('#000000')
            .setAuthor({ 
                name: `${authorName} (@${authorUsername})`,
                iconURL: videoData.author?.avatarThumb?.[0],
                url: videoData.author?.url || `https://www.tiktok.com/@${authorUsername}`
            })
            .setDescription(description)
            .setFooter({ text: `❤️ ${likes} • 👁️ ${views} • 🗨️ ${comments} • 🔄 ${shares}` })
            .setTimestamp(new Date(videoData.createTime * 1000));

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`repost-info-${encodeURIComponent(url)}`)
                    .setLabel('Info')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`repost-delete-${interaction.user.id}`)
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.editReply({
            embeds: [embed],
            files: [attachment],
            components: [row]
        });

    } catch (error) {
        console.error('Lỗi khi lấy video TikTok:', error);
        await interaction.editReply('Đã có lỗi xảy ra khi đang xử lý video TikTok. Vui lòng thử lại sau.');
    }
}

async function handleYouTube(interaction, url) {
    await interaction.deferReply();

    try {
        await interaction.editReply(`Reposting YouTube video:\n${url}`);
    } catch (error) {
        console.error('Lỗi khi xử lý video YouTube:', error);
        await interaction.editReply('Đã có lỗi xảy ra khi đang xử lý video YouTube.');
    }
}

module.exports = {
    handleTikTok,
    handleYouTube,
};