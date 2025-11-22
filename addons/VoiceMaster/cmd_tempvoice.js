const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const VoiceMaster = require('../../models/VoiceMaster');
const VoiceMasterChannel = require('../../models/VoiceMasterChannel');
const VoiceMasterUserSettings = require('../../models/VoiceMasterUserSettings');
const VoiceMasterGuildSettings = require('../../models/VoiceMasterGuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempvoice')
        .setDescription('🎙️ Quản lý voice channel tạm thời của bạn')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('⚙️ Thiết lập hệ thống voice channel tạm thời (chỉ owner server)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('lock')
                .setDescription('🔒 Khóa voice channel của bạn')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('🔓 Mở khóa voice channel của bạn')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('name')
                .setDescription('✏️ Đổi tên voice channel của bạn')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Tên mới cho voice channel')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('limit')
                .setDescription('👥 Đặt giới hạn số người trong voice channel')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Số người tối đa (0 = không giới hạn)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(99)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('permit')
                .setDescription('✅ Cho phép người dùng vào voice channel của bạn')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng được phép vào')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reject')
                .setDescription('❌ Từ chối và kick người dùng khỏi voice channel')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng bị từ chối')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('claim')
                .setDescription('👑 Nhận quyền sở hữu channel khi owner rời đi')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setlimit')
                .setDescription('⚙️ Đặt giới hạn mặc định cho server (chỉ owner)')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Số người tối đa mặc định (0 = không giới hạn)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(99)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Setup command - only for server owner
        if (subcommand === 'setup') {
            if (interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({
                    content: '❌ Chỉ owner server mới có thể thiết lập hệ thống này!',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: '⚙️ Đang thiết lập hệ thống VoiceMaster...\n\n' +
                    '📝 Tôi sẽ tạo:\n' +
                    '• Một category mới có tên "Voice Channels"\n' +
                    '• Một voice channel "➕ Join to Create" trong category đó\n\n' +
                    'Khi thành viên tham gia vào "➕ Join to Create", một voice channel riêng sẽ được tạo tự động!',
                ephemeral: true
            });

            try {
                // Create category
                const category = await interaction.guild.channels.create({
                    name: 'Voice Channels',
                    type: ChannelType.GuildCategory
                });

                // Create "Join to Create" voice channel
                const voiceChannel = await interaction.guild.channels.create({
                    name: '➕ Join to Create',
                    type: ChannelType.GuildVoice,
                    parent: category.id
                });

                // Save to database
                await VoiceMaster.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    {
                        guildId: interaction.guild.id,
                        ownerId: interaction.user.id,
                        voiceChannelId: voiceChannel.id,
                        voiceCategoryId: category.id
                    },
                    { upsert: true, new: true }
                );

                await interaction.followUp({
                    content: '✅ **Thiết lập thành công!**\n\n' +
                        `📁 Category: ${category.name}\n` +
                        `🎙️ Voice Channel: ${voiceChannel.name}\n\n` +
                        'Thành viên giờ có thể tham gia vào "➕ Join to Create" để tạo voice channel riêng!',
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error in VoiceMaster setup:', error);
                await interaction.followUp({
                    content: '❌ Có lỗi xảy ra khi thiết lập. Vui lòng kiểm tra quyền của bot!',
                    ephemeral: true
                });
            }
            return;
        }

        // Setlimit command - only for server owner
        if (subcommand === 'setlimit') {
            if (interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({
                    content: '❌ Chỉ owner server mới có thể đặt giới hạn mặc định!',
                    ephemeral: true
                });
            }

            const limit = interaction.options.getInteger('number');

            await VoiceMasterGuildSettings.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { channelLimit: limit },
                { upsert: true, new: true }
            );

            return interaction.reply({
                content: `✅ Đã đặt giới hạn mặc định cho server là **${limit === 0 ? 'không giới hạn' : limit + ' người'}**!`,
                ephemeral: true
            });
        }

        // All other commands require user to own a voice channel
        const userId = interaction.user.id;
        const voiceChannel = await VoiceMasterChannel.findOne({ userId });

        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ Bạn không sở hữu voice channel nào!',
                ephemeral: true
            });
        }

        const channel = interaction.guild.channels.cache.get(voiceChannel.voiceId);
        if (!channel) {
            // Channel was deleted, clean up database
            await VoiceMasterChannel.deleteOne({ userId });
            return interaction.reply({
                content: '❌ Voice channel của bạn không tồn tại!',
                ephemeral: true
            });
        }

        // Lock command
        if (subcommand === 'lock') {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    Connect: false
                });
                return interaction.reply({
                    content: '🔒 Voice channel đã được khóa!',
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error locking channel:', error);
                return interaction.reply({
                    content: '❌ Không thể khóa channel!',
                    ephemeral: true
                });
            }
        }

        // Unlock command
        if (subcommand === 'unlock') {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    Connect: true
                });
                return interaction.reply({
                    content: '🔓 Voice channel đã được mở khóa!',
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error unlocking channel:', error);
                return interaction.reply({
                    content: '❌ Không thể mở khóa channel!',
                    ephemeral: true
                });
            }
        }

        // Name command
        if (subcommand === 'name') {
            const newName = interaction.options.getString('name');

            try {
                await channel.edit({ name: newName });

                // Save to user settings
                await VoiceMasterUserSettings.findOneAndUpdate(
                    { userId },
                    { channelName: newName },
                    { upsert: true, new: true }
                );

                return interaction.reply({
                    content: `✏️ Đã đổi tên channel thành **${newName}**!`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error renaming channel:', error);
                return interaction.reply({
                    content: '❌ Không thể đổi tên channel! (Lưu ý: Discord giới hạn 2 lần đổi tên trong 10 phút)',
                    ephemeral: true
                });
            }
        }

        // Limit command
        if (subcommand === 'limit') {
            const limit = interaction.options.getInteger('number');

            try {
                await channel.edit({ userLimit: limit });

                // Save to user settings
                await VoiceMasterUserSettings.findOneAndUpdate(
                    { userId },
                    { channelLimit: limit },
                    { upsert: true, new: true }
                );

                return interaction.reply({
                    content: `👥 Đã đặt giới hạn channel là **${limit === 0 ? 'không giới hạn' : limit + ' người'}**!`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error setting limit:', error);
                return interaction.reply({
                    content: '❌ Không thể đặt giới hạn channel!',
                    ephemeral: true
                });
            }
        }

        // Permit command
        if (subcommand === 'permit') {
            const user = interaction.options.getUser('user');
            const member = interaction.guild.members.cache.get(user.id);

            if (!member) {
                return interaction.reply({
                    content: '❌ Không tìm thấy người dùng này!',
                    ephemeral: true
                });
            }

            try {
                await channel.permissionOverwrites.edit(member, {
                    Connect: true
                });

                return interaction.reply({
                    content: `✅ Đã cho phép ${member.user.tag} vào channel!`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error permitting user:', error);
                return interaction.reply({
                    content: '❌ Không thể cho phép người dùng này!',
                    ephemeral: true
                });
            }
        }

        // Reject command
        if (subcommand === 'reject') {
            const user = interaction.options.getUser('user');
            const member = interaction.guild.members.cache.get(user.id);

            if (!member) {
                return interaction.reply({
                    content: '❌ Không tìm thấy người dùng này!',
                    ephemeral: true
                });
            }

            try {
                // Check if user is in the channel
                if (member.voice.channel && member.voice.channel.id === channel.id) {
                    // Get the "Join to Create" channel to move them to
                    const voiceMaster = await VoiceMaster.findOne({ guildId: interaction.guild.id });
                    if (voiceMaster) {
                        const joinChannel = interaction.guild.channels.cache.get(voiceMaster.voiceChannelId);
                        if (joinChannel) {
                            await member.voice.setChannel(joinChannel);
                        } else {
                            await member.voice.disconnect();
                        }
                    } else {
                        await member.voice.disconnect();
                    }
                }

                // Deny permission
                await channel.permissionOverwrites.edit(member, {
                    Connect: false,
                    ViewChannel: true
                });

                return interaction.reply({
                    content: `❌ Đã từ chối ${member.user.tag} khỏi channel!`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error rejecting user:', error);
                return interaction.reply({
                    content: '❌ Không thể từ chối người dùng này!',
                    ephemeral: true
                });
            }
        }

        // Claim command
        if (subcommand === 'claim') {
            // Check if user is in a voice channel
            if (!interaction.member.voice.channel) {
                return interaction.reply({
                    content: '❌ Bạn không ở trong voice channel nào!',
                    ephemeral: true
                });
            }

            const currentChannel = interaction.member.voice.channel;

            // Check if this is a VoiceMaster channel
            const existingOwner = await VoiceMasterChannel.findOne({ voiceId: currentChannel.id });

            if (!existingOwner) {
                return interaction.reply({
                    content: '❌ Bạn không thể sở hữu channel này!',
                    ephemeral: true
                });
            }

            // Check if owner is still in the channel
            const ownerMember = interaction.guild.members.cache.get(existingOwner.userId);
            const ownerInChannel = currentChannel.members.has(existingOwner.userId);

            if (ownerInChannel) {
                return interaction.reply({
                    content: `❌ Channel này đã được sở hữu bởi ${ownerMember.user.tag}!`,
                    ephemeral: true
                });
            }

            // Transfer ownership
            await VoiceMasterChannel.findOneAndUpdate(
                { voiceId: currentChannel.id },
                { userId: interaction.user.id }
            );

            return interaction.reply({
                content: '👑 Bạn đã trở thành chủ sở hữu của channel này!',
                ephemeral: true
            });
        }
    }
};
