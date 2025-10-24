const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, Colors, MessageFlags } = require('discord.js');
const BotActivity = require('../../models/BotActivity');

const ALLOWED_USER_ID = '1316287191634149377';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botactivity')
        .setDescription('Quản lý cài đặt hoạt động của bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Thêm hoặc cập nhật một trạng thái hoạt động của bot')
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Tin nhắn trạng thái để hiển thị (hỗ trợ các placeholder)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('activity_type')
                        .setDescription('Loại hoạt động (WATCHING, PLAYING, etc.)')
                        .setRequired(true)
                        .addChoices(
                            { name: 'WATCHING', value: 'WATCHING' },
                            { name: 'PLAYING', value: 'PLAYING' },
                            { name: 'COMPETING', value: 'COMPETING' },
                            { name: 'STREAMING', value: 'STREAMING' }
                        ))
                .addStringOption(option =>
                    option.setName('status_type')
                        .setDescription('Trạng thái trực tuyến của bot (online, dnd, idle, invisible)')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Online', value: 'online' },
                            { name: 'Do Not Disturb', value: 'dnd' },
                            { name: 'Idle', value: 'idle' },
                            { name: 'Invisible', value: 'invisible' }
                        ))
                .addStringOption(option =>
                    option.setName('streaming_url')
                        .setDescription('URL streaming (chỉ cần thiết nếu loại hoạt động là STREAMING)')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Xóa một trạng thái hoạt động của bot theo chỉ mục của nó')
                .addIntegerOption(option =>
                    option.setName('index')
                        .setDescription('Chỉ mục của trạng thái để xóa (chỉ mục dựa trên 1)')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Liệt kê tất cả các trạng thái hoạt động hiện tại của bot')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('placeholders')
                .setDescription('Liệt kê tất cả các placeholder có sẵn cho các hoạt động của bot')
    ),
    category: 'Utility',
    async execute(interaction) {
        if (interaction.user.id !== ALLOWED_USER_ID) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setTitle('Từ chối quyền truy cập')
                    .setDescription('Bạn không có quyền sử dụng lệnh này.')
                ],
                ephemeral: true
            });
        }

        const subCommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        let botActivityData = await BotActivity.findOne({ guildId });

        if (!botActivityData) {
            botActivityData = new BotActivity({ guildId });
        }

        if (subCommand === 'add') {
            const status = interaction.options.getString('status');
            const activityType = interaction.options.getString('activity_type');
            const statusType = interaction.options.getString('status_type');
            const streamingURL = interaction.options.getString('streaming_url');

            botActivityData.activities.push({
                status,
                activityType,
                statusType,
                streamingURL: activityType === 'STREAMING' ? streamingURL : null
            });

            await botActivityData.save();

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle('Đã thêm hoạt động của bot')
                    .setDescription(`Một trạng thái hoạt động mới của bot đã được thêm thành công.`)
                    .addFields(
                        { name: 'Trạng thái', value: `"${status}"`, inline: true },
                        { name: 'Loại hoạt động', value: `"${activityType}"`, inline: true },
                        { name: 'Loại trạng thái', value: `"${statusType}"`, inline: true }
                    )
                    .setFooter({ text: 'Quản lý hoạt động của bot' })
                ],
                ephemeral: true
            });

        } else if (subCommand === 'remove') {
            const index = interaction.options.getInteger('index') - 1;

            if (index < 0 || index >= botActivityData.activities.length) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle('Chỉ mục không hợp lệ')
                        .setDescription('Chỉ mục được cung cấp không hợp lệ. Vui lòng cung cấp một chỉ mục trạng thái hợp lệ.')
                        .setFooter({ text: 'Sử dụng lệnh list để xem các trạng thái hiện tại.' })
                    ],
                    ephemeral: true
                });
            }

            const removedActivity = botActivityData.activities.splice(index, 1);
            await botActivityData.save();

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(Colors.Orange)
                    .setTitle('Đã xóa hoạt động của bot')
                    .setDescription(`Trạng thái hoạt động của bot đã được xóa thành công.`)
                    .addFields(
                        { name: 'Trạng thái đã xóa', value: `"${removedActivity[0].status}"`, inline: true },
                        { name: 'Loại hoạt động', value: `"${removedActivity[0].activityType}"`, inline: true }
                    )
                    .setFooter({ text: 'Quản lý hoạt động của bot' })
                ],
                ephemeral: true
            });

        } else if (subCommand === 'list') {
            if (botActivityData.activities.length === 0) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(Colors.Yellow)
                        .setTitle('Không có hoạt động nào của bot')
                        .setDescription('Hiện tại không có trạng thái hoạt động nào của bot được cấu hình.')
                        .setFooter({ text: 'Sử dụng lệnh add để cấu hình một trạng thái mới.' })
                    ],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(Colors.Blurple)
                .setTitle('Các trạng thái hoạt động của bot đã được cấu hình')
                .setDescription('Dưới đây là các trạng thái hoạt động hiện tại của bot cho máy chủ này:');

            botActivityData.activities.forEach((activity, index) => {
                let activityDetails = `**Trạng thái ${index + 1}:** 
${activity.status}
`;
                activityDetails += `**Loại:** ${activity.activityType} | **Hiện diện:** ${activity.statusType}`;

                if (activity.activityType === 'STREAMING' && activity.streamingURL) {
                    activityDetails += ` | **URL:** [Link](${activity.streamingURL})`;
                }

                embed.addFields({ name: '\u200B', value: activityDetails });
            });

            return interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subCommand === 'placeholders') {
            const placeholderList = '\n**Các placeholder có sẵn:**\n' + 
                '`{total-users}` - Tổng số thành viên trong máy chủ\n' + 
                '`{total-channels}` - Tổng số kênh trong máy chủ\n' + 
                '`{total-messages}` - Tổng số tin nhắn đã gửi\n' + 
                '`{online-members}` - Số lượng thành viên trực tuyến\n' + 
                '`{uptime}` - Thời gian hoạt động của bot\n' + 
                '`{total-boosts}` - Số lượng boost máy chủ\n' + 
                '`{total-cases}` - Tổng số trường hợp kiểm duyệt đã xử lý\n' + 
                '`{total-suggestions}` - Tổng số đề xuất đã gửi\n' + 
                '`{times-bot-started}` - Số lần bot đã khởi động\n' + 
                '`{open-tickets}` - Số lượng phiếu đang mở\n' + 
                '`{closed-tickets}` - Số lượng phiếu đã đóng\n' + 
                '`{deleted-tickets}` - Số lượng phiếu đã xóa\n' + 
                '`{total-tickets}` - Tổng số phiếu đã tạo';


            const embed = new EmbedBuilder()
                .setColor(Colors.Blurple)
                .setTitle('Các placeholder hoạt động của bot')
                .setDescription(placeholderList)
                .setFooter({ text: 'Sử dụng các placeholder này trong các hoạt động của bot của bạn' });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
