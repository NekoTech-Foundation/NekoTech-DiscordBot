const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const os = require('os');
const { getConfig } = require('../../utils/configLoader.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Kiểm tra độ trễ và trạng thái của bot'),
    category: 'General',

    async execute(interaction) {
        // Đo thời gian phản hồi
        const sent = await interaction.deferReply({ fetchReply: true });
        const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;

        // Lấy API latency, nếu -1 thì dùng roundTrip làm giá trị ước tính
        let apiLatency = Math.round(interaction.client.ws.ping);
        if (apiLatency < 0) {
            apiLatency = roundTrip;
        }

        // Tính toán uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Tính toán memory usage
        const memoryUsage = process.memoryUsage();
        const memoryUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
        const memoryTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
        const memoryPercent = ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1);

        // Xác định màu embed dựa trên ping
        let embedColor;
        let statusEmoji;
        let statusText;

        if (apiLatency < 100) {
            embedColor = 0x2ECC71; // Xanh lá - Tuyệt vời
            statusEmoji = '🟢';
            statusText = 'Tuyệt vời';
        } else if (apiLatency < 200) {
            embedColor = 0x3498DB; // Xanh dương - Tốt
            statusEmoji = '🔵';
            statusText = 'Tốt';
        } else if (apiLatency < 300) {
            embedColor = 0xF39C12; // Vàng - Trung bình
            statusEmoji = '🟡';
            statusText = 'Trung bình';
        } else {
            embedColor = 0xE74C3C; // Đỏ - Chậm
            statusEmoji = '🔴';
            statusText = 'Chậm';
        }

        // Tạo embed với thông tin chi tiết
        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('🏓 Pong!')
            .setDescription(`${statusEmoji} **Trạng thái:** ${statusText}`)
            .addFields(
                {
                    name: '📡 Độ Trễ WebSocket',
                    value: `\`\`\`fix
${apiLatency}ms\`\`\``,
                    inline: true
                },
                {
                    name: '🔄 Độ Trễ Phản Hồi',
                    value: `\`\`\`fix
${roundTrip}ms\`\`\``,
                    inline: true
                },
                {
                    name: '📊 Shard',
                    value: `\`\`\`fix
#${interaction.guild ? interaction.guild.shardId : 0}\`\`\``,
                    inline: true
                },
                {
                    name: '⏱️ Thời Gian Hoạt Động',
                    value: `\`\`\`yaml
${uptimeString}\`\`\``,
                    inline: true
                },
                {
                    name: '💾 Bộ Nhớ Sử Dụng',
                    value: `\`\`\`yaml
${memoryUsed}MB / ${memoryTotal}MB (${memoryPercent}%)\`\`\``,
                    inline: true
                },
                {
                    name: '⚡ CPU',
                    value: `\`\`\`yaml
${os.cpus()[0].model.split(' ')[0]}\`\`\``,
                    inline: true
                },
                {
                    name: '🖥️ Hệ Thống',
                    value: `\`\`\`yaml
${os.platform()} ${os.arch()}\`\`\``,
                    inline: true
                },
                {
                    name: '📦 Node.js',
                    value: `\`\`\`yaml
${process.version}\`\`\``,
                    inline: true
                },
                {
                    name: '🤖 Discord.js',
                    value: `\`\`\`yaml
v${require('discord.js').version}\`\`\``,
                    inline: true
                }
            )
            .setFooter({
                text: `Yêu cầu bởi ${interaction.user.tag}${getConfig().IsWhitelabel ? ' | Whitelabel từ KentaBuckets' : ''}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        // Thêm thumbnail nếu bot có avatar
        if (interaction.client.user.displayAvatarURL()) {
            embed.setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }));
        }

        // Thêm progress bar cho ping
        const maxPing = 500;
        const pingPercent = Math.min((apiLatency / maxPing) * 100, 100);
        const barLength = 20;
        const filled = Math.round((pingPercent / 100) * barLength);
        const empty = barLength - filled;
        const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

        embed.addFields({
            name: '📈 Biểu Đồ Độ Trễ',
            value: `\`${progressBar}\` ${apiLatency}ms`,
            inline: false
        });

        // Gửi embed
        await interaction.editReply({
            content: null,
            embeds: [embed]
        });
    }
};