/*
  _____                     _         ____          _   
 |  __ \                   | |       |  _ \        | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                              
                                              
  Cảm ơn bạn đã chọn Drako Bot!

  Nếu bạn gặp bất kỳ vấn đề nào, cần hỗ trợ, hoặc có đề xuất để cải thiện bot,
  chúng tôi mời bạn kết nối với chúng tôi trên máy chủ Discord và tạo một phiếu hỗ trợ: 

  http://discord.drakodevelopment.net
 
*/

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configLoader.js');
const config = getConfig();

/**
 * Fetch random image from Nekos API
 * @param {string} rating - Rating filter (safe, suggestive, explicit)
 * @returns {Promise<Object>} Image data with url, tags, artist, source
 */
async function fetchNekosImage(rating = 'safe') {
    try {
        const response = await fetch('https://api.nekosapi.com/v4/images/random');
        const data = await response.json();

        // Filter by rating and pick a random image
        const filteredImages = data.filter(img => img.rating === rating);

        if (filteredImages.length === 0) {
            // If no images match the rating, pick any safe image
            const safeImages = data.filter(img => img.rating === 'safe');
            return safeImages[Math.floor(Math.random() * safeImages.length)];
        }

        return filteredImages[Math.floor(Math.random() * filteredImages.length)];
    } catch (error) {
        throw new Error('Không thể lấy hình ảnh từ Nekos API');
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('image')
        .setDescription('🖼️ Tìm kiếm hình ảnh')
        .addSubcommand(subcommand =>
            subcommand
                .setName('cat')
                .setDescription('Lấy một hình ảnh ngẫu nhiên về mèo'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dog')
                .setDescription('Lấy một hình ảnh ngẫu nhiên về chó'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coffee')
                .setDescription('Lấy một hình ảnh ngẫu nhiên về cà phê'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('duck')
                .setDescription('Lấy một hình ảnh ngẫu nhiên về vịt'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('neko')
                .setDescription('🐱 Lấy hình ảnh neko girl ngẫu nhiên'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('anime')
                .setDescription('🌸 Lấy hình ảnh anime ngẫu nhiên'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('waifu')
                .setDescription('💖 Lấy hình ảnh waifu ngẫu nhiên')),
    category: 'Giải trí',
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const subcommand = interaction.options.getSubcommand();
            let imageUrl = '';
            let title = '';

            if (subcommand === 'cat') {
                const response = await fetch('http://edgecats.net/random');
                imageUrl = await response.text();
                title = 'Đây là một chú mèo ngẫu nhiên cho bạn!';
            } else if (subcommand === 'dog') {
                const response = await fetch('https://random.dog/woof.json');
                const data = await response.json();
                imageUrl = data.url;
                title = 'Đây là một chú chó ngẫu nhiên cho bạn!';
            } else if (subcommand === 'coffee') {
                const response = await fetch('https://coffee.alexflipnote.dev/random.json');
                const data = await response.json();
                imageUrl = data.file;
                title = 'Đây là một ly cà phê ngẫu nhiên cho bạn!';
            } else if (subcommand === 'duck') {
                const response = await fetch('https://random-d.uk/api/v2/random');
                const data = await response.json();
                imageUrl = data.url;
                title = 'Đây là một chú vịt ngẫu nhiên cho bạn!';
            } else if (subcommand === 'neko' || subcommand === 'anime' || subcommand === 'waifu') {
                const imageData = await fetchNekosImage('safe');

                const embed = new EmbedBuilder()
                    .setTitle(subcommand === 'neko' ? '🐱 Đây là neko girl ngẫu nhiên cho bạn!' :
                        subcommand === 'anime' ? '🌸 Đây là hình anime ngẫu nhiên cho bạn!' :
                            '💖 Đây là waifu ngẫu nhiên cho bạn!')
                    .setImage(imageData.url)
                    .setColor(config.EmbedColors);

                // Add tags if available
                if (imageData.tags && imageData.tags.length > 0) {
                    embed.addFields({
                        name: '🏷️ Tags',
                        value: imageData.tags.slice(0, 10).join(', '),
                        inline: false
                    });
                }

                // Add artist if available
                if (imageData.artist_name) {
                    embed.addFields({
                        name: '🎨 Artist',
                        value: imageData.artist_name,
                        inline: true
                    });
                }

                // Add footer with source
                if (imageData.source_url) {
                    embed.setFooter({ text: 'Powered by Nekos API • Click to view source' });
                    embed.setURL(imageData.source_url);
                } else {
                    embed.setFooter({ text: 'Powered by Nekos API' });
                }

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setImage(imageUrl)
                .setColor(config.EmbedColors);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(`Lỗi khi lấy hình ảnh ${subcommand}: `, error);
            await interaction.editReply({ content: `Hiện tại không thể lấy được hình ảnh ${subcommand}.` });
        }
    }
};