const { 
    SlashCommandBuilder, 
    MessageFlags, 
    EmbedBuilder, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    version: discordVersion 
} = require('discord.js');
const os = require('os');
const process = require('process');
const { version } = require('../../package.json');
const { getConfig, getLang } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Thông tin chi tiết về bot KentaBuckets'),
    category: 'General',
    
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const bot = interaction.client;
            const uptimeTimestamp = Math.floor((Date.now() - bot.uptime) / 1000);
            const memoryUsage = process.memoryUsage();
            
            // Bot memory
            const totalMemory = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const memoryPercent = ((usedMemory / totalMemory) * 100).toFixed(1);

            // System memory
            const totalSystemMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const freeSystemMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
            const usedSystemMemory = (totalSystemMemory - freeSystemMemory).toFixed(2);
            const systemMemoryPercent = ((usedSystemMemory / totalSystemMemory) * 100).toFixed(1);

            // CPU info
            let cpuModel = os.cpus()[0].model.replace(/\s\d+-Core Processor/, '');
            const coreCount = os.cpus().length;

            // Timestamps
            const createdAt = `<t:${Math.floor(bot.user.createdAt / 1000)}:R>`;
            const joinedAt = interaction.guild.members.cache.get(bot.user.id)?.joinedAt
                ? `<t:${Math.floor(interaction.guild.members.cache.get(bot.user.id).joinedAt / 1000)}:R>`
                : 'Không xác định';

            // Ping
            let sent;
            try {
                sent = await interaction.fetchReply();
            } catch (error) {
                console.error('Failed to fetch reply:', error);
                return;
            }
            
            const pingLatency = sent.createdTimestamp - interaction.createdTimestamp;
            const wsLatency = bot.ws.ping;

            // Get bot starts
            const botStarts = await getBotStarts(interaction.guild.id);

            // Create progress bar
            const createProgressBar = (percentage, length = 10) => {
                const filled = Math.round((percentage / 100) * length);
                const empty = length - filled;
                const bar = '█'.repeat(filled) + '░'.repeat(empty);
                
                let color = '🟢';
                if (percentage > 70) color = '🟡';
                if (percentage > 90) color = '🔴';
                
                return `${color} \`${bar}\` ${percentage}%`;
            };

            // Main embed
            const botInfo = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ 
                    name: `${bot.user.username} - Thông tin Bot`,
                    iconURL: bot.user.displayAvatarURL()
                })
                .setThumbnail(bot.user.displayAvatarURL({ size: 256 }))
                .setDescription(`> 👋 Xin chào! Tôi là **${bot.user.username}**, bot Discord đa năng dựa trên Discord.js.\n> Dưới đây là thông tin chi tiết về hệ thống của tôi.`)
                .addFields(
                    {
                        name: '🤖 **Thông tin cơ bản**',
                        value: [
                            `> **Tên Bot:** ${bot.user.username}`,
                            `> **ID:** \`${bot.user.id}\``,
                            `> **Phiên bản:** \`v${version}\``,
                            `> **Được tạo:** ${createdAt}`,
                            `> **Tham gia server:** ${joinedAt}`,
                            `> **Số lần khởi động:** \`${botStarts}\` lần`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '📊 **Thống kê**',
                        value: [
                            `\`👥\` **Người dùng:** ${bot.users.cache.size.toLocaleString()}`,
                            `\`🏠\` **Máy chủ:** ${bot.guilds.cache.size.toLocaleString()}`,
                            `\`📝\` **Kênh:** ${bot.channels.cache.size.toLocaleString()}`,
                            `\`⚡\` **Lệnh:** ${bot.slashCommands.size.toLocaleString()}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⏱️ **Thời gian hoạt động**',
                        value: [
                            `\`🚀\` **Bắt đầu:** ${`<t:${uptimeTimestamp}:R>`}`,
                            `\`📅\` **Ngày giờ:** ${`<t:${uptimeTimestamp}:F>`}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🔧 **Hiệu suất hệ thống**',
                        value: [
                            `**RAM Bot:** ${usedMemory}MB / ${totalMemory}MB`,
                            createProgressBar(memoryPercent),
                            ``,
                            `**RAM Hệ thống:** ${usedSystemMemory}GB / ${totalSystemMemory}GB`,
                            createProgressBar(systemMemoryPercent)
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '💻 **Thông tin kỹ thuật**',
                        value: [
                            `\`📦\` **Discord.js:** v${discordVersion}`,
                            `\`🟢\` **Node.js:** ${process.version}`,
                            `\`💾\` **Platform:** ${os.type()} ${os.release()}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🖥️ **Phần cứng**',
                        value: [
                            `\`⚙️\` **CPU:** ${cpuModel}`,
                            `\`🔢\` **Cores:** ${coreCount} cores`,
                            `\`🌐\` **Ping:** ${pingLatency}ms`,
                            `\`📡\` **WebSocket:** ${wsLatency}ms`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Yêu cầu bởi ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            // Buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Mời Bot')
                        .setStyle(ButtonStyle.Link)
                        .setEmoji('🔗')
                        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${bot.user.id}&permissions=8&scope=bot%20applications.commands`),
                    new ButtonBuilder()
                        .setLabel('Support Server')
                        .setStyle(ButtonStyle.Link)
                        .setEmoji('💬')
                        .setURL('https://discord.gg/96hgDj4b4j'),
                    new ButtonBuilder()
                        .setLabel('Làm mới')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄')
                        .setCustomId('refresh_botinfo')
                );

            const response = await interaction.editReply({ 
                embeds: [botInfo],
                components: [row]
            });

            // Collector cho nút refresh
            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id && i.customId === 'refresh_botinfo',
                time: 300000 // 5 phút
            });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    
                    // Refresh data
                    const newUptimeTimestamp = Math.floor((Date.now() - bot.uptime) / 1000);
                    const newMemoryUsage = process.memoryUsage();
                    const newUsedMemory = (newMemoryUsage.heapUsed / 1024 / 1024).toFixed(2);
                    const newTotalMemory = (newMemoryUsage.heapTotal / 1024 / 1024).toFixed(2);
                    const newMemoryPercent = ((newUsedMemory / newTotalMemory) * 100).toFixed(1);

                    const newFreeSystemMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
                    const newUsedSystemMemory = (totalSystemMemory - newFreeSystemMemory).toFixed(2);
                    const newSystemMemoryPercent = ((newUsedSystemMemory / totalSystemMemory) * 100).toFixed(1);

                    const newSent = await i.fetchReply();
                    const newPingLatency = newSent.createdTimestamp - i.createdTimestamp;
                    const newWsLatency = bot.ws.ping;

                    // Update embed
                    const updatedEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setAuthor({ 
                            name: `${bot.user.username} - Thông tin Bot`,
                            iconURL: bot.user.displayAvatarURL()
                        })
                        .setThumbnail(bot.user.displayAvatarURL({ size: 256 }))
                        .setDescription(`> 👋 Xin chào! Tôi là **${bot.user.username}**, bot Discord đa năng của bạn.\n> Dưới đây là thông tin chi tiết về hệ thống của tôi.`)
                        .addFields(
                            {
                                name: '🤖 **Thông tin cơ bản**',
                                value: [
                                    `> **Tên Bot:** ${bot.user.username}`,
                                    `> **ID:** \`${bot.user.id}\``,
                                    `> **Phiên bản:** \`v${version}\``,
                                    `> **Được tạo:** ${createdAt}`,
                                    `> **Tham gia server:** ${joinedAt}`,
                                    `> **Số lần khởi động:** \`${botStarts}\` lần`
                                ].join('\n'),
                                inline: false
                            },
                            {
                                name: '📊 **Thống kê**',
                                value: [
                                    `\`👥\` **Người dùng:** ${bot.users.cache.size.toLocaleString()}`,
                                    `\`🏠\` **Máy chủ:** ${bot.guilds.cache.size.toLocaleString()}`,
                                    `\`📝\` **Kênh:** ${bot.channels.cache.size.toLocaleString()}`,
                                    `\`⚡\` **Lệnh:** ${bot.slashCommands.size.toLocaleString()}`
                                ].join('\n'),
                                inline: true
                            },
                            {
                                name: '⏱️ **Thời gian hoạt động**',
                                value: [
                                    `\`🚀\` **Bắt đầu:** ${`<t:${newUptimeTimestamp}:R>`}`,
                                    `\`📅\` **Ngày giờ:** ${`<t:${newUptimeTimestamp}:F>`}`
                                ].join('\n'),
                                inline: true
                            },
                            {
                                name: '🔧 **Hiệu suất hệ thống**',
                                value: [
                                    `**RAM Bot:** ${newUsedMemory}MB / ${newTotalMemory}MB`,
                                    createProgressBar(newMemoryPercent),
                                    ``,
                                    `**RAM Hệ thống:** ${newUsedSystemMemory}GB / ${totalSystemMemory}GB`,
                                    createProgressBar(newSystemMemoryPercent)
                                ].join('\n'),
                                inline: false
                            },
                            {
                                name: '💻 **Thông tin kỹ thuật**',
                                value: [
                                    `\`📦\` **Discord.js:** v${discordVersion}`,
                                    `\`🟢\` **Node.js:** ${process.version}`,
                                    `\`💾\` **Platform:** ${os.type()} ${os.release()}`
                                ].join('\n'),
                                inline: true
                            },
                            {
                                name: '🖥️ **Phần cứng**',
                                value: [
                                    `\`⚙️\` **CPU:** ${cpuModel}`,
                                    `\`🔢\` **Cores:** ${coreCount} cores`,
                                    `\`🌐\` **Ping:** ${newPingLatency}ms`,
                                    `\`📡\` **WebSocket:** ${newWsLatency}ms`
                                ].join('\n'),
                                inline: true
                            }
                        )
                        .setFooter({ 
                            text: `Làm mới bởi ${i.user.tag} • Cập nhật lúc`,
                            iconURL: i.user.displayAvatarURL()
                        })
                        .setTimestamp();

                    await i.editReply({ embeds: [updatedEmbed] });
                } catch (error) {
                    console.error('Error refreshing botinfo:', error);
                }
            });

            collector.on('end', async () => {
                try {
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('Mời Bot')
                                .setStyle(ButtonStyle.Link)
                                .setEmoji('🔗')
                                .setURL(`https://discord.com/api/oauth2/authorize?client_id=${bot.user.id}&permissions=8&scope=bot%20applications.commands`),
                            new ButtonBuilder()
                                .setLabel('Support Server')
                                .setStyle(ButtonStyle.Link)
                                .setEmoji('💬')
                                .setURL('https://discord.gg/96hgDj4b4j'),
                            new ButtonBuilder()
                                .setLabel('Làm mới')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('🔄')
                                .setCustomId('refresh_botinfo')
                                .setDisabled(true)
                        );
                    
                    await interaction.editReply({ components: [disabledRow] });
                } catch (error) {
                    if (error.code !== 10008) {
                        console.error('Error disabling buttons:', error);
                    }
                }
            });

        } catch (error) {
            console.error('Error in botinfo command:', error);
            try {
                const errorMessage = '❌ Đã có lỗi xảy ra khi lấy thông tin bot!';
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: errorMessage,
                        flags: MessageFlags.Ephemeral 
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage });
                }
            } catch (replyError) {
                console.error('Failed to reply with error message:', replyError);
            }
        }
    }
};

async function getBotStarts(guildId) {
    try {
        const GuildData = require('../../models/guildDataSchema');
        const guildData = await GuildData.findOne({ guildID: guildId });
        return guildData ? guildData.timesBotStarted.toLocaleString() : '0';
    } catch (error) {
        console.error('Error getting bot starts:', error);
        return '0';
    }
}