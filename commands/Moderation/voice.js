const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('Quản lý và kiểm duyệt kênh thoại')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.MuteMembers | PermissionsBitField.Flags.DeafenMembers | PermissionsBitField.Flags.MoveMembers)
        .addSubcommand(sub =>
            sub.setName('mute')
                .setDescription('Tắt mic của thành viên trong kênh thoại')
                .addUserOption(option => option.setName('user').setDescription('Người dùng cần tắt mic').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lý do').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('unmute')
                .setDescription('Bật mic cho thành viên trong kênh thoại')
                .addUserOption(option => option.setName('user').setDescription('Người dùng cần bật mic').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('deafen')
                .setDescription('Tắt loa của thành viên trong kênh thoại')
                .addUserOption(option => option.setName('user').setDescription('Người dùng cần tắt loa').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lý do').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('undeafen')
                .setDescription('Bật loa cho thành viên trong kênh thoại')
                .addUserOption(option => option.setName('user').setDescription('Người dùng cần bật loa').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('kick')
                .setDescription('Ngắt kết nối thành viên khỏi kênh thoại')
                .addUserOption(option => option.setName('user').setDescription('Người dùng cần kick').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lý do').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('moveall')
                .setDescription('Di chuyển tất cả thành viên từ kênh này sang kênh khác')
                .addChannelOption(option =>
                    option.setName('destination')
                        .setDescription('Kênh đích đến')
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option.setName('source')
                        .setDescription('Kênh nguồn (mặc định là kênh bạn đang ngồi)')
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                        .setRequired(false)
                )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getMember('user'); // Returns GuildMember
        const reason = interaction.options.getString('reason') || 'Không có lý do';

        if (['mute', 'unmute', 'deafen', 'undeafen', 'kick'].includes(subcommand)) {
            if (!user.voice.channel) {
                return interaction.reply({ content: '❌ Người dùng này không ở trong kênh thoại!', ephemeral: true });
            }

            // Check permissions hierarchy
            if (user.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({ content: '❌ Bạn không thể tác động lên người có quyền hạn cao hơn hoặc bằng bạn.', ephemeral: true });
            }
        }

        try {
            if (subcommand === 'mute') {
                await user.voice.setMute(true, reason);
                await interaction.reply({
                    embeds: [new EmbedBuilder().setColor('#f97316').setDescription(`🔇 **${user.user.tag}** đã bị tắt mic.\n📝 Lý do: ${reason}`)]
                });
            }
            else if (subcommand === 'unmute') {
                await user.voice.setMute(false);
                await interaction.reply({
                    embeds: [new EmbedBuilder().setColor('#22c55e').setDescription(`🔊 **${user.user.tag}** đã được bật mic.`)]
                });
            }
            else if (subcommand === 'deafen') {
                await user.voice.setDeaf(true, reason);
                await interaction.reply({
                    embeds: [new EmbedBuilder().setColor('#f97316').setDescription(`🔇 **${user.user.tag}** đã bị tắt loa.\n📝 Lý do: ${reason}`)]
                });
            }
            else if (subcommand === 'undeafen') {
                await user.voice.setDeaf(false);
                await interaction.reply({
                    embeds: [new EmbedBuilder().setColor('#22c55e').setDescription(`🔊 **${user.user.tag}** đã được bật loa.`)]
                });
            }
            else if (subcommand === 'kick') {
                await user.voice.disconnect(reason);
                await interaction.reply({
                    embeds: [new EmbedBuilder().setColor('#ef4444').setDescription(`👢 **${user.user.tag}** đã bị kick khỏi kênh thoại.\n📝 Lý do: ${reason}`)]
                });
            }
            else if (subcommand === 'moveall') {
                const destination = interaction.options.getChannel('destination');
                let source = interaction.options.getChannel('source');

                // If source not specified, use author's voice channel
                if (!source) {
                    if (!interaction.member.voice.channel) {
                        return interaction.reply({ content: '❌ Bạn phải ở trong một kênh thoại hoặc chỉ định kênh nguồn!', ephemeral: true });
                    }
                    source = interaction.member.voice.channel;
                }

                if (source.id === destination.id) {
                    return interaction.reply({ content: '❌ Kênh nguồn và kênh đích không được trùng nhau!', ephemeral: true });
                }

                if (source.members.size === 0) {
                    return interaction.reply({ content: '❌ Kênh nguồn không có thành viên nào!', ephemeral: true });
                }

                await interaction.deferReply();

                let count = 0;
                for (const [memberId, member] of source.members) {
                    try {
                        await member.voice.setChannel(destination);
                        count++;
                    } catch (e) {
                        console.error(`Failed to move ${member.user.tag}: ${e}`);
                    }
                }

                await interaction.editReply({
                    embeds: [new EmbedBuilder().setColor('#3b82f6').setDescription(`✈️ Đã di chuyển **${count}** thành viên từ **${source.name}** sang **${destination.name}**.`)]
                });
            }
        } catch (error) {
            console.error(error);
            // Handle error (e.g., user left voice mid-command)
            const replyContent = '❌ Đã xảy ra lỗi khi thực hiện lệnh. (Có thể người dùng đã rời kênh hoặc bot thiếu quyền)';
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: replyContent });
            } else {
                await interaction.reply({ content: replyContent, ephemeral: true });
            }
        }
    }
};
