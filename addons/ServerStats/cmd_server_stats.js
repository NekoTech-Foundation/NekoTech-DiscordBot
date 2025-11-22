const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const ServerStats = require('../../models/ServerStats');
const moment = require('moment-timezone');

async function fetchServerStats(guild) {
    await guild.members.fetch();
    const members = guild.members.cache;
    const channels = guild.channels.cache;
    const roles = guild.roles.cache;
    const emojis = guild.emojis.cache;
    const stickers = guild.stickers.cache;
    const bans = await guild.bans.fetch();

    const userCount = members.filter(m => !m.user.bot).size;
    const botCount = members.filter(m => m.user.bot).size;
    const onlineCount = members.filter(m => !m.user.bot && m.presence?.status !== 'offline').size;
    const offlineCount = userCount - onlineCount;

    const textChannelCount = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannelCount = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const categoryCount = channels.filter(c => c.type === ChannelType.GuildCategory).size;
    const forumCount = channels.filter(c => c.type === ChannelType.GuildForum).size;

    return {
        userCount,
        botCount,
        totalCount: guild.memberCount,
        onlineCount,
        offlineCount,
        textChannelCount,
        voiceChannelCount,
        categoryCount,
        forumCount,
        roleCount: roles.size,
        boostCount: guild.premiumSubscriptionCount,
        // Placeholders for stats that need tracking
        messageCount: 0,
        animatedEmojiCount: emojis.filter(e => e.animated).size,
        staticEmojiCount: emojis.filter(e => !e.animated).size,
        stickerCount: stickers.size,
        banCount: bans.size,
        kickCount: 0,
        timeoutCount: 0,
        eventCount: guild.scheduledEvents.cache.size,
    };
}

function createStatsEmbed(stats, guild) {
    const lastRefresh = moment().format('DD/MM/YY, h:mm A');
    return new EmbedBuilder()
        .setTitle('Thông tin Máy Chủ ( Discord Server )')
        .setColor('Blue')
        .setThumbnail(guild.iconURL())
        .setImage(guild.bannerURL({ size: 1024 }))
        .addFields(
            { name: 'Members', value: `🙋🏻‍♂️ Người dùng: ${stats.userCount}\n🤖 Bots: ${stats.botCount}\n👪 Tổng: ${stats.totalCount}\n🟢 Online: ${stats.onlineCount}\n⚫ Offline: ${stats.offlineCount}`, inline: true },
            { name: 'Kênh', value: `📝 Văn bản: ${stats.textChannelCount}\n🔊 Voice: ${stats.voiceChannelCount}\n📂 Danh Mục: ${stats.categoryCount}\n💬 Diễn Đàn: ${stats.forumCount}`, inline: true },
            { name: 'Thông tin', value: `🎭 Vai Trò: ${stats.roleCount}\n⚡ Boosts: ${stats.boostCount}`, inline: true },
            { name: 'Content', value: `💬 Messages: ${stats.messageCount}\n😄 Emojis: ${stats.staticEmojiCount}\n🎭 Animated: ${stats.animatedEmojiCount}\n🌟 Stickers: ${stats.stickerCount}`, inline: true },
            { name: 'Moderation', value: `🔨 Bans: ${stats.banCount}\n👢 Kicks: ${stats.kickCount}\n⏰ Timeouts: ${stats.timeoutCount}\n📅 Events: ${stats.eventCount}`, inline: true }
        )
        .setFooter({ text: `Trạng thái refresh cuối cùng:\n${lastRefresh}` });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Lệnh liên quan đến server.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('statics_setup')
                .setDescription('Cài đặt kênh thống kê server.')
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'Bạn không có quyền sử dụng lệnh này.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        let statsChannel;

        const existingSetup = await ServerStats.findOne({ guildId: guild.id });
        if (existingSetup) {
            try {
                statsChannel = await guild.channels.fetch(existingSetup.channelId);
                const statsMessage = await statsChannel.messages.fetch(existingSetup.messageId);
                await statsMessage.delete();
            } catch (error) {
                // Channel or message might have been deleted, proceed to create a new one
            }
        }

        if (!statsChannel) {
            statsChannel = await guild.channels.create({
                name: '📊-server-stats',
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.SendMessages],
                        allow: [PermissionsBitField.Flags.ViewChannel]
                    }
                ]
            });
        }

        const stats = await fetchServerStats(guild);
        const embed = createStatsEmbed(stats, guild);

        const message = await statsChannel.send({ embeds: [embed] });

        await ServerStats.findOneAndUpdate(
            { guildId: guild.id },
            { channelId: statsChannel.id, messageId: message.id },
            { upsert: true }
        );

        await interaction.editReply({ content: `Đã cài đặt kênh thống kê tại ${statsChannel}.` });
    },
    fetchServerStats,
    createStatsEmbed
};
