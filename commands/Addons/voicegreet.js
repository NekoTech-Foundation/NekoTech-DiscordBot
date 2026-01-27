const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const VoiceGreetings = require('../../models/VoiceGreetings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voicegreet')
        .setDescription('Cấu hình tin nhắn chào/tạm biệt voice chat.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Bật tính năng chào mừng voice.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Tắt tính năng chào mừng voice.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Xem danh sách tin nhắn hiện tại.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Khôi phục tin nhắn mặc định.'))
        .addSubcommandGroup(group =>
            group
                .setName('config')
                .setDescription('Quản lý tin nhắn')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Thêm tin nhắn mới.')
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Loại tin nhắn')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Welcome (Chào mừng)', value: 'welcome' },
                                    { name: 'Goodbye (Tạm biệt)', value: 'goodbye' }
                                ))
                        .addStringOption(option =>
                            option.setName('message')
                                .setDescription('Nội dung tin nhắn. Hỗ trợ {user}, {channel}.')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Xóa tin nhắn.')
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Loại tin nhắn')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Welcome (Chào mừng)', value: 'welcome' },
                                    { name: 'Goodbye (Tạm biệt)', value: 'goodbye' }
                                ))
                        .addIntegerOption(option =>
                            option.setName('index')
                                .setDescription('Số thứ tự tin nhắn muốn xóa (xem lệnh /voicegreet list)')
                                .setRequired(true)))
        ),
    category: 'Addons',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup();
        const guildId = interaction.guild.id;

        // Ensure config exists
        let config = await VoiceGreetings.findOne({ guildId });
        if (!config) {
            config = await VoiceGreetings.create({ guildId });
        }

        if (!group) {
            if (subcommand === 'enable') {
                config.enabled = true;
                await config.save();
                return interaction.reply({ content: '✅ Đã bật tính năng chào mừng voice.', ephemeral: true });
            }

            if (subcommand === 'disable') {
                config.enabled = false;
                await config.save();
                return interaction.reply({ content: '❌ Đã tắt tính năng chào mừng voice.', ephemeral: true });
            }

            if (subcommand === 'reset') {
                config.welcomeMessages = JSON.stringify([
                    "Chào mừng {user} đã tham gia voice chat!",
                    "Hé lô {user}, quẩy lên nào!",
                    "Á đù, {user} đã xuất hiện tại {channel}!",
                    "Chào mừng {user} quay vào ô mất lượt... à nhầm, ô voice chat!",
                    "{user} đã xuất hiện, mọi người trật tự!",
                    "Helu {user}, hôm nay bạn thế nào?",
                    "Ui là trời, {user} tới rồi kìa!",
                    "Rồng bay phượng múa, {user} đã hiện hình!"
                ]);
                config.goodbyeMessages = JSON.stringify([
                    "Tạm biệt {user}, hẹn gặp lại!",
                    "{user} đã rời khỏi cuộc chơi.",
                    "Bye bye {user}!",
                    "{user} đã cao chạy xa bay.",
                    "Tạm biệt {user}, nhớ mang quà về nhé.",
                    "{user} đã bị bắt cóc khỏi server.",
                    "Không tiễn {user} nhé!",
                    "{user} đã đi tìm đường cứu nước."
                ]);
                await config.save();
                return interaction.reply({ content: '🔄 Đã khôi phục cài đặt mặc định với danh sách tin nhắn mới.', ephemeral: true });
            }

            if (subcommand === 'list') {
                const welcomeMessages = JSON.parse(config.welcomeMessages || "[]");
                const goodbyeMessages = JSON.parse(config.goodbyeMessages || "[]");

                const embed = new EmbedBuilder()
                    .setTitle('Cấu hình Voice Greetings')
                    .setColor('#0099ff')
                    .addFields(
                        { name: 'Trạng thái', value: config.enabled ? '✅ Đang bật' : '❌ Đang tắt', inline: true },
                        { name: '\u200B', value: '\u200B', inline: true }, // Spacer
                        { name: 'Welcome Messages', value: welcomeMessages.length > 0 ? welcomeMessages.map((msg, i) => `**${i + 1}.** ${msg}`).join('\n') : 'Không có tin nhắn nào.' },
                        { name: 'Goodbye Messages', value: goodbyeMessages.length > 0 ? goodbyeMessages.map((msg, i) => `**${i + 1}.** ${msg}`).join('\n') : 'Không có tin nhắn nào.' }
                    )
                    .setFooter({ text: 'Sử dụng /voicegreet config add/remove để chỉnh sửa.' });

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        if (group === 'config') {
            const type = interaction.options.getString('type');

            if (subcommand === 'add') {
                const message = interaction.options.getString('message');
                let messages = [];

                if (type === 'welcome') {
                    messages = JSON.parse(config.welcomeMessages || "[]");
                    messages.push(message);
                    config.welcomeMessages = JSON.stringify(messages);
                } else {
                    messages = JSON.parse(config.goodbyeMessages || "[]");
                    messages.push(message);
                    config.goodbyeMessages = JSON.stringify(messages);
                }

                await config.save();
                return interaction.reply({ content: `✅ Đã thêm tin nhắn ${type}: "${message}"`, ephemeral: true });
            }

            if (subcommand === 'remove') {
                const index = interaction.options.getInteger('index') - 1;
                let messages = [];
                let removedMsg = "";

                if (type === 'welcome') {
                    messages = JSON.parse(config.welcomeMessages || "[]");
                    if (index < 0 || index >= messages.length) return interaction.reply({ content: '❌ Số thứ tự không hợp lệ.', ephemeral: true });
                    removedMsg = messages.splice(index, 1)[0];
                    config.welcomeMessages = JSON.stringify(messages);
                } else {
                    messages = JSON.parse(config.goodbyeMessages || "[]");
                    if (index < 0 || index >= messages.length) return interaction.reply({ content: '❌ Số thứ tự không hợp lệ.', ephemeral: true });
                    removedMsg = messages.splice(index, 1)[0];
                    config.goodbyeMessages = JSON.stringify(messages);
                }

                await config.save();
                return interaction.reply({ content: `🗑️ Đã xóa tin nhắn ${type}: "${removedMsg}"`, ephemeral: true });
            }
        }
    }
};
