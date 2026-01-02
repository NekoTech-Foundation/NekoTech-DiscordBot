const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const { getConfig } = require('../../../utils/configLoader.js');

const config = getConfig();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('r34')
        .setDescription('Tìm hình ảnh trên Rule34 (Yêu cầu kênh NSFW).')
        .addStringOption(option =>
            option.setName('tags')
                .setDescription('Tìm kiếm bằng tag, thay dấu cách bằng _ (v.d., "khoa_so_ma").')
                .setRequired(true))
        .setNSFW(true),
    category: 'Fun',
    async execute(interaction) {
        const tagsString = interaction.options.getString('tags');
        
        await interaction.deferReply();

        try {
            const params = new URLSearchParams({
                page: 'dapi',
                s: 'post',
                q: 'index',
                json: 1,
                tags: tagsString,
                limit: 100,
                user_id: config.API_Keys.Rule34.UserID,
                api_key: config.API_Keys.Rule34.ApiKey
            });

            const response = await fetch(`https://api.rule34.xxx/index.php?${params}`);
            
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            let posts = await response.json();

            if (!posts || posts.length === 0) {
                const noResultEmbed = new EmbedBuilder()
                    .setTitle('❌ Không tìm thấy kết quả')
                    .setDescription(`Không có hình ảnh nào cho tags: **${tagsString}**`)
                    .setColor('#FF0000')
                    .setTimestamp();
                
                return await interaction.editReply({ embeds: [noResultEmbed] });
            }

            // Lọc bỏ các post có ảnh bị lỗi hoặc không hợp lệ
            posts = posts.filter(post => {
                return post.file_url && 
                       (post.file_url.endsWith('.jpg') || 
                        post.file_url.endsWith('.jpeg') || 
                        post.file_url.endsWith('.png') || 
                        post.file_url.endsWith('.gif') ||
                        post.file_url.endsWith('.webp'));
            });

            if (posts.length === 0) {
                const noImageEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Không có ảnh hợp lệ')
                    .setDescription('Không tìm thấy ảnh có định dạng hợp lệ.')
                    .setColor('#FFA500')
                    .setTimestamp();
                
                return await interaction.editReply({ embeds: [noImageEmbed] });
            }

            let currentIndex = Math.floor(Math.random() * posts.length);

            const createEmbed = (post, index) => {
                // Xử lý rating
                const ratingEmoji = {
                    's': '🟢 Safe',
                    'q': '🟡 Questionable',
                    'e': '🔴 Explicit'
                };
                const rating = ratingEmoji[post.rating] || post.rating;

                // Xử lý tags - chỉ hiển thị một số tags chính
                const tagsList = post.tags ? post.tags.split(' ').slice(0, 8).join(', ') : 'N/A';
                const moreTags = post.tags ? post.tags.split(' ').length - 8 : 0;

                const embed = new EmbedBuilder()
                    .setAuthor({ 
                        name: `Rule34 - ${tagsString}`,
                        iconURL: 'https://rule34.xxx/favicon.ico'
                    })
                    .setTitle(`📸 Kết quả #${index + 1}`)
                    .setURL(`https://rule34.xxx/index.php?page=post&s=view&id=${post.id}`)
                    .setImage(post.file_url)
                    .setColor(config.EmbedColors?.Default || '#00D9FF')
                    .addFields(
                        { 
                            name: '⭐ Score', 
                            value: `\`${post.score || 0}\``, 
                            inline: true 
                        },
                        { 
                            name: '🏷️ Rating', 
                            value: rating, 
                            inline: true 
                        },
                        { 
                            name: '📊 Trang', 
                            value: `\`${index + 1}/${posts.length}\``, 
                            inline: true 
                        },
                        {
                            name: '🔖 Tags',
                            value: tagsList + (moreTags > 0 ? `\n*...và ${moreTags} tags khác*` : ''),
                            inline: false
                        }
                    )
                    .setFooter({ 
                        text: `ID: ${post.id} | ${post.width}x${post.height} | Requested by ${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp();

                return embed;
            };

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('r34_first')
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('r34_prev')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('r34_random')
                        .setEmoji('🎲')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('r34_next')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('r34_last')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary)
                );

            const reply = await interaction.editReply({ 
                embeds: [createEmbed(posts[currentIndex], currentIndex)], 
                components: [row] 
            });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000 // 5 phút
            });

            collector.on('collect', async i => {
                await i.deferUpdate();
                
                switch(i.customId) {
                    case 'r34_first':
                        currentIndex = 0;
                        break;
                    case 'r34_prev':
                        currentIndex = (currentIndex - 1 + posts.length) % posts.length;
                        break;
                    case 'r34_random':
                        currentIndex = Math.floor(Math.random() * posts.length);
                        break;
                    case 'r34_next':
                        currentIndex = (currentIndex + 1) % posts.length;
                        break;
                    case 'r34_last':
                        currentIndex = posts.length - 1;
                        break;
                }

                await interaction.editReply({
                    embeds: [createEmbed(posts[currentIndex], currentIndex)],
                    components: [row]
                }).catch(console.error);
            });

            collector.on('end', () => {
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('r34_first_disabled')
                            .setEmoji('⏮️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('r34_prev_disabled')
                            .setEmoji('◀️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('r34_random_disabled')
                            .setEmoji('🎲')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('r34_next_disabled')
                            .setEmoji('▶️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('r34_last_disabled')
                            .setEmoji('⏭️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                
                interaction.editReply({ components: [disabledRow] }).catch(() => {});
            });

        } catch (error) {
            console.error('Error fetching from Rule34:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi')
                .setDescription('Đã xảy ra lỗi khi lấy dữ liệu từ Rule34.')
                .setColor('#FF0000')
                .addFields({
                    name: 'Chi tiết lỗi',
                    value: `\`\`\`${error.message}\`\`\``
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
        }
    }
};
