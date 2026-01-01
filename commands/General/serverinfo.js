const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    ChannelType,
    MessageFlags
} = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const moment = require('moment');
const { getConfig } = require('../../utils/configLoader.js');
const {
    Chart,
    registerables,
    CategoryScale,
    LinearScale,
    LineController,
    LineElement,
    PointElement
} = require('chart.js');
const { createCanvas } = require('canvas');

const config = getConfig();

Chart.register(
    ...registerables,
    CategoryScale,
    LinearScale,
    LineController,
    LineElement,
    PointElement
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Xem thông tin chi tiết về máy chủ hiện tại'),
    category: 'Chung',
    async execute(interaction, lang) {
        try {
            const guild = interaction.guild;
            const createdTimestamp = Math.floor(guild.createdAt.getTime() / 1000);
            const description = guild.description || 'Không có mô tả.';
            const icon = guild.iconURL();
            const owner = await guild.fetchOwner();

            let textChannelCount = 0;
            let voiceChannelCount = 0;
            let otherChannelCount = 0;

            try {
                const channels = await guild.channels.fetch();
                channels.forEach(channel => {
                    if (!channel) return;
                    if (
                        channel.type === ChannelType.GuildText ||
                        channel.type === ChannelType.GuildNews
                    ) {
                        textChannelCount++;
                    } else if (channel.type === ChannelType.GuildVoice) {
                        voiceChannelCount++;
                    } else {
                        otherChannelCount++;
                    }
                });
            } catch (error) {
                console.error('Lỗi khi lấy danh sách kênh:', error);
            }

            const serverInfo = new EmbedBuilder()
                .setColor(config.EmbedColors?.Default || '#5865F2')
                .setAuthor({
                    name: `📊 Thông tin máy chủ`,
                    iconURL: icon || interaction.client.user.displayAvatarURL()
                })
                .setThumbnail(icon || null)
                .setDescription(
                    [
                        `> 📛 **Tên:** ${guild.name}`,
                        `> 👑 **Chủ sở hữu:** ${owner.user.tag} (<@${owner.id}>)`,
                        `> 🆔 **ID:** ${guild.id}`,
                        `> 🌐 **Ngôn ngữ:** ${guild.preferredLocale}`,
                        `> ✨ **Boosts:** ${guild.premiumSubscriptionCount}`,
                        `> 📆 **Tạo lúc:** <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`,
                        '',
                        `📝 **Mô tả:**`,
                        description
                    ].join('\n')
                )
                .addFields(
                    {
                        name: '📡 Kênh',
                        value: [
                            `• 💬 Văn bản: **${textChannelCount}**`,
                            `• 🔊 Thoại: **${voiceChannelCount}**`,
                            `• 📁 Khác: **${otherChannelCount}**`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '👥 Thành viên',
                        value: [
                            `• Tổng: **${guild.memberCount}**`,
                            `• Bot: **${
                                guild.members.cache.filter(m => m.user.bot).size
                            }**`,
                            `• Người dùng: **${
                                guild.memberCount -
                                guild.members.cache.filter(m => m.user.bot).size
                            }**`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setFooter({
                    text: `Yêu cầu bởi ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            const chartImageBuffer = await generateMemberChart(guild);
            const attachment = new AttachmentBuilder(chartImageBuffer, {
                name: 'member_chart.png'
            });

            serverInfo.setImage('attachment://member_chart.png');

            await interaction.reply({ embeds: [serverInfo], files: [attachment] });
        } catch (error) {
            console.error('Lỗi trong lệnh serverinfo:', error);
            await interaction.reply({
                content: '⚠️ Xin lỗi, đã xảy ra lỗi khi lấy thông tin máy chủ.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};

async function generateMemberChart(guild) {
    const historyPath = './serverHistory.yml';

    if (!fs.existsSync(historyPath)) {
        return createEmptyChart();
    }

    const historyData = yaml.load(fs.readFileSync(historyPath, 'utf8')) || {};
    const guildHistory = historyData[guild.id] || [];

    if (!guildHistory.length) {
        return createEmptyChart();
    }

    const labels = guildHistory.map(entry => formatDate(entry.date));
    const data = guildHistory.map(entry => entry.memberCount);

    const width = 900;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const configuration = {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Thành viên',
                    data,
                    fill: true,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3b82f6',
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#3b82f6',
                    pointHoverBorderColor: '#ffffff',
                    borderWidth: 3
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback(value) {
                            return Math.round(value);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Số lượng thành viên'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Ngày'
                    }
                }
            },
            responsive: false,
            maintainAspectRatio: false
        }
    };

    const chart = new Chart(ctx, configuration);
    const buffer = canvas.toBuffer('image/png');
    chart.destroy();

    return buffer;
}

function createEmptyChart() {
    const width = 900;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#e5e7eb';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Chưa có dữ liệu lịch sử thành viên', width / 2, height / 2);

    return canvas.toBuffer('image/png');
}

function formatDate(date) {
    return moment(date).format('D MMM');
}

