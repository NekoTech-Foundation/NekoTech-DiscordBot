const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Quản lý Bot (Dành cho Owner)')
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('Upload file config.yml mới')
                .addAttachmentOption(opt => opt.setName('file').setDescription('File config.yml').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('avatar')
                .setDescription('Đổi Avatar Bot')
                .addAttachmentOption(opt => opt.setName('image').setDescription('Ảnh mới').setRequired(true))
        )
        .addSubcommandGroup(group =>
            group.setName('activity')
                .setDescription('Quản lý trạng thái hoạt động (Activity Status)')
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('Xem danh sách hoạt động hiện tại')
                )
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Thêm hoạt động mới')
                        .addStringOption(opt => opt.setName('text').setDescription('Nội dung (Hỗ trợ {total-users}, {uptime}...)').setRequired(true))
                        .addStringOption(opt => opt.setName('type').setDescription('Loại').addChoices(
                            { name: 'Playing', value: 'PLAYING' },
                            { name: 'Watching', value: 'WATCHING' },
                            { name: 'Listening', value: 'LISTENING' },
                            { name: 'Competing', value: 'COMPETING' }
                        ))
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Xóa hoạt động')
                        .addIntegerOption(opt => opt.setName('index').setDescription('Số thứ tự (Xem từ lệnh /admin activity list)').setRequired(true))
                )
        )
        .addSubcommand(sub =>
            sub.setName('restart')
                .setDescription('Khởi động lại Bot')
        ),

    async execute(interaction) {
        // Security Check: Only OwnerIDs from config can use this
        // In Whitelabel, OwnerIDs is set to [CustomerId] during creation
        if (!global.config.OwnerIDs.includes(interaction.user.id)) {
            return interaction.reply({ content: '🚫 Lệnh này chỉ dành cho Owner của bot.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'config') {
            await interaction.deferReply({ ephemeral: true });
            const attachment = interaction.options.getAttachment('file');

            if (!attachment.name.endsWith('.yml') && !attachment.name.endsWith('.yaml')) {
                return interaction.editReply('❌ Vui lòng upload file **.yml** hoặc **.yaml**.');
            }

            try {
                const response = await axios.get(attachment.url, { responseType: 'text' });
                const newConfigContent = response.data;

                // Validate YAML
                try {
                    yaml.load(newConfigContent);
                } catch (e) {
                    return interaction.editReply(`❌ File Config không hợp lệ: \n\`${e.message}\``);
                }

                fs.writeFileSync(path.join(process.cwd(), 'config.yml'), newConfigContent);

                await interaction.editReply('✅ Đã cập nhật Config thành công! Đang khởi động lại...');
                process.exit(0); // PM2 will restart
            } catch (error) {
                console.error(error);
                return interaction.editReply('❌ Lỗi khi tải file.');
            }

        } else if (sub === 'avatar') {
            await interaction.deferReply();
            const image = interaction.options.getAttachment('image');

            try {
                await interaction.client.user.setAvatar(image.url);
                return interaction.editReply('✅ Đã đổi Avatar thành công!');
            } catch (error) {
                return interaction.editReply(`❌ Lỗi: ${error.message}. (Lưu ý: Bạn không thể đổi avatar quá nhanh).`);
            }

        } else if (sub === 'activity') { // Handle Subcommand Group? No, check group logic
            // In djs v14, we check subGroup first? No, interaction.options.getSubcommand() works if unique?
            // Wait, for groups, we usually check getSubcommandGroup()
        }

        // Proper handling for djs v14 nested commands
        const group = interaction.options.getSubcommandGroup(false);
        const subCmd = interaction.options.getSubcommand();

        if (group === 'activity') {
            const configPath = path.join(process.cwd(), 'config.yml');
            let config = yaml.load(fs.readFileSync(configPath, 'utf8'));

            if (!config.ActivitySettings) {
                config.ActivitySettings = { Enabled: true, Interval: 10000, Activities: [] };
            }

            if (subCmd === 'list') {
                const activities = config.ActivitySettings.Activities || [];
                if (activities.length === 0) return interaction.reply('Hiện không có activity nào.');

                const list = activities.map((a, i) => `**${i + 1}.** [${a.Type}] ${a.Text}`).join('\n');
                return interaction.reply({ content: `📋 **Danh sách Activity:**\n${list}`, ephemeral: true });

            } else if (subCmd === 'add') {
                const text = interaction.options.getString('text');
                const type = interaction.options.getString('type') || 'PLAYING';

                config.ActivitySettings.Activities.push({ Type: type, Status: 'online', Text: text });
                fs.writeFileSync(configPath, yaml.dump(config));

                return interaction.reply(`✅ Đã thêm activity: [${type}] \`${text}\`\n(Bot sẽ cập nhật sau vài giây)`);

            } else if (subCmd === 'remove') {
                const index = interaction.options.getInteger('index');
                const activities = config.ActivitySettings.Activities || [];

                if (index < 1 || index > activities.length) {
                    return interaction.reply({ content: '❌ Số thứ tự không hợp lệ.', ephemeral: true });
                }

                const removed = activities.splice(index - 1, 1);
                fs.writeFileSync(configPath, yaml.dump(config));

                return interaction.reply(`✅ Đã xóa activity: [${removed[0].Type}] \`${removed[0].Text}\``);
            }
        } else if (sub === 'restart') {
            await interaction.reply('🔄 Đang khởi động lại...');
            process.exit(0);
        }
    }
};
