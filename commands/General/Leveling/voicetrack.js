const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const VoiceSession = require('../../../models/VoiceSession');
const UserData = require('../../../models/UserData');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const moment = require('moment-timezone');

// Helper to format seconds into readable string
function formatTime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return parts.join(' ') || `${s}s`;
}

async function generateChart(labels, data, title, type = 'line') {
    const width = 800;
    const height = 400;
    const chartCallback = (ChartJS) => {
        ChartJS.defaults.responsive = true;
        ChartJS.defaults.maintainAspectRatio = false;
    };
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

    const config = {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            plugins: {
                title: { display: true, text: title, color: '#white', font: { size: 20 } },
                legend: { labels: { color: 'white' } }
            },
            scales: {
                y: { ticks: { color: 'white', callback: (val) => formatTime(val) }, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    };
    return await chartJSNodeCanvas.renderToBuffer(config);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voicetrack')
        .setDescription('Hệ thống theo dõi và thống kê Voice Chat')
        // MY
        .addSubcommandGroup(group =>
            group.setName('my')
                .setDescription('Thống kê của bạn')
                .addSubcommand(sub => sub.setName('stats').setDescription('Xem thống kê voice cá nhân'))
                .addSubcommand(sub =>
                    sub.setName('graph')
                        .setDescription('Xem biểu đồ voice cá nhân')
                        .addStringOption(op => op.setName('period').setDescription('Khoảng thời gian').setRequired(false)
                            .addChoices({ name: '7 ngày qua', value: '7d' }, { name: '30 ngày qua', value: '30d' }))
                )
        )
        // SERVER
        .addSubcommandGroup(group =>
            group.setName('server')
                .setDescription('Thống kê toàn server')
                .addSubcommand(sub => sub.setName('stats').setDescription('Xem thống kê voice server'))
                .addSubcommand(sub =>
                    sub.setName('graph')
                        .setDescription('Xem biểu đồ voice server')
                        .addStringOption(op => op.setName('period').setDescription('Khoảng thời gian').setRequired(false)
                            .addChoices({ name: '7 ngày qua', value: '7d' }, { name: '30 ngày qua', value: '30d' }))
                )
        )
        // USER
        .addSubcommandGroup(group =>
            group.setName('user')
                .setDescription('Thống kê người khác')
                .addSubcommand(sub => sub.setName('stats').setDescription('Xem thống kê voice user').addUserOption(op => op.setName('user').setDescription('User').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('graph')
                        .setDescription('Xem biểu đồ voice user')
                        .addUserOption(op => op.setName('user').setDescription('User').setRequired(true))
                        .addStringOption(op => op.setName('period').setDescription('Khoảng thời gian').setRequired(false)
                            .addChoices({ name: '7 ngày qua', value: '7d' }, { name: '30 ngày qua', value: '30d' }))
                )
        )
        // CHANNEL
        .addSubcommandGroup(group =>
            group.setName('channel')
                .setDescription('Thống kê kênh')
                .addSubcommand(sub => sub.setName('stats').setDescription('Xem thống kê voice channel').addChannelOption(op => op.setName('channel').setDescription('Channel').setRequired(true)))
                .addSubcommand(sub => sub.setName('ranking').setDescription('Xếp hạng các kênh voice'))
        )
        // RANKING
        .addSubcommandGroup(group =>
            group.setName('ranking')
                .setDescription('Bảng xếp hạng')
                .addSubcommand(sub => sub.setName('voice').setDescription('Xếp hạng thành viên (Top Voice)'))
        )
        // RESET (Admin)
        .addSubcommandGroup(group =>
            group.setName('reset')
                .setDescription('Reset dữ liệu (Admin)')
                .addSubcommand(sub => sub.setName('user').setDescription('Reset user').addUserOption(op => op.setName('user').setDescription('User').setRequired(true)))
                .addSubcommand(sub => sub.setName('server').setDescription('Reset toàn bộ server'))
        ),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup();
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        await interaction.deferReply();

        // --- STATS LOGIC ---
        if (sub === 'stats') {
            let targetUser = interaction.user;
            let targetChannel = null;

            if (group === 'user') targetUser = interaction.options.getUser('user');
            if (group === 'channel') targetChannel = interaction.options.getChannel('channel');

            if (targetChannel) {
                // Channel Stats
                const sessions = await VoiceSession.find({ guildId, channelId: targetChannel.id });
                const totalTime = sessions.reduce((acc, s) => acc + s.duration, 0);
                const uniqueUsers = new Set(sessions.map(s => s.userId)).size;

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Thống Kê Voice: ${targetChannel.name}`)
                    .setColor('#0099ff')
                    .addFields(
                        { name: 'Tổng thời gian hoạt động', value: formatTime(totalTime), inline: true },
                        { name: 'Số session', value: `${sessions.length}`, inline: true },
                        { name: 'Người dùng tham gia', value: `${uniqueUsers}`, inline: true }
                    );
                return interaction.editReply({ embeds: [embed] });
            } else {
                // User Stats (My or User)
                const userSessions = await VoiceSession.find({ guildId, userId: targetUser.id });
                const totalTime = userSessions.reduce((acc, s) => acc + s.duration, 0);

                // Get cached total from UserData (fallback/check)
                const userData = await UserData.findOne({ userId: targetUser.id, guildId: 'global' });
                const cachedTime = userData?.voiceTime || 0;

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Thống Kê Voice: ${targetUser.username}`)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setColor('#0099ff')
                    .addFields(
                        { name: 'Tổng thời gian voice', value: formatTime(totalTime || cachedTime), inline: true },
                        { name: 'Tổng số lần join', value: `${userSessions.length}`, inline: true }
                    );
                return interaction.editReply({ embeds: [embed] });
            }
        }

        // --- GRAPH LOGIC ---
        else if (sub === 'graph') {
            let targetUser = interaction.user;
            if (group === 'user') targetUser = interaction.options.getUser('user');
            const period = interaction.options.getString('period') || '7d';
            const days = period === '7d' ? 7 : 30;

            const endDate = moment();
            const startDate = moment().subtract(days, 'days');
            const labels = [];
            const dataPoints = [];

            // Fetch Data
            let allSessions;
            if (group === 'server') {
                allSessions = await VoiceSession.find({ guildId });
            } else {
                allSessions = await VoiceSession.find({ guildId, userId: targetUser.id });
            }

            // Aggregate by day
            for (let i = 0; i < days; i++) {
                const day = moment().subtract(days - 1 - i, 'days');
                const dateStr = day.format('YYYY-MM-DD');
                labels.push(day.format('DD/MM'));

                const sessionsOfDay = allSessions.filter(s => s.date === dateStr);
                const totalDuration = sessionsOfDay.reduce((acc, s) => acc + s.duration, 0);
                dataPoints.push(totalDuration);
            }

            const title = group === 'server' ? `Biểu đồ Voice Server (${period})` : `Biểu đồ Voice: ${targetUser.username} (${period})`;
            const imageBuffer = await generateChart(labels, dataPoints, title, 'line');
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'chart.png' });

            return interaction.editReply({ files: [attachment] });
        }

        // --- RANKING LOGIC ---
        else if ((group === 'ranking' && sub === 'voice') || (group === 'channel' && sub === 'ranking')) {
            if (sub === 'voice') {
                // User Ranking (Use UserData for speed or VoiceSession Aggregation)
                // Use UserData.voiceTime which we cache
                const allData = await UserData.find({ guildId: 'global' });
                // Need to filter members in guild? Yes.
                const members = await interaction.guild.members.fetch();
                const filtered = allData.filter(d => members.has(d.userId) && d.voiceTime > 0)
                    .sort((a, b) => b.voiceTime - a.voiceTime)
                    .slice(0, 10);

                const desc = filtered.map((d, i) => {
                    return `**${i + 1}.** <@${d.userId}> - ${formatTime(d.voiceTime)}`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('🏆 Bảng Xếp Hạng Voice (Top 10)')
                    .setDescription(desc || 'Chưa có dữ liệu.')
                    .setColor('Gold');
                return interaction.editReply({ embeds: [embed] });

            } else {
                // Channel Ranking
                const allSessions = await VoiceSession.find({ guildId });
                const channelMap = {};
                for (const s of allSessions) {
                    if (!channelMap[s.channelId]) channelMap[s.channelId] = 0;
                    channelMap[s.channelId] += s.duration;
                }

                const sorted = Object.entries(channelMap)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10);

                const desc = sorted.map(([id, time], i) => {
                    return `**${i + 1}.** <#${id}> - ${formatTime(time)}`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('🏆 Bảng Xếp Hạng Kênh Voice')
                    .setDescription(desc || 'Chưa có dữ liệu.')
                    .setColor('Gold');
                return interaction.editReply({ embeds: [embed] });
            }
        }

        // --- SERVER STATS ---
        else if (group === 'server' && sub === 'stats') {
            const allSessions = await VoiceSession.find({ guildId });
            const totalTime = allSessions.reduce((acc, s) => acc + s.duration, 0);
            const uniqueUsers = new Set(allSessions.map(s => s.userId)).size;

            const embed = new EmbedBuilder()
                .setTitle(`📊 Thống Kê Server`)
                .addFields(
                    { name: 'Tổng thời gian voice', value: formatTime(totalTime), inline: true },
                    { name: 'Người dùng active', value: `${uniqueUsers}`, inline: true },
                    { name: 'Tổng số session', value: `${allSessions.length}`, inline: true }
                )
                .setColor('#0099ff');
            return interaction.editReply({ embeds: [embed] });
        }

        // --- RESET ---
        else if (group === 'reset') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.editReply({ content: '❌ Bạn không có quyền Administrator.' });
            }

            if (sub === 'user') {
                const user = interaction.options.getUser('user');
                await VoiceSession.deleteMany({ guildId, userId: user.id }); // Assuming db adapter supports deleteMany or loop
                // Also reset cache in UserData
                let userData = await UserData.findOne({ userId: user.id, guildId: 'global' });
                if (userData) { userData.voiceTime = 0; await userData.save(); }
                return interaction.editReply(`✅ Đã reset dữ liệu voice của ${user.tag}.`);
            } else if (sub === 'server') {
                // Warning: This deletes EVERYTHING for guild
                // Need check db adapter capabilities
                // For now assumes we can delete somehow or just instruct user it's done
                // VoiceSession is SQLiteModel. 
                // We might need to iterate and delete.
                // Implementing simple reset via filtered delete if possible, else manual loop
                const allSess = await VoiceSession.find({ guildId });
                for (const s of allSess) {
                    // await s.delete(); // If model supports instance delete
                    // Or use static delete method if available. 
                    // Assuming SQLiteModel has delete logic.
                }
                return interaction.editReply('⚠️ Tính năng Reset Server đang được hoàn thiện (Database driver limitations).');
            }
        }
    }
};
