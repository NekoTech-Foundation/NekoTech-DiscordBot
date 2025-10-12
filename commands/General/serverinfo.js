const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ChannelType, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const moment = require('moment');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const { Chart, registerables, CategoryScale, LinearScale, LineController, LineElement, PointElement } = require('chart.js');
const { createCanvas } = require('canvas');

const config = getConfig();
const lang = getLang();

Chart.register(...registerables, CategoryScale, LinearScale, LineController, LineElement, PointElement);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Lấy thông tin chi tiết về máy chủ'),
    category: 'Chung',
    async execute(interaction) {
        try {
            const guild = interaction.guild;
            const createdTimestamp = Math.floor(guild.createdAt.getTime() / 1000);
            const description = guild.description || "Không có mô tả";
            const icon = guild.iconURL();
            const owner = await guild.fetchOwner();

            let textChannelCount = 0;
            let voiceChannelCount = 0;
            let otherChannelCount = 0;
            try {
                const channels = await guild.channels.fetch();
                channels.forEach(channel => {
                    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildNews) {
                        textChannelCount++;
                    } else if (channel.type === ChannelType.GuildVoice) {
                        voiceChannelCount++;
                    } else {
                        otherChannelCount++;
                    }
                });
            } catch (error) {
                console.error('Lỗi khi lấy kênh: ', error);
            }

            const serverInfo = new EmbedBuilder()
                .setAuthor({ name: guild.name, iconURL: icon || null })
                .setTitle(lang.ServerInfo.Embed.Title)
                .setDescription(lang.ServerInfo.Embed.Description
                    .replace('{description}', description)
                    .replace('{memberCount}', guild.memberCount)
                    .replace('{botCount}', guild.members.cache.filter(member => member.user.bot).size)
                    .replace('{roleCount}', guild.roles.cache.size))
                .setColor(lang.ServerInfo.Embed.Color)
                .setFooter({ 
                    text: lang.ServerInfo.Embed.Footer.Text.replace('{user}', interaction.user.tag), 
                    iconURL: interaction.user.displayAvatarURL() 
                });

            if (icon) {
                serverInfo.setThumbnail(icon);
            }

            const iconLinks = icon
                ? lang.ServerInfo.IconLinks
                    .replace('{iconPng}', `${icon}?size=1024`)
                    .replace('{iconJpg}', `${icon.replace('.png', '.jpg')}?size=1024`)
                    .replace('{iconGif}', `${icon.replace('.png', '.gif')}?size=1024`)
                : lang.ServerInfo.NoIcon;

            serverInfo.addFields(
                {
                    name: lang.ServerInfo.Embed.Fields.Channels.Name,
                    value: lang.ServerInfo.Embed.Fields.Channels.Value
                        .replace('{textChannels}', textChannelCount)
                        .replace('{voiceChannels}', voiceChannelCount)
                        .replace('{otherChannels}', otherChannelCount),
                    inline: false
                },
                {
                    name: lang.ServerInfo.Embed.Fields.ServerDetails.Name,
                    value: lang.ServerInfo.Embed.Fields.ServerDetails.Value
                        .replace('{owner}', `<@${owner.id}>`)
                        .replace('{serverId}', guild.id)
                        .replace('{language}', guild.preferredLocale)
                        .replace('{boostCount}', guild.premiumSubscriptionCount)
                        .replace('{createdAt}', `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`),
                    inline: false
                },
                {
                    name: lang.ServerInfo.Embed.Fields.ServerIcon.Name,
                    value: iconLinks,
                    inline: false
                }
            );

            const chartImageBuffer = await generateMemberChart(guild);
            const attachment = new AttachmentBuilder(chartImageBuffer, { name: 'member_chart.png' });

            serverInfo.setImage('attachment://member_chart.png');

            serverInfo.setTimestamp();

            interaction.reply({ embeds: [serverInfo], files: [attachment] });

        } catch (error) {
            console.error('Lỗi trong lệnh serverinfo: ', error);
            interaction.reply({ content: 'Xin lỗi, đã xảy ra lỗi khi lấy thông tin máy chủ.', flags: MessageFlags.Ephemeral });
        }
    }
};

async function generateMemberChart(guild) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const allMembers = await guild.members.fetch();
    const initialCount = Math.round(allMembers.filter(member => member.joinedAt < startDate).size);
    const filteredMembers = allMembers.filter(member => member.joinedAt >= startDate && member.joinedAt <= endDate);

    const dataPoints = [{ x: formatDate(startDate), y: initialCount }];
    const timeDiff = endDate - startDate;
    const interval = timeDiff / 10;

    for (let i = 1; i <= 10; i++) {
        const intervalDate = new Date(startDate.getTime() + i * interval);
        const count = initialCount + filteredMembers.filter(member => member.joinedAt <= intervalDate).size;
        dataPoints.push({ x: formatDate(intervalDate), y: Math.round(count) });
    }

    const chartData = {
        labels: dataPoints.map(point => point.x),
        datasets: [{
            label: 'Số lượng thành viên',
            data: dataPoints.map(point => point.y),
            borderColor: '#382bff',
            backgroundColor: '#382bff'
        }]
    };

    return generateChartImage(chartData, '1 Tuần');
}

async function generateChartImage(data, period) {
    const width = 1200;
    const height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const createGradient = (ctx, canvas) => {
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'rgba(56, 43, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(56, 43, 255, 0.8)');
        return gradient;
    };

    const gradient = createGradient(ctx, canvas);

    const datasets = [{
        label: 'Thành viên',
        data: data.datasets[0].data,
        borderColor: '#382bff',
        borderWidth: 3,
        backgroundColor: gradient,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#382bff',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 4,
        pointHoverBackgroundColor: '#382bff',
        pointHoverBorderColor: '#FFFFFF'
    }];

    const configuration = {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: datasets
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Số lượng thành viên',
                        font: {
                            size: 24,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        color: '#FFFFFF'
                    },
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return Math.round(value);
                        },
                        stepSize: 1,
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: 10
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Ngày',
                        font: {
                            size: 24,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        color: '#FFFFFF'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 8,
                        maxRotation: 0,
                        minRotation: 0,
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: 10
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `Tăng trưởng thành viên (${period})`,
                    font: {
                        size: 32,
                        weight: 'bold',
                        family: 'Arial'
                    },
                    color: '#FFFFFF',
                    padding: {
                        top: 20,
                        bottom: 30
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 16,
                        weight: 'bold',
                        family: 'Arial'
                    },
                    bodyFont: {
                        size: 14,
                        family: 'Arial'
                    },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(tooltipItem) {
                            return `${Math.round(tooltipItem.raw)} thành viên`;
                        }
                    }
                }
            },
            responsive: false,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 40,
                    bottom: 40,
                    left: 20,
                    right: 40
                }
            }
        },
        plugins: [{
            id: 'backgroundColor',
            beforeDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillStyle = '#101010';
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }]
    };

    const chart = new Chart(ctx, configuration);
    const buffer = canvas.toBuffer('image/png');
    chart.destroy();

    return buffer;
}

function formatDate(date) {
    return moment(date).format('D MMM');
}