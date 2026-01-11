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
        .addSubcommandGroup(group =>
            group.setName('economy')
                .setDescription('Quản lý kinh tế người dùng')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Cộng tiền cho người dùng')
                        .addUserOption(opt => opt.setName('user').setDescription('Người nhận').setRequired(true))
                        .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Trừ tiền người dùng')
                        .addUserOption(opt => opt.setName('user').setDescription('Người bị trừ').setRequired(true))
                        .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('set')
                        .setDescription('Đặt lại số tiền của người dùng')
                        .addUserOption(opt => opt.setName('user').setDescription('Người dùng').setRequired(true))
                        .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền mới').setRequired(true))
                )
        )
        .addSubcommandGroup(group =>
            group.setName('users')
                .setDescription('Quản lý quyền Admin (AdminIDs)')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Thêm người dùng vào danh sách Admin')
                        .addUserOption(opt => opt.setName('user').setDescription('Người được thêm').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Xóa người dùng khỏi danh sách Admin')
                        .addUserOption(opt => opt.setName('user').setDescription('Người bị xóa').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('Xem danh sách Admin hiện tại')
                )
        )
        .addSubcommand(sub =>
            sub.setName('restart')
                .setDescription('Khởi động lại Bot')
        ),

    async execute(interaction) {
        // Security Check: OwnerIDs OR AdminIDs
        const owners = global.config.OwnerIDs || [];
        const admins = global.config.AdminIDs || [];

        if (!owners.includes(interaction.user.id) && !admins.includes(interaction.user.id)) {
            return interaction.reply({ content: '🚫 Bạn không có quyền sử dụng lệnh này.', ephemeral: true });
        }

        const group = interaction.options.getSubcommandGroup();
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

        } else if (group === 'activity') {
            const activitySub = sub;
            const configPath = path.join(process.cwd(), 'config.yml');
            let config = yaml.load(fs.readFileSync(configPath, 'utf8'));

            if (!config.ActivitySettings) {
                config.ActivitySettings = { Enabled: true, Interval: 10000, Activities: [] };
            }

            if (activitySub === 'list') {
                const activities = config.ActivitySettings.Activities || [];
                if (activities.length === 0) return interaction.reply('📭 Chưa có activity nào được cài đặt.');

                const list = activities.map((a, i) => `**${i + 1}.** [${a.Type}] ${a.Text} (${a.Status})`).join('\n');
                return interaction.reply({
                    embeds: [new EmbedBuilder().setTitle('Danh sách Activity').setDescription(list).setColor('Blue')]
                });

            } else if (activitySub === 'add') {
                const text = interaction.options.getString('text');
                const type = interaction.options.getString('type') || 'PLAYING';

                const newActivity = { Type: type, Status: 'online', Text: text };
                if (!config.ActivitySettings.Activities) config.ActivitySettings.Activities = [];
                config.ActivitySettings.Activities.push(newActivity);

                fs.writeFileSync(configPath, yaml.dump(config));
                return interaction.reply(`✅ Đã thêm activity: **[${type}] ${text}**`);

            } else if (activitySub === 'remove') {
                const index = interaction.options.getInteger('index') - 1;
                const activities = config.ActivitySettings.Activities || [];

                if (index < 0 || index >= activities.length) {
                    return interaction.reply('❌ Số thứ tự không hợp lệ.');
                }

                const removed = activities.splice(index, 1);
                fs.writeFileSync(configPath, yaml.dump(config));
                return interaction.reply(`✅ Đã xóa activity: **${removed[0].Text}**`);
            }

        } else if (group === 'economy') {
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const EconomyUserData = require(path.join(process.cwd(), 'models', 'EconomyUserData'));

            let data = await EconomyUserData.findOne({ userId: user.id });
            if (!data) data = await EconomyUserData.create({ userId: user.id });

            if (sub === 'add') {
                data.balance += amount;
                await data.save();
                return interaction.reply(`✅ Đã cộng **${amount.toLocaleString()}** cho ${user}. Số dư mới: **${data.balance.toLocaleString()}**.`);
            } else if (sub === 'remove') {
                data.balance -= amount;
                if (data.balance < 0) data.balance = 0;
                await data.save();
                return interaction.reply(`✅ Đã trừ **${amount.toLocaleString()}** của ${user}. Số dư mới: **${data.balance.toLocaleString()}**.`);
            } else if (sub === 'set') {
                data.balance = amount;
                await data.save();
                return interaction.reply(`✅ Đã đặt số dư của ${user} thành **${amount.toLocaleString()}**.`);
            }

        } else if (group === 'users') {
            const user = interaction.options.getUser('user');
            const configPath = path.join(process.cwd(), 'config.yml');
            let config = yaml.load(fs.readFileSync(configPath, 'utf8'));

            if (!config.AdminIDs) config.AdminIDs = [];

            if (sub === 'add') {
                if (config.AdminIDs.includes(user.id)) return interaction.reply('⚠ Người này đã là Admin từ trước.');

                config.AdminIDs.push(user.id);
                fs.writeFileSync(configPath, yaml.dump(config));
                return interaction.reply(`✅ Đã thêm ${user} vào danh sách Admin.`);

            } else if (sub === 'remove') {
                if (!config.AdminIDs.includes(user.id)) return interaction.reply('⚠ Người này không có trong danh sách Admin.');

                config.AdminIDs = config.AdminIDs.filter(id => id !== user.id);
                fs.writeFileSync(configPath, yaml.dump(config));
                return interaction.reply(`✅ Đã xóa ${user} khỏi danh sách Admin.`);

            } else if (sub === 'list') {
                if (config.AdminIDs.length === 0) return interaction.reply('📭 Danh sách Admin trống.');

                const list = config.AdminIDs.map((id, i) => `**${i + 1}.** <@${id}> (${id})`).join('\n');
                return interaction.reply({
                    embeds: [new EmbedBuilder().setTitle('Danh sách Admin (AdminIDs)').setDescription(list).setColor('Gold')]
                });
            }

        } else if (sub === 'restart') {
            await interaction.reply('🔄 Đang khởi động lại...');
            process.exit(0);
        }
    }
};
