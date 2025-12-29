const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    ChannelType,
    PermissionsBitField,
    Collection
} = require('discord.js');
const VoiceMasterChannel = require('../../../models/VoiceMasterChannel');
const VoiceMasterUserSettings = require('../../../models/VoiceMasterUserSettings');

// Ratelimit Map: userId -> timestamp
const cooldowns = new Collection();
const COOLDOWN_AMOUNT = 3000; // 3 seconds

// Helper to get owner
async function getOwner(channelId) {
    const data = await VoiceMasterChannel.findOne({ voiceId: channelId });
    return data ? data.userId : null;
}

// Helper to check permission
async function checkOwner(interaction, channelId) {
    const ownerId = await getOwner(channelId);
    if (interaction.user.id !== ownerId) {
        await interaction.reply({ content: '❌ Bạn không phải là chủ sở hữu của kênh này!', ephemeral: true });
        return false;
    }
    return true;
}

module.exports = {
    handleInteraction: async (client, interaction) => {
        if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isAnySelectMenu()) return;

        const customId = interaction.customId;
        if (!customId.startsWith('kv_')) return;

        // --- RATELIMIT CHECK ---
        const now = Date.now();
        const userId = interaction.user.id;
        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + COOLDOWN_AMOUNT;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return interaction.reply({ content: `⏳ Vui lòng đợi ${timeLeft.toFixed(1)} giây trước khi thao tác tiếp.`, ephemeral: true });
            }
        }
        cooldowns.set(userId, now);
        setTimeout(() => cooldowns.delete(userId), COOLDOWN_AMOUNT);
        // -----------------------

        const action = customId.split('_')[1];

        // Determine target channel
        let targetChannel = interaction.channel;

        if (!targetChannel) return;

        // --- BUTTON HANDLERS ---
        if (interaction.isButton()) {
            switch (action) {
                case 'rename':
                    if (!await checkOwner(interaction, targetChannel.id)) return;
                    const renameModal = new ModalBuilder()
                        .setCustomId('kv_modal_rename')
                        .setTitle('Đổi tên kênh');
                    const nameInput = new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('Tên kênh mới')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder(targetChannel.name)
                        .setMaxLength(100)
                        .setRequired(true);
                    renameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                    await interaction.showModal(renameModal);
                    break;

                case 'limit':
                    if (!await checkOwner(interaction, targetChannel.id)) return;
                    const limitModal = new ModalBuilder()
                        .setCustomId('kv_modal_limit')
                        .setTitle('Giới hạn người tham gia');
                    const limitInput = new TextInputBuilder()
                        .setCustomId('limit')
                        .setLabel('Số lượng (0 = Vô hạn)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('0')
                        .setMaxLength(2)
                        .setRequired(true);
                    limitModal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                    await interaction.showModal(limitModal);
                    break;

                case 'status':
                    if (!await checkOwner(interaction, targetChannel.id)) return;
                    const statusModal = new ModalBuilder()
                        .setCustomId('kv_modal_status')
                        .setTitle('Trạng thái kênh');
                    const statusInput = new TextInputBuilder()
                        .setCustomId('status')
                        .setLabel('Trạng thái mới')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Đang chill...')
                        .setMaxLength(500)
                        .setRequired(true);
                    statusModal.addComponents(new ActionRowBuilder().addComponents(statusInput));
                    await interaction.showModal(statusModal);
                    break;

                case 'bitrate':
                    if (!await checkOwner(interaction, targetChannel.id)) return;
                    const bitrateRow = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('kv_select_bitrate')
                                .setPlaceholder('Chọn Bitrate')
                                .addOptions(
                                    { label: '8 kbps', value: '8000' },
                                    { label: '32 kbps', value: '32000' },
                                    { label: '64 kbps (Default)', value: '64000' },
                                    { label: '96 kbps', value: '96000' },
                                    { label: '128 kbps', value: '128000' },
                                    { label: '256 kbps', value: '256000' },
                                    { label: '384 kbps', value: '384000' }
                                )
                        );
                    await interaction.reply({ content: 'Chọn Bitrate mong muốn:', components: [bitrateRow], ephemeral: true });
                    break;

                case 'temptext':
                    if (!await checkOwner(interaction, targetChannel.id)) return;
                    try {
                        // Check if already has text channel? (Hard to track without DB, but we can check children of category with similar name)
                        // Or just create new one.

                        const textChannel = await interaction.guild.channels.create({
                            name: `chat-${targetChannel.name}`,
                            type: ChannelType.GuildText,
                            parent: targetChannel.parentId,
                            permissionOverwrites: [
                                {
                                    id: interaction.guild.roles.everyone.id,
                                    deny: [PermissionsBitField.Flags.ViewChannel]
                                },
                                {
                                    id: interaction.user.id,
                                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
                                }
                            ]
                        });

                        await interaction.reply({
                            content: `✅ Đã tạo kênh text tạm thời: ${textChannel}\n⚠️ **Lưu ý:** Kênh sẽ tự động hủy sau **5 phút** nếu bạn không mời thêm người vào!`,
                            ephemeral: true
                        });

                        // Save text channel ID to DB
                        await VoiceMasterChannel.findOneAndUpdate(
                            { voiceId: targetChannel.id },
                            { textChannelId: textChannel.id }
                        );

                        // Send prompt in the new text channel
                        const inviteRow = new ActionRowBuilder()
                            .addComponents(
                                new UserSelectMenuBuilder()
                                    .setCustomId('kv_select_textinvite')
                                    .setPlaceholder('Mời người vào kênh text này')
                                    .setMaxValues(10)
                            );

                        await textChannel.send({
                            content: `${interaction.user}, hãy mời bạn bè vào kênh text này ngay!`,
                            components: [inviteRow]
                        });

                        // Set timeout to delete
                        setTimeout(async () => {
                            const fetchedChannel = await interaction.guild.channels.fetch(textChannel.id).catch(() => null);
                            if (!fetchedChannel) return;

                            // Check permissions. If only owner (and bot) has ViewChannel, delete.
                            // Note: permissionOverwrites is a Collection.
                            // We check if there are any overwrites allowing ViewChannel for users other than owner.

                            const validOverwrites = fetchedChannel.permissionOverwrites.cache.filter(overwrite => {
                                // Ignore @everyone (usually denied)
                                if (overwrite.id === interaction.guild.roles.everyone.id) return false;
                                // Ignore owner
                                if (overwrite.id === interaction.user.id) return false;
                                // Ignore bot
                                if (overwrite.id === client.user.id) return false;

                                // Check if allows ViewChannel
                                return overwrite.allow.has(PermissionsBitField.Flags.ViewChannel);
                            });

                            if (validOverwrites.size === 0) {
                                try {
                                    await fetchedChannel.delete();
                                    // Notify owner?
                                    try {
                                        await interaction.user.send(`⚠️ Kênh text **${fetchedChannel.name}** đã bị xóa do không có thành viên nào được mời sau 5 phút.`);
                                    } catch (e) { }
                                } catch (e) {
                                    console.error('Failed to auto-delete text channel', e);
                                }
                            }
                        }, 5 * 60 * 1000); // 5 minutes

                    } catch (err) {
                        console.error(err);
                        await interaction.reply({ content: '❌ Không thể tạo kênh text.', ephemeral: true });
                    }
                    break;

                case 'claim':
                    const currentOwnerId = await getOwner(targetChannel.id);
                    const currentOwnerMember = interaction.guild.members.cache.get(currentOwnerId);

                    if (currentOwnerMember && currentOwnerMember.voice.channelId === targetChannel.id) {
                        return interaction.reply({ content: `❌ Kênh này đang được sở hữu bởi ${currentOwnerMember.user.tag}!`, ephemeral: true });
                    }

                    await VoiceMasterChannel.findOneAndUpdate(
                        { voiceId: targetChannel.id },
                        { userId: interaction.user.id }
                    );
                    await interaction.reply({ content: '👑 Bạn đã trở thành chủ sở hữu mới!', ephemeral: true });
                    break;

                case 'lock':
                    if (!await checkOwner(interaction, targetChannel.id)) return;
                    const isLocked = targetChannel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id)?.deny.has(PermissionsBitField.Flags.Connect);

                    await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                        Connect: !isLocked
                    });

                    await interaction.reply({ content: isLocked ? '🔓 Đã mở khóa kênh!' : '🔒 Đã khóa kênh!', ephemeral: true });
                    break;

                case 'hide':
                    if (!await checkOwner(interaction, targetChannel.id)) return;
                    const isHidden = targetChannel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id)?.deny.has(PermissionsBitField.Flags.ViewChannel);

                    await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                        ViewChannel: !isHidden
                    });

                    await interaction.reply({ content: isHidden ? '👁️ Đã hiện kênh!' : '🙈 Đã ẩn kênh!', ephemeral: true });
                    break;

                case 'invite':
                    if (!await checkOwner(interaction, targetChannel.id)) return;
                    const inviteRow = new ActionRowBuilder()
                        .addComponents(
                            new UserSelectMenuBuilder()
                                .setCustomId('kv_select_invite')
                                .setPlaceholder('Chọn người để mời (Whitelist)')
                                .setMaxValues(10)
                        );
                    await interaction.reply({ content: 'Chọn người muốn mời (Họ sẽ được cấp quyền truy cập):', components: [inviteRow], ephemeral: true });
                    break;

                case 'kick':
                    if (!await checkOwner(interaction, targetChannel.id)) return;
                    const kickRow = new ActionRowBuilder()
                        .addComponents(
                            new UserSelectMenuBuilder()
                                .setCustomId('kv_select_kick')
                                .setPlaceholder('Chọn người để Kick (Blacklist)')
                                .setMaxValues(10)
                        );
                    await interaction.reply({ content: 'Chọn người muốn Kick (Họ sẽ bị chặn truy cập):', components: [kickRow], ephemeral: true });
                    break;
            }
        }

        // --- MODAL HANDLERS ---
        if (interaction.isModalSubmit()) {
            if (customId === 'kv_modal_rename') {
                const newName = interaction.fields.getTextInputValue('name');
                try {
                    await targetChannel.edit({ name: newName });
                    await VoiceMasterUserSettings.findOneAndUpdate(
                        { userId: interaction.user.id },
                        { channelName: newName },
                        { upsert: true, new: true }
                    );
                    await interaction.reply({ content: `✅ Đã đổi tên thành **${newName}**`, ephemeral: true });
                } catch (e) {
                    await interaction.reply({ content: '❌ Lỗi đổi tên (Rate limit?)', ephemeral: true });
                }
            } else if (customId === 'kv_modal_limit') {
                const limit = parseInt(interaction.fields.getTextInputValue('limit'));
                if (isNaN(limit) || limit < 0 || limit > 99) return interaction.reply({ content: '❌ Số lượng không hợp lệ', ephemeral: true });

                await targetChannel.edit({ userLimit: limit });
                await interaction.reply({ content: `✅ Đã đặt giới hạn: ${limit === 0 ? 'Vô hạn' : limit}`, ephemeral: true });
            } else if (customId === 'kv_modal_status') {
                const status = interaction.fields.getTextInputValue('status');
                try {
                    // Fetch full channel to ensure we have all methods
                    const fullChannel = await interaction.guild.channels.fetch(targetChannel.id);

                    if (fullChannel.setStatus) {
                        await fullChannel.setStatus(status);
                        await interaction.reply({ content: `✅ Đã cập nhật trạng thái: **${status}**`, ephemeral: true });
                    } else {
                        // Try editing directly (fallback for some versions)
                        try {
                            await fullChannel.edit({ status: status });
                            await interaction.reply({ content: `✅ Đã cập nhật trạng thái: **${status}**`, ephemeral: true });
                        } catch (err) {
                            console.error(err);
                            await interaction.reply({ content: `ℹ️ Bot chưa hỗ trợ tính năng này hoặc phiên bản Discord.js cũ.`, ephemeral: true });
                        }
                    }
                } catch (e) {
                    console.error(e);
                    await interaction.reply({ content: '❌ Lỗi cập nhật trạng thái.', ephemeral: true });
                }
            }
        }

        // --- SELECT MENU HANDLERS ---
        if (interaction.isStringSelectMenu()) {
            if (customId === 'kv_select_bitrate') {
                const bitrate = parseInt(interaction.values[0]);
                try {
                    await targetChannel.edit({ bitrate: bitrate });
                    await interaction.update({ content: `✅ Đã đặt bitrate: ${bitrate / 1000} kbps`, components: [] });
                } catch (e) {
                    await interaction.update({ content: `❌ Bitrate này quá cao so với cấp độ Boost của server!`, components: [] });
                }
            }
        }

        if (interaction.isUserSelectMenu()) {
            const users = interaction.users;

            if (customId === 'kv_select_invite') {
                // Invite = Whitelist
                for (const [id, user] of users) {
                    await targetChannel.permissionOverwrites.edit(id, { Connect: true, ViewChannel: true });
                    // Send DM?
                    try {
                        await user.send(`📨 Bạn đã được mời tham gia voice channel **${targetChannel.name}** tại server **${interaction.guild.name}**!`);
                    } catch (e) { }
                }

                const mentions = users.map(u => u.toString()).join(' ');
                await targetChannel.send(`📨 ${mentions}, bạn được mời tham gia voice chat bởi ${interaction.user}!`);
                await interaction.update({ content: `✅ Đã mời và cấp quyền cho ${users.size} người!`, components: [] });

            } else if (customId === 'kv_select_kick') {
                // Kick = Blacklist
                for (const [id, user] of users) {
                    await targetChannel.permissionOverwrites.edit(id, { Connect: false });
                    // Kick if in channel
                    const member = interaction.guild.members.cache.get(id);
                    if (member && member.voice.channelId === targetChannel.id) {
                        await member.voice.disconnect();
                    }
                }
                await interaction.update({ content: `🚫 Đã Kick và chặn ${users.size} người!`, components: [] });

            } else if (customId === 'kv_select_textinvite') {
                // Invite to Text Channel
                const textChannel = interaction.channel; // Interaction happened in text channel
                for (const [id, user] of users) {
                    await textChannel.permissionOverwrites.edit(id, { ViewChannel: true, SendMessages: true });
                }
                await interaction.update({ content: `✅ Đã thêm ${users.size} người vào kênh text!`, components: [] });
            }
        }
    }
};
