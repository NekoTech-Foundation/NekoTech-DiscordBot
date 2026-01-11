const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const WhitelabelManager = require('../../utils/whitelabelManager');
const WhitelabelModel = require('../../models/Whitelabel');
const { getConfig } = require('../../utils/configLoader');
const path = require('path');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelabel')
        .setDescription('Quản lý hệ thống Whitelabel (Owner Only)')
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Tạo một instance bot riêng')
                .addUserOption(opt => opt.setName('user').setDescription('Khách hàng').setRequired(true))
                .addStringOption(opt => opt.setName('token').setDescription('Bot Token').setRequired(true))
                .addStringOption(opt => opt.setName('client_id').setDescription('Application ID').setRequired(true))
                .addStringOption(opt => opt.setName('bot_name').setDescription('Tên bot (Optional)').setRequired(false))
                .addIntegerOption(opt => opt.setName('days').setDescription('Thời hạn (Default: 30)').setRequired(false))
                .addIntegerOption(opt => opt.setName('minutes').setDescription('Thời hạn theo phút (Test only)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Xóa vĩnh viễn một instance')
                .addUserOption(opt => opt.setName('user').setDescription('Khách hàng').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('terminate')
                .setDescription('Chấm dứt dịch vụ instance (Gửi thông báo & Xóa)')
                .addUserOption(opt => opt.setName('user').setDescription('Khách hàng').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Lý do chấm dứt').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('Xem thông tin instance')
                .addUserOption(opt => opt.setName('user').setDescription('Khách hàng').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('extend')
                .setDescription('Gia hạn thời gian')
                .addUserOption(opt => opt.setName('user').setDescription('Khách hàng').setRequired(true))
                .addIntegerOption(opt => opt.setName('days').setDescription('Số ngày cộng thêm (có thể nhập số âm)').setRequired(false))
                .addIntegerOption(opt => opt.setName('hours').setDescription('Số giờ cộng thêm').setRequired(false))
                .addIntegerOption(opt => opt.setName('minutes').setDescription('Số phút cộng thêm').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('Chỉnh sửa config.yml của instance')
                .addUserOption(opt => opt.setName('user').setDescription('Khách hàng').setRequired(true))
                .addStringOption(opt => opt.setName('key').setDescription('Key (ví dụ: BotName, EmbedColors.Default)').setRequired(true))
                .addStringOption(opt => opt.setName('value').setDescription('Value').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('control')
                .setDescription('Start/Stop/Restart instance')
                .addUserOption(opt => opt.setName('user').setDescription('Khách hàng').setRequired(true))
                .addStringOption(opt => opt.setName('action').setDescription('Action').setRequired(true).addChoices(
                    { name: 'Start', value: 'start' },
                    { name: 'Stop', value: 'stop' },
                    { name: 'Restart', value: 'restart' }
                ))
        )
        .addSubcommand(sub =>
            sub.setName('update')
                .setDescription('Cập nhật code mới nhất từ Main Bot cho instance này')
                .addUserOption(opt => opt.setName('user').setDescription('Khách hàng').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('update-all')
                .setDescription('Cập nhật code cho TẤT CẢ instance (Cẩn thận!)')
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Danh sách các instance đang hoạt động')
        ),

    async execute(interaction) {
        console.log('[Whitelabel] Command Executed');
        const config = getConfig();
        if (!config.OwnerIDs.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ Chỉ Owner mới được dùng lệnh này.', ephemeral: true });
        }

        // Increase timeout for updates
        console.log('[Whitelabel] Calling deferReply...');
        await interaction.deferReply();
        console.log('[Whitelabel] deferReply returned.');

        const sub = interaction.options.getSubcommand();
        console.log(`[Whitelabel] Subcommand: ${sub}`);

        if (sub === 'create') {
            const user = interaction.options.getUser('user');
            const token = interaction.options.getString('token');
            const clientId = interaction.options.getString('client_id');
            const botName = interaction.options.getString('bot_name') || `${user.username}'s Bot`;
            const days = interaction.options.getInteger('days') || 30;
            const minutes = interaction.options.getInteger('minutes') || 0;

            // Check if exists
            console.log(`[Whitelabel] Checking DB for existing instance (User: ${user.id})...`);
            const existing = await WhitelabelModel.findOne({ userId: user.id });
            console.log(`[Whitelabel] DB Check Result:`, existing ? 'Found' : 'Null');
            if (existing) {
                return interaction.editReply(`❌ User ${user.tag} đã có một instance rồi.`);
            }

            console.log('[Whitelabel] Sending initial editReply...');
            await interaction.editReply(`⏳ Đang tạo instance cho **${user.tag}**... (Copy source, setup config, start PM2)`);

            console.log(`[Whitelabel] Manager.createInstance calling for ${user.id} with ${days} days, ${minutes} minutes...`);
            const result = await WhitelabelManager.createInstance(user.id, token, clientId, botName, days, minutes);
            console.log(`[Whitelabel] Manager.createInstance returned:`, result);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Whitelabel Instance Created')
                    .setColor('Green')
                    .addFields(
                        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                        { name: 'PM2 Name', value: result.pm2Name, inline: true },
                        { name: 'Path', value: `\`${result.path}\``, inline: false },
                        { name: 'Status', value: 'Started', inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ content: null, embeds: [embed] });

                // Send DM to User
                try {
                    const configPath = path.join(result.path, 'config.yml');
                    const managerCmdName = "admin"; // Based on templates/whitelabel/manager.js

                    await user.send({
                        content: `🎉 **Bot Whitelabel của bạn đã được khởi tạo thành công!**
                        
**Thông tin:**
- **Bot Name**: ${botName}
- **Token**: \`${token.substring(0, 10)}...\`
- **Client ID**: \`${clientId}\`

**Hướng dẫn Cấu hình:**
1. Tải file \`config.yml\` đính kèm bên dưới về máy.
2. Chỉnh sửa các thông số theo ý muốn (đọc kỹ chú thích trong file).
3. Sử dụng lệnh \`/${managerCmdName} config\` trên server của bạn và upload file config đã sửa.
4. Bot sẽ tự động khởi động lại với cấu hình mới.

Ngoài ra, bạn có thể dùng \`/${managerCmdName} avatar\` và \`/${managerCmdName} status\` để quản lý bot.
`,
                        files: [configPath]
                    });

                    interaction.followUp({ content: '📧 Đã gửi file config và hướng dẫn vào DM của khách hàng.', ephemeral: true });

                } catch (e) {
                    console.error('Failed to send DM to user:', e);
                    interaction.followUp({ content: `⚠️ Instance đã tạo nhưng không thể gửi DM cho user (User khóa DM?).`, ephemeral: true });
                }

                return;
            } else {
                return interaction.editReply(`❌ Có lỗi xảy ra: \`${result.error}\``);
            }
        } else if (sub === 'update') {
            const user = interaction.options.getUser('user');
            interaction.editReply(`⏳ Đang cập nhật hệ thống cho **${user.tag}**...`);

            const res = await WhitelabelManager.updateInstance(user.id);
            if (res.success) {
                interaction.editReply(`✅ Đã cập nhật xong cho **${user.tag}**. Bot đã được restart.`);
            } else {
                interaction.editReply(`❌ Lỗi cập nhật: ${res.error}`);
            }

        } else if (sub === 'update-all') {
            interaction.editReply(`⏳ Đang cập nhật toàn bộ hệ thống Whitelabel... (Quá trình này có thể mất thời gian)`);
            const res = await WhitelabelManager.updateAllInstances();
            interaction.editReply(`✅ Hoàn tất.\n- Thành công: **${res.success}**\n- Thất bại: **${res.failed}**\n${res.errors.length > 0 ? `Lỗi:\n${res.errors.join('\n')}` : ''}`);

        } else if (sub === 'list') {
            const user = interaction.options.getUser('user');
            const token = interaction.options.getString('token');
            const clientId = interaction.options.getString('client_id');
            const botName = interaction.options.getString('bot_name') || `${user.username}'s Bot`;

            // Check if exists
            console.log(`[Whitelabel] Checking DB for existing instance (User: ${user.id})...`);
            const existing = await WhitelabelModel.findOne({ userId: user.id });
            console.log(`[Whitelabel] DB Check Result:`, existing ? 'Found' : 'Null');
            if (existing) {
                return interaction.editReply(`❌ User ${user.tag} đã có một instance rồi.`);
            }

            interaction.editReply(`⏳ Đang tạo instance cho **${user.tag}**... (Copy source, setup config, start PM2)`);

            console.log(`[Whitelabel] Manager.createInstance calling for ${user.id}...`);
            const result = await WhitelabelManager.createInstance(user.id, token, clientId, botName);
            console.log(`[Whitelabel] Manager.createInstance returned:`, result);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Whitelabel Instance Created')
                    .setColor('Green')
                    .addFields(
                        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                        { name: 'PM2 Name', value: result.pm2Name, inline: true },
                        { name: 'Path', value: `\`${result.path}\``, inline: false },
                        { name: 'Status', value: 'Started', inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ content: null, embeds: [embed] });

                // Send DM to User
                try {
                    const configPath = path.join(result.path, 'config.yml');
                    const managerCmdName = "admin"; // Based on templates/whitelabel/manager.js

                    await user.send({
                        content: `🎉 **Bot Whitelabel của bạn đã được khởi tạo thành công!**
                        
**Thông tin:**
- **Bot Name**: ${botName}
- **Token**: \`${token.substring(0, 10)}...\`
- **Client ID**: \`${clientId}\`

**Hướng dẫn Cấu hình:**
1. Tải file \`config.yml\` đính kèm bên dưới về máy.
2. Chỉnh sửa các thông số theo ý muốn (đọc kỹ chú thích trong file).
3. Sử dụng lệnh \`/${managerCmdName} config\` trên server của bạn và upload file config đã sửa.
4. Bot sẽ tự động khởi động lại với cấu hình mới.

Ngoài ra, bạn có thể dùng \`/${managerCmdName} avatar\` và \`/${managerCmdName} status\` để quản lý bot.
`,
                        files: [configPath]
                    });

                    interaction.followUp({ content: '📧 Đã gửi file config và hướng dẫn vào DM của khách hàng.', ephemeral: true });

                } catch (e) {
                    console.error('Failed to send DM to user:', e);
                    interaction.followUp({ content: `⚠️ Instance đã tạo nhưng không thể gửi DM cho user (User khóa DM?).`, ephemeral: true });
                }

                return;
            } else {
                return interaction.editReply(`❌ Có lỗi xảy ra: \`${result.error}\``);
            }

        } else if (sub === 'delete') {
            const user = interaction.options.getUser('user');
            const confirm = await WhitelabelModel.findOne({ userId: user.id });
            if (!confirm) return interaction.editReply('❌ Không tìm thấy instance của user này.');

            await interaction.editReply('⏳ Đang xóa instance...');
            await WhitelabelManager.deleteInstance(user.id);
            await WhitelabelManager.deleteInstance(user.id);
            return interaction.editReply(`✅ Đã xóa instance của **${user.tag}**.`);

        } else if (sub === 'terminate') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');

            const confirm = await WhitelabelModel.findOne({ userId: user.id });
            if (!confirm) return interaction.editReply('❌ Không tìm thấy instance của user này.');

            await interaction.editReply(`⏳ Đang chấm dứt dịch vụ cho **${user.tag}**...`);

            // Send DM
            try {
                await user.send({
                    content: `⚠️ **Thông Báo Chấm Dứt Dịch Vụ**
Gói Whitelabel Bot của bạn đã bị chấm dứt hiệu lực NGAY LẬP TỨC bởi quản trị viên.

**Lý do:** ${reason}

Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ.
Dữ liệu của bạn sẽ bị xóa khỏi hệ thống.`
                });
            } catch (e) {
                console.error('Failed to send terminate DM:', e);
                interaction.followUp({ content: '⚠️ Không thể gửi DM thông báo cho user.', ephemeral: true });
            }

            await WhitelabelManager.deleteInstance(user.id);
            return interaction.editReply(`✅ Đã TERMINATE instance của **${user.tag}**.\nLý do: \`${reason}\``);

        } else if (sub === 'info') {
            const user = interaction.options.getUser('user');
            const data = await WhitelabelModel.findOne({ userId: user.id });
            if (!data) return interaction.editReply('❌ User này chưa đăng ký Whitelabel.');

            const embed = new EmbedBuilder()
                .setTitle(`ℹ️ Whitelabel Info: ${user.tag}`)
                .setColor(data.status === 'ACTIVE' ? 'Green' : 'Red')
                .addFields(
                    { name: 'Status', value: data.status, inline: true },
                    { name: 'Plan', value: data.planType, inline: true },
                    { name: 'Created At', value: moment(data.startDate).format('DD/MM/YYYY HH:mm'), inline: true },
                    { name: 'Expires At', value: moment(data.expiryDate).format('DD/MM/YYYY HH:mm'), inline: true },
                    { name: 'Client ID', value: data.clientId || 'N/A', inline: true }
                );
            return interaction.editReply({ embeds: [embed] });

        } else if (sub === 'extend') {
            const user = interaction.options.getUser('user');
            const days = interaction.options.getInteger('days') || 0;
            const hours = interaction.options.getInteger('hours') || 0;
            const minutes = interaction.options.getInteger('minutes') || 0;

            if (days === 0 && hours === 0 && minutes === 0) {
                return interaction.editReply('❌ Vui lòng nhập ít nhất một đơn vị thời gian (days, hours, hoặc minutes).');
            }

            const data = await WhitelabelModel.findOne({ userId: user.id });
            if (!data) return interaction.editReply('❌ User này chưa đăng ký Whitelabel.');

            const currentExpiry = moment(data.expiryDate);
            const newExpiry = currentExpiry.add(days, 'days').add(hours, 'hours').add(minutes, 'minutes');

            data.expiryDate = newExpiry.toISOString();
            if (data.status === 'EXPIRED' && newExpiry.isAfter(moment())) {
                data.status = 'ACTIVE';
                WhitelabelManager.startInstance(user.id); // Auto start if reactivated
            } else if (data.status === 'STOPPED' && newExpiry.isAfter(moment())) {
                // Should we auto start? Maybe not if stopped manually. Let's start just in case.
                WhitelabelManager.startInstance(user.id);
                data.status = 'ACTIVE';
            }

            await data.save();

            return interaction.editReply(`✅ Đã gia hạn cho **${user.tag}**. Hạn mới: \`${newExpiry.format('DD/MM/YYYY')}\`. Trạng thái: **${data.status}**`);

        } else if (sub === 'control') {
            const user = interaction.options.getUser('user');
            const action = interaction.options.getString('action');

            const data = await WhitelabelModel.findOne({ userId: user.id });
            if (!data) return interaction.editReply('❌ User này chưa đăng ký Whitelabel.');

            if (action === 'start') {
                WhitelabelManager.startInstance(user.id);
                interaction.editReply('✅ Sent Start command to PM2.');
            } else if (action === 'stop') {
                WhitelabelManager.stopInstance(user.id);
                interaction.editReply('✅ Sent Stop command to PM2.');
            } else if (action === 'restart') {
                WhitelabelManager.restartInstance(user.id);
                interaction.editReply('✅ Sent Restart command to PM2.');
            }

        } else if (sub === 'config') {
            const user = interaction.options.getUser('user');
            const key = interaction.options.getString('key');
            const value = interaction.options.getString('value');

            const success = WhitelabelManager.updateConfig(user.id, key, value);
            if (success) {
                interaction.editReply(`✅ Đã cập nhật config \`${key}\` thành \`${value}\` và restart bot.`);
            } else {
                interaction.editReply('❌ Không thể cập nhật config. Kiểm tra lại key hoặc file.');
            }

        } else if (sub === 'list') {
            const all = await WhitelabelModel.getAllInstances();
            if (!all || all.length === 0) return interaction.editReply('Chưa có instance nào.');

            const embed = new EmbedBuilder()
                .setTitle('📋 Danh sách Whitelabel Instances')
                .setColor('Blue');

            const description = all.map(d => {
                // const d = JSON.parse(row.data);
                return `**${d.userId}**: ${d.status} | Exp: ${moment(d.expiryDate).format('DD/MM/YY')}`;
            }).join('\n');

            embed.setDescription(description.substring(0, 4000));
            interaction.editReply({ embeds: [embed] });
        }
    }
};
