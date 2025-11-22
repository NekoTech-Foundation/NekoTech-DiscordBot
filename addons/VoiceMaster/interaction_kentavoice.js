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
    PermissionsBitField
} = require('discord.js');
const VoiceMasterChannel = require('../../models/VoiceMasterChannel');
const VoiceMasterUserSettings = require('../../models/VoiceMasterUserSettings');

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

        const action = customId.split('_')[1];

        // Determine target channel
        let targetChannel = interaction.channel;

        // If interaction is in a text channel, we might need to find the voice channel
        // But for KentaVoice, the embed is sent TO the voice channel (which has a text chat).
        // So interaction.channel IS the voice channel.

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
                                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                                }
                            ]
                        });

                        // Sync permissions with voice channel members?
                        // For now, just owner.

                        await interaction.reply({ content: `✅ Đã tạo kênh text tạm thời: ${textChannel}`, ephemeral: true });
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
                                .setPlaceholder('Chọn người để mời')
                                .setMaxValues(5)
                        );
                    await interaction.reply({ content: 'Chọn người muốn mời:', components: [inviteRow], ephemeral: true });
                    break;

                case 'permit':
                    if (!await checkOwner(interaction, targetChannel.id)) return;
                    const permitRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId('kv_sub_whitelist').setLabel('Whitelist (Cho phép)').setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId('kv_sub_blacklist').setLabel('Blacklist (Chặn)').setStyle(ButtonStyle.Danger)
                        );

                    await interaction.reply({ content: 'Bạn muốn Whitelist hay Blacklist?', components: [permitRow], ephemeral: true });
                    break;

                case 'sub':
                    // Handle sub-buttons for permit
                    const subAction = customId.split('_')[2];
                    if (subAction === 'whitelist') {
                        const row = new ActionRowBuilder().addComponents(
                            new UserSelectMenuBuilder().setCustomId('kv_select_whitelist').setPlaceholder('Chọn người để Whitelist').setMaxValues(5)
                        );
                        await interaction.update({ content: 'Chọn người để Whitelist:', components: [row] });
                    } else if (subAction === 'blacklist') {
                        const row = new ActionRowBuilder().addComponents(
                            new UserSelectMenuBuilder().setCustomId('kv_select_blacklist').setPlaceholder('Chọn người để Blacklist').setMaxValues(5)
                        );
                        await interaction.update({ content: 'Chọn người để Blacklist:', components: [row] });
                    }
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
                    if (targetChannel.setStatus) {
                        await targetChannel.setStatus(status);
                        await interaction.reply({ content: `✅ Đã cập nhật trạng thái.`, ephemeral: true });
                    } else {
                        await interaction.reply({ content: `ℹ️ Tính năng chưa được hỗ trợ.`, ephemeral: true });
                    }
                } catch (e) {
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
                const mentions = users.map(u => u.toString()).join(' ');
                await targetChannel.send(`📨 ${mentions}, bạn được mời tham gia voice chat bởi ${interaction.user}!`);
                await interaction.update({ content: '✅ Đã gửi lời mời!', components: [] });
            } else if (customId === 'kv_select_whitelist') {
                for (const [id, user] of users) {
                    await targetChannel.permissionOverwrites.edit(id, { Connect: true });
                }
                await interaction.update({ content: `✅ Đã Whitelist ${users.size} người!`, components: [] });
            } else if (customId === 'kv_select_blacklist') {
                for (const [id, user] of users) {
                    await targetChannel.permissionOverwrites.edit(id, { Connect: false });
                    // Kick if in channel
                    const member = interaction.guild.members.cache.get(id);
                    if (member && member.voice.channelId === targetChannel.id) {
                        await member.voice.disconnect();
                    }
                }
                await interaction.update({ content: `🚫 Đã Blacklist ${users.size} người!`, components: [] });
            }
        }
    }
};
