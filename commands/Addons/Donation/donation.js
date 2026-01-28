const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const DonationSettings = require('../../../models/DonationSettings');
const DonationTransaction = require('../../../models/DonationTransaction');
const { getLang } = require('../../../utils/langLoader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('donation')
        .setDescription('Quản lý hệ thống ủng hộ (donate)')
        .addSubcommand(sub =>
            sub.setName('enable')
                .setDescription('Thiết lập bản ghi ủng hộ')
                .addChannelOption(o => o.setName('channel').setDescription('Kênh nhận donate').setRequired(true))
                .addUserOption(o => o.setName('receiver').setDescription('Người nhận donate đầu tiên').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Vô hiệu hóa bản ghi ủng hộ')
                .addBooleanOption(o => o.setName('delete').setDescription('Xóa dữ liệu ủng hộ?').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Thêm số tiền ủng hộ thủ công')
                .addUserOption(o => o.setName('user').setDescription('Người dùng').setRequired(true))
                .addIntegerOption(o => o.setName('amount').setDescription('Số tiền').setRequired(true))
                .addStringOption(o => o.setName('reason').setDescription('Lý do'))
                .addBooleanOption(o => o.setName('silent').setDescription('Không thông báo?')))
        .addSubcommand(sub =>
            sub.setName('subtract')
                .setDescription('Trừ số tiền ủng hộ')
                .addUserOption(o => o.setName('user').setDescription('Người dùng').setRequired(true))
                .addIntegerOption(o => o.setName('amount').setDescription('Số tiền').setRequired(true))
                .addStringOption(o => o.setName('reason').setDescription('Lý do'))
                .addBooleanOption(o => o.setName('silent').setDescription('Không thông báo?')))
        .addSubcommand(sub =>
            sub.setName('configuration')
                .setDescription('Xem cấu hình hiện tại'))
        .addSubcommand(sub =>
            sub.setName('leaderboard')
                .setDescription('Xem bảng xếp hạng ủng hộ')
                .addStringOption(o =>
                    o.setName('range')
                        .setDescription('Phạm vi thời gian')
                        .addChoices(
                            { name: 'Tháng này', value: 'month' },
                            { name: 'Tuần này', value: 'week' },
                            { name: 'Tất cả', value: 'all' }
                        ))
                .addIntegerOption(o => o.setName('limit').setDescription('Giới hạn hiển thị')))
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('Thêm/Xóa kênh nhận donate')
                .addStringOption(o =>
                    o.setName('action')
                        .setDescription('Hành động')
                        .setRequired(true)
                        .addChoices({ name: 'Thêm', value: 'add' }, { name: 'Xóa', value: 'remove' }))
                .addChannelOption(o => o.setName('channel').setDescription('Kênh cần cấu hình').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('receiver')
                .setDescription('Thêm/Xóa người nhận donate')
                .addStringOption(o =>
                    o.setName('action')
                        .setDescription('Hành động')
                        .setRequired(true)
                        .addChoices({ name: 'Thêm', value: 'add' }, { name: 'Xóa', value: 'remove' }))
                .addUserOption(o => o.setName('receiver').setDescription('Người dùng').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('receiverole')
                .setDescription('Đặt vai trò cho người nhận')
                .addRoleOption(o => o.setName('role').setDescription('Vai trò').setRequired(true))
                .addBooleanOption(o => o.setName('delete').setDescription('Xóa vai trò này khỏi danh sách?')))
        .addSubcommand(sub =>
            sub.setName('message')
                .setDescription('Chỉnh sửa tin nhắn cảm ơn')
                .addStringOption(o => o.setName('message').setDescription('Tin nhắn (dùng {user}, {amount})...').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('announcement')
                .setDescription('Đặt kênh thông báo')
                .addChannelOption(o => o.setName('channel').setDescription('Kênh thông báo').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('threshold')
                .setDescription('Ngưỡng thông báo ủng hộ')
                .addIntegerOption(o => o.setName('threshold').setDescription('Số tiền tối thiểu để thông báo').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('autoreceive')
                .setDescription('Bật/Tắt tự động nhận donate từ bot khác')
                .addBooleanOption(o => o.setName('action').setDescription('Bật hoặc Tắt').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('reward')
                .setDescription('Thêm/Xóa phần thưởng (role) theo mốc donate')
                .addStringOption(o =>
                    o.setName('action')
                        .setDescription('Hành động')
                        .setRequired(true)
                        .addChoices({ name: 'Thêm', value: 'add' }, { name: 'Xóa', value: 'remove' }))
                .addRoleOption(o => o.setName('role').setDescription('Vai trò phần thưởng').setRequired(true))
                .addIntegerOption(o => o.setName('threshold').setDescription('Mốc donate cần đạt').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('embed')
                .setDescription('Cấu hình giao diện thông báo (Embed)')
                .addBooleanOption(o => o.setName('enabled').setDescription('Bật/Tắt Embed'))
                .addStringOption(o => o.setName('title').setDescription('Tiêu đề Embed'))
                .addStringOption(o => o.setName('description').setDescription('Mô tả (dùng {user}, {amount})...'))
                .addStringOption(o => o.setName('color').setDescription('Màu sắc (HEX, vd: #FF0000)'))
                .addAttachmentOption(o => o.setName('image').setDescription('Ảnh lớn (Banner)'))
                .addAttachmentOption(o => o.setName('thumbnail').setDescription('Ảnh nhỏ (Thumbnail)'))
                .addStringOption(o => o.setName('footer').setDescription('Footer text'))),

    category: 'Addons',

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Helper to check admin
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!['leaderboard', 'configuration'].includes(sub) && !isAdmin) {
            return interaction.reply({ content: '❌ Bạn cần quyền Administrator để sử dụng lệnh này.', ephemeral: true });
        }

        await interaction.deferReply();
        let settings = await DonationSettings.findOne({ guildId });

        // Helper to save or create
        const saveSettings = async () => {
            // Ensure strict JSON strings for storage
            // Note: settings object might be a raw object (if !settings) or a wrapped model (if settings)
            // wrapped model has .save(), raw object needs .create()

            // In-memory manipulation might have set these to arrays/objects, needed to stringify back if strictly required by old logic,
            // BUT SQLiteModel stores JSON. If we pass objects, they are stringified in .save() implementation: 
            // "self.insertStmt.run(...pkValues, JSON.stringify(this));"
            // So we should actually keep them as Objects in memory if we rely on that.
            // However, the previous code parsed them: "parseJSON(settings.channels)".
            // Let's ensure we work with Objects in memory and let SQLiteModel handle serialization?
            // Wait, SQLiteModel _wrap defines save as JSON.stringify(this). 
            // If we store stringified JSON inside properties, it will be double encoded?
            // "const data = JSON.parse(row.data);" in findOne.
            // So if `channels` is "[]" string in DB, `data.channels` is "[]" string.
            // So we should keep them as strings if that's the convention, OR refactor to use real objects.
            // Refactoring to real objects is better but risky if I misunderstand existing conventions.
            // Looking at `DonationSettings` model define: "channels: []". It's an array default.
            // But my previous code: "settings.channels = JSON.stringify(...)".
            // If I change `settings.channels` to array, SQLiteModel will save it as array in the big JSON.
            // That's cleaner. 
            // Let's stick to using Objects/Arrays and let SQLiteModel handle serialization.

            if (settings.save) {
                await settings.save();
            } else {
                settings = await DonationSettings.create(settings);
            }
        };

        if (!settings) {
            settings = {
                guildId,
                enabled: 0,
                autoReceive: 1,
                channels: [],
                receivers: [],
                receiverRoles: [],
                rewards: [],
                notificationThreshold: 0
            };
        } else {
            // Fix potential legacy string data if exists (though this is new feature)
            // But my previous code was writing strings.
            // Let's parse them if they are strings to be safe.
            if (typeof settings.channels === 'string') try { settings.channels = JSON.parse(settings.channels) } catch { }
            if (typeof settings.receivers === 'string') try { settings.receivers = JSON.parse(settings.receivers) } catch { }
            if (typeof settings.receiverRoles === 'string') try { settings.receiverRoles = JSON.parse(settings.receiverRoles) } catch { }
            if (typeof settings.rewards === 'string') try { settings.rewards = JSON.parse(settings.rewards) } catch { }
        }

        // --- SUBCOMMAND HANDLERS ---

        if (sub === 'enable') {
            const channel = interaction.options.getChannel('channel');
            const receiver = interaction.options.getUser('receiver');

            settings.enabled = 1;
            settings.channels = [channel.id];
            settings.receivers = [receiver.id];
            await saveSettings();

            return interaction.editReply(`✅ Đã kích hoạt hệ thống donate!\nKênh theo dõi: ${channel}\nNgười nhận mặc định: ${receiver}`);
        }

        if (sub === 'disable') {
            const del = interaction.options.getBoolean('delete');
            settings.enabled = 0;
            if (del) {
                const db = require('../../../utils/database'); // DB instance
                // donation_transactions TABLE has data column.
                // Need to filter by guildId inside data.
                // "DELETE FROM donation_transactions WHERE json_extract(data, '$.guildId') = ?"
                await db.prepare("DELETE FROM donation_transactions WHERE json_extract(data, '$.guildId') = ?").run(guildId);
            }
            await saveSettings();
            return interaction.editReply(`✅ Đã tắt hệ thống donate.${del ? ' Đã xóa toàn bộ dữ liệu.' : ''}`);
        }

        if (sub === 'add' || sub === 'subtract') {
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const reason = interaction.options.getString('reason') || 'Manual Adjustment';
            const silent = interaction.options.getBoolean('silent');
            const isAdd = sub === 'add';

            // Log Transaction
            await DonationTransaction.create({
                guildId,
                userId: user.id,
                receiverId: interaction.user.id, // Admin is the executor
                amount: isAdd ? amount : -amount,
                currency: 'MANUAL',
                timestamp: Date.now(),
                reason: reason
            });

            if (!silent) {
                const embed = new EmbedBuilder()
                    .setColor(isAdd ? '#00FF00' : '#FF0000')
                    .setDescription(`${isAdd ? '➕' : '➖'} **${user.username}** đã được ${isAdd ? 'cộng' : 'trừ'} **${amount.toLocaleString()}** điểm.\nLý do: ${reason}`);
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply({ content: `✅ Đã ${isAdd ? 'thêm' : 'bớt'} ${amount} cho ${user.tag}.`, ephemeral: true });
            }
        }

        if (sub === 'configuration') {
            const channels = (settings.channels || []).map(id => `<#${id}>`).join(', ') || 'Chưa cài đặt';
            const receivers = (settings.receivers || []).map(id => `<@${id}>`).join(', ') || 'Chưa cài đặt';
            const roles = (settings.receiverRoles || []).map(id => `<@&${id}>`).join(', ') || 'Chưa cài đặt';
            const announce = settings.announcementChannelId ? `<#${settings.announcementChannelId}>` : 'Chưa cài đặt';

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Cấu hình Donation')
                .setColor('#2b2d31')
                .addFields(
                    { name: 'Trạng thái', value: settings.enabled ? '✅ Bật' : '❌ Tắt', inline: true },
                    { name: 'Tự động nhận', value: settings.autoReceive ? '✅ Có' : '❌ Không', inline: true },
                    { name: 'Ngưỡng thông báo', value: `${settings.notificationThreshold}`, inline: true },
                    { name: 'Kênh theo dõi', value: channels, inline: false },
                    { name: 'Người nhận hợp lệ', value: receivers, inline: false },
                    { name: 'Role nhận hợp lệ', value: roles, inline: false },
                    { name: 'Kênh thông báo', value: announce, inline: true }
                );
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'channel') {
            const action = interaction.options.getString('action');
            const channel = interaction.options.getChannel('channel');
            let list = settings.channels || [];

            if (action === 'add') {
                if (!list.includes(channel.id)) list.push(channel.id);
            } else {
                list = list.filter(id => id !== channel.id);
            }
            settings.channels = list;
            await saveSettings();
            return interaction.editReply(`✅ Đã ${action === 'add' ? 'thêm' : 'xóa'} kênh ${channel} ${action === 'add' ? 'vào' : 'khỏi'} danh sách theo dõi.`);
        }

        if (sub === 'receiver') {
            const action = interaction.options.getString('action');
            const user = interaction.options.getUser('receiver');
            let list = settings.receivers || [];

            if (action === 'add') {
                if (!list.includes(user.id)) list.push(user.id);
            } else {
                list = list.filter(id => id !== user.id);
            }
            settings.receivers = list;
            await saveSettings();
            return interaction.editReply(`✅ Đã ${action === 'add' ? 'thêm' : 'xóa'} ${user} ${action === 'add' ? 'vào' : 'khỏi'} danh sách người nhận.`);
        }

        if (sub === 'receiverole') {
            const role = interaction.options.getRole('role');
            const del = interaction.options.getBoolean('delete');
            let list = settings.receiverRoles || [];

            if (!del) {
                if (!list.includes(role.id)) list.push(role.id);
            } else {
                list = list.filter(id => id !== role.id);
            }

            settings.receiverRoles = list;
            await saveSettings();
            return interaction.editReply(`✅ Đã ${!del ? 'thêm' : 'xóa'} role ${role} ${!del ? 'vào' : 'khỏi'} danh sách role nhận.`);
        }

        if (sub === 'announcement') {
            const channel = interaction.options.getChannel('channel');
            settings.announcementChannelId = channel.id;
            await saveSettings();
            return interaction.editReply(`✅ Đã đặt kênh thông báo là ${channel}.`);
        }

        if (sub === 'threshold') {
            const val = interaction.options.getInteger('threshold');
            settings.notificationThreshold = val;
            await saveSettings();
            return interaction.editReply(`✅ Đã đặt ngưỡng thông báo là **${val.toLocaleString()}**.`);
        }

        if (sub === 'message') {
            const msg = interaction.options.getString('message');
            settings.message = msg;
            await saveSettings();
            return interaction.editReply(`✅ Đã cập nhật tin nhắn cảm ơn.`);
        }

        if (sub === 'autoreceive') {
            const val = interaction.options.getBoolean('action');
            settings.autoReceive = val ? 1 : 0;
            await saveSettings();
            return interaction.editReply(`✅ Đã ${val ? 'bật' : 'tắt'} tính năng tự động nhận donate từ bot.`);
        }

        if (sub === 'reward') {
            const action = interaction.options.getString('action');
            const role = interaction.options.getRole('role');
            const threshold = interaction.options.getInteger('threshold');
            let rewards = settings.rewards || []; // Array of objects

            if (action === 'add') {
                rewards.push({ threshold, roleId: role.id });
                rewards.sort((a, b) => a.threshold - b.threshold);
            } else {
                rewards = rewards.filter(r => r.roleId !== role.id || r.threshold !== threshold);
            }

            settings.rewards = rewards;
            await saveSettings();
            return interaction.editReply(`✅ Đã ${action === 'add' ? 'thêm' : 'xóa'} phần thưởng ${role} tại mốc ${threshold}.`);
        }

        if (sub === 'leaderboard') {
            const range = interaction.options.getString('range') || 'all';
            const limit = interaction.options.getInteger('limit') || 10;

            let timeFilter = 0;
            const now = new Date();
            if (range === 'week') {
                const start = new Date(now.setDate(now.getDate() - now.getDay())); // Start of week (Sunday)
                start.setHours(0, 0, 0, 0);
                timeFilter = start.getTime();
            } else if (range === 'month') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                timeFilter = start.getTime();
            }

            const db = require('../../../utils/database');
            // Using json_extract to get fields from data column
            // We need to sum 'amount'
            // guildId, userId, amount are all inside 'data' JSON
            // BUT wait, SQLiteModel DOES define "userId TEXT" in the table if it's a primary key!
            // In DonationTransaction, 'id' is the only PK. 
            // So 'guildId' and 'userId' are ONLY in the 'data' JSON blob.

            const query = `
                SELECT 
                    json_extract(data, '$.userId') as userId, 
                    SUM(json_extract(data, '$.amount')) as total 
                FROM donation_transactions 
                WHERE json_extract(data, '$.guildId') = ? 
                  AND json_extract(data, '$.timestamp') >= ? 
                GROUP BY userId 
                ORDER BY total DESC 
                LIMIT ?`;

            const rows = db.prepare(query).all(guildId, timeFilter, limit);

            if (!rows || rows.length === 0) {
                return interaction.editReply('📭 Chưa có dữ liệu donate nào trong khoảng thời gian này.');
            }

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Bảng xếp hạng ủng hộ (${range === 'all' ? 'Tất cả' : range === 'week' ? 'Tuần này' : 'Tháng này'})`)
                .setColor('Gold')
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

            let desc = '';
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                let userTag = `<@${row.userId}>`;
                desc += `**#${i + 1}** ${userTag} — **${row.total.toLocaleString()}**\n`;
            }
            embed.setDescription(desc);

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'embed') {
            const enabled = interaction.options.getBoolean('enabled');
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color');
            const image = interaction.options.getAttachment('image');
            const thumbnail = interaction.options.getAttachment('thumbnail');
            const footer = interaction.options.getString('footer');

            let embedSettings = settings.embed || {
                enabled: false,
                title: null,
                description: null,
                color: '#FF0000',
                image: null,
                thumbnail: null,
                footer: null,
                timestamp: false
            };

            if (enabled !== null) embedSettings.enabled = enabled;
            if (title !== null) embedSettings.title = title;
            if (description !== null) embedSettings.description = description;
            if (color !== null) embedSettings.color = color;
            if (image !== null) embedSettings.image = image.url;
            if (thumbnail !== null) embedSettings.thumbnail = thumbnail.url;
            if (footer !== null) embedSettings.footer = footer;

            settings.embed = embedSettings;
            await saveSettings();

            const previewEmbed = new EmbedBuilder()
                .setTitle(embedSettings.title || 'Tiêu đề mẫu')
                .setDescription(embedSettings.description || 'Mô tả mẫu: {user} đã donate {amount}')
                .setColor(embedSettings.color || '#FF0000');

            if (embedSettings.image) previewEmbed.setImage(embedSettings.image);
            if (embedSettings.thumbnail) previewEmbed.setThumbnail(embedSettings.thumbnail);
            if (embedSettings.footer) previewEmbed.setFooter({ text: embedSettings.footer });

            return interaction.editReply({
                content: '✅ Cấu hình Embed đã được cập nhật. Dưới đây là bản xem trước:',
                embeds: [previewEmbed]
            });
        }
    }
};
