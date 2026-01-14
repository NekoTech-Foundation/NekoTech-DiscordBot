const { SlashCommandBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const Greetings = require('../../../models/Greetings');
const { buildWelcomeMessage, buildGoodbyeMessage } = require('./greetingsUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('greetings')
        .setDescription('👋 Quản lý tin nhắn Chào mừng & Tạm biệt')
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome')
                .setDescription('📥 Cài đặt tin nhắn Chào mừng (Welcome)')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('📢 Kênh gửi tin nhắn')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome-embed')
                .setDescription('✨ Nhập tin nhắn chào mừng (Embed Builder) - Có upload ảnh')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('📢 Kênh gửi tin nhắn')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Tiêu đề Embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Nội dung embed (dùng {newline} để xuống dòng, {user_mention}...)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Màu Embed (Hex code, vd: #FF0000)')
                        .setRequired(false))
                .addAttachmentOption(option =>
                    option.setName('image')
                        .setDescription('Upload ảnh cho Embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('thumbnail')
                        .setDescription('Link Thumbnail (hoặc để {user_avatar})')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer')
                        .setDescription('Footer text')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('button_label')
                        .setDescription('Tên hiển thị của nút (Button)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('button_url')
                        .setDescription('Đường dẫn link của nút (URL)')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbye')
                .setDescription('📤 Cài đặt tin nhắn Tạm biệt (Goodbye)')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('📢 Kênh gửi tin nhắn')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome-clear')
                .setDescription('🗑️ Xóa cấu hình Chào mừng')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbye-clear')
                .setDescription('🗑️ Xóa cấu hình Tạm biệt')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome-test')
                .setDescription('🧪 Gửi thử tin nhắn Chào mừng')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbye-test')
                .setDescription('🧪 Gửi thử tin nhắn Tạm biệt')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('❓ Xem hướng dẫn sử dụng')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'help') {
            const helpEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📋 Trợ Giúp Lệnh Greetings')
                .setDescription('Hệ thống tin nhắn chào mừng và tạm biệt cho máy chủ của bạn.')
                .addFields(
                    {
                        name: '🔧 Các Lệnh',
                        value: '`/greetings welcome` - Cấu hình tin nhắn chào mừng\n' +
                            '`/greetings goodbye` - Cấu hình tin nhắn tạm biệt\n' +
                            '`/greetings welcome-test` - Kiểm tra tin nhắn chào mừng\n' +
                            '`/greetings goodbye-test` - Kiểm tra tin nhắn tạm biệt\n' +
                            '`/greetings welcome-clear` - Xóa cấu hình chào mừng\n' +
                            '`/greetings goodbye-clear` - Xóa cấu hình tạm biệt'
                    },
                    {
                        name: '📝 Placeholders Người Dùng',
                        value: '`{user_mention}` - Mention người dùng\n' +
                            '`{user_name}` - Tên người dùng\n' +
                            '`{user_tag}` - Tag người dùng (name#0000)\n' +
                            '`{user_id}` - ID người dùng\n' +
                            '`{user_created}` - Ngày tạo tài khoản\n' +
                            '`{user_invite}` - Người mời (nếu có)'
                    },
                    {
                        name: '🏠 Placeholders Máy Chủ',
                        value: '`{server_name}` - Tên máy chủ\n' +
                            '`{server_id}` - ID máy chủ\n' +
                            '`{server_membercount}` - Tổng số thành viên\n' +
                            '`{server_membercount_nobots}` - Số thành viên (không bao gồm bot)\n' +
                            '`{server_created}` - Ngày tạo máy chủ\n' +
                            '`{member_position}` - Vị trí thành viên (thứ mấy)'
                    },
                    {
                        name: '🎨 Định Dạng Embed',
                        value: 'Để tạo embed, sử dụng cú pháp JSON trong modal:\n' +
                            '```json\n' +
                            '{\n' +
                            '  "title": "Chào mừng!",\n' +
                            '  "description": "Chào mừng {user_mention}!",\n' +
                            '  "color": "#00ff00",\n' +
                            '  "thumbnail": "{user_avatar}",\n' +
                            '  "fields": [\n' +
                            '    {"name": "Thành viên số", "value": "{member_position}", "inline": true}\n' +
                            '  ],\n' +
                            '  "footer": "{server_name}"\n' +
                            '}```'
                    },
                    {
                        name: '💡 Lưu Ý',
                        value: '• Để TRỐNG modal nhập `[blank]` để sử dụng embed mặc định.\n' +
                            '• Bắt đầu tin nhắn bằng `[text]` để gửi tin nhắn văn bản thuần túy (không embed).\n' +
                            '• Nếu nhập JSON không hợp lệ hoặc không bắt đầu bằng `[text]`, tin nhắn sẽ được gửi dưới dạng văn bản thuần túy.\n' +
                            '• Có thể dùng `{newline}` để xuống dòng.\n' +
                            '• Bot cần quyền gửi tin nhắn và embed trong kênh được chọn.'
                    }
                )
                .setFooter({ text: 'Sử dụng /greetings <subcommand> để bắt đầu' })
                .setTimestamp();

            return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        }

        if (subcommand === 'welcome') {
            const channel = interaction.options.getChannel('channel');

            const modal = new ModalBuilder()
                .setCustomId(`welcome-modal-${channel.id}`)
                .setTitle('Đặt tin nhắn chào mừng');

            const messageInput = new TextInputBuilder()
                .setCustomId('welcome-message')
                .setLabel('Tin nhắn chào mừng (Text hoặc JSON)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Nhập text thường hoặc JSON embed...\nVí dụ: Chào mừng {user_mention} đến với {server_name}!');

            const actionRow = new ActionRowBuilder().addComponents(messageInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } else if (subcommand === 'welcome-embed') {
            const channel = interaction.options.getChannel('channel');
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color') || '#00ff00';
            const image = interaction.options.getAttachment('image');
            const thumbnail = interaction.options.getString('thumbnail');
            const footer = interaction.options.getString('footer');
            const btnLabel = interaction.options.getString('button_label');
            const btnUrl = interaction.options.getString('button_url');

            const embedData = {};
            if (title) embedData.title = title;
            if (description) embedData.description = description;
            if (color) embedData.color = color;
            if (image) embedData.image = image.url; // Use attachment URL
            if (thumbnail) embedData.thumbnail = thumbnail;
            if (footer) embedData.footer = footer;

            // Auto add User Avatar as thumbnail if not specified? 
            // User requested "custom", so let's stick to what they provided.
            // But maybe default to {user_avatar} if they explicitly say "default"? 
            // Better to let them use {user_avatar} in the string.

            if (btnLabel && btnUrl) {
                // Basic URL validation
                if (!btnUrl.startsWith('http')) {
                    return interaction.reply({ content: '❌ URL nút phải bắt đầu bằng http:// hoặc https://', ephemeral: true });
                }
                embedData.buttons = [
                    { label: btnLabel, url: btnUrl }
                ];
            }

            // Fallback if empty
            if (Object.keys(embedData).length === 0) {
                return interaction.reply({ content: '❌ Bạn phải cung cấp ít nhất một nội dung (tiêu đề, mô tả, ảnh...)', ephemeral: true });
            }

            const jsonString = JSON.stringify(embedData);

            await Greetings.findOneAndUpdate(
                { guildId },
                { welcomeChannel: channel.id, welcomeMessage: jsonString },
                { upsert: true, new: true }
            );

            await interaction.reply({
                content: `✅ Đã cập nhật tin nhắn chào mừng (Embed Build) cho kênh ${channel}.\nDùng \`/greetings welcome-test\` để xem trước.`,
                ephemeral: true
            });

        } else if (subcommand === 'goodbye') {
            const channel = interaction.options.getChannel('channel');

            const modal = new ModalBuilder()
                .setCustomId(`goodbye-modal-${channel.id}`)
                .setTitle('Đặt tin nhắn tạm biệt');

            const messageInput = new TextInputBuilder()
                .setCustomId('goodbye-message')
                .setLabel('Tin nhắn tạm biệt (Text hoặc JSON)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Nhập text thường hoặc JSON embed...\nVí dụ: Tạm biệt {user_name}!');

            const actionRow = new ActionRowBuilder().addComponents(messageInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } else if (subcommand === 'welcome-clear') {
            await Greetings.findOneAndUpdate({ guildId }, { welcomeMessage: null, welcomeChannel: null });
            await interaction.reply({ content: 'Đã xóa tin nhắn chào mừng.', ephemeral: true });
        } else if (subcommand === 'goodbye-clear') {
            await Greetings.findOneAndUpdate({ guildId }, { goodbyeMessage: null, goodbyeChannel: null });
            await interaction.reply({ content: 'Đã xóa tin nhắn tạm biệt.', ephemeral: true });
        } else if (subcommand === 'welcome-test') {
            const settings = await Greetings.findOne({ guildId });
            if (!settings || !settings.welcomeMessage || !settings.welcomeChannel) {
                return interaction.reply({ content: 'Tin nhắn chào mừng chưa được cấu hình.', ephemeral: true });
            }

            const channel = interaction.guild.channels.cache.get(settings.welcomeChannel);
            if (!channel) {
                return interaction.reply({ content: 'Không tìm thấy kênh chào mừng.', ephemeral: true });
            }

            const member = interaction.member;

            try {
                const messageData = await buildWelcomeMessage(settings.welcomeMessage, member, interaction.guild);
                await channel.send(messageData);
                await interaction.reply({ content: 'Đã gửi tin nhắn chào mừng thử.', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Không thể gửi tin nhắn thử. Vui lòng kiểm tra quyền của tôi trong kênh chào mừng.', ephemeral: true });
            }
        } else if (subcommand === 'goodbye-test') {
            const settings = await Greetings.findOne({ guildId });
            if (!settings || !settings.goodbyeMessage || !settings.goodbyeChannel) {
                return interaction.reply({ content: 'Tin nhắn tạm biệt chưa được cấu hình.', ephemeral: true });
            }

            const channel = interaction.guild.channels.cache.get(settings.goodbyeChannel);
            if (!channel) {
                return interaction.reply({ content: 'Không tìm thấy kênh tạm biệt.', ephemeral: true });
            }

            const member = interaction.member;

            try {
                const messageData = await buildGoodbyeMessage(settings.goodbyeMessage, member, interaction.guild);
                await channel.send(messageData);
                await interaction.reply({ content: 'Đã gửi tin nhắn tạm biệt thử.', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Không thể gửi tin nhắn thử. Vui lòng kiểm tra quyền của tôi trong kênh tạm biệt.', ephemeral: true });
            }
        }
    },
};
