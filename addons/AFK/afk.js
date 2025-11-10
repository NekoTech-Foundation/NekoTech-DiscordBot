const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

module.exports.run = async (client) => {
    client.afkUsers = new Map();
    
    const configPath = path.join(__dirname, 'config.yml');
    let config;
    try {
        config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.error('Failed to load AFK config:', error);
        return;
    }

    const createEmbed = (template, data) => {
        const embed = new EmbedBuilder()
            .setColor(template.color || config.settings.default_color)
            .setTitle(replaceVariables(template.title, data))
            .setDescription(replaceVariables(template.description, data));

        if (template.thumbnail) {
            embed.setThumbnail(
                template.thumbnail === '{user_avatar}' 
                    ? data.user.displayAvatarURL({ dynamic: true, size: 256 }) 
                    : config.settings.default_thumbnail || data.user.displayAvatarURL()
            );
        }

        if (template.footer) {
            embed.setFooter({
                text: replaceVariables(template.footer.text, data),
                iconURL: replaceVariables(template.footer.icon, data)
            });
        }

        return embed;
    };

    const replaceVariables = (text, data) => {
        return text
            .replace('{username}', data.user.username)
            .replace('{user_avatar}', data.user.displayAvatarURL({ dynamic: true }))
            .replace('{reason}', data.reason || 'Không có lí do cụ thể')
            .replace('{return_time}', data.returnTime ? `<t:${Math.floor(data.returnTime/1000)}:R>` : 'Không xác định')
            .replace('{timestamp}', `<t:${Math.floor(data.timestamp/1000)}:R>`)
            .replace('{duration}', data.duration || '');
    };

    // Auto-remove AFK when return time reached
    setInterval(() => {
        const now = Date.now();

        client.afkUsers.forEach(async (data, userId) => {
            if (data.returnTime && now >= data.returnTime) {
                const user = client.users.cache.get(userId);
                if (user) {
                    const guild = client.guilds.cache.get(data.guildId);
                    if (guild) {
                        const channel = guild.channels.cache.get(data.channelId);
                        if (channel && channel.permissionsFor(client.user).has('SendMessages')) {
                            const messageData = {
                                user,
                                duration: formatDuration(now - data.timestamp),
                                reason: data.reason,
                                timestamp: data.timestamp
                            };

                            const embed = new EmbedBuilder()
                                .setColor('#4CAF50')
                                .setAuthor({
                                    name: `${user.username} đã trở lại!`,
                                    iconURL: user.displayAvatarURL({ dynamic: true })
                                })
                                .setDescription(`**👋 Chào mừng trở lại!**`)
                                .addFields(
                                    {
                                        name: '⏱️ Thời gian AFK',
                                        value: `\`${messageData.duration}\``,
                                        inline: true
                                    },
                                    {
                                        name: '📝 Lí do trước đó',
                                        value: `\`${data.reason}\``,
                                        inline: true
                                    }
                                )
                                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
                                .setFooter({
                                    text: 'Trạng thái AFK đã được tự động xóa',
                                    iconURL: client.user.displayAvatarURL()
                                })
                                .setTimestamp();

                            await channel.send({ 
                                content: `<@${userId}>`,
                                embeds: [embed] 
                            });
                        }
                    }
                }
                client.afkUsers.delete(userId);
            }
        });
    }, 60000); // Check every minute

    // Handle message events
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        
        // Check if the message author is returning from AFK
        if (client.afkUsers.has(message.author.id)) {
            const data = client.afkUsers.get(message.author.id);
            const afkDuration = formatDuration(Date.now() - data.timestamp);
            
            // Remove AFK status immediately
            client.afkUsers.delete(message.author.id);

            try {
                // Send welcome back message in the CURRENT channel where user sent message
                const embed = new EmbedBuilder()
                    .setColor('#4CAF50')
                    .setAuthor({
                        name: `${message.author.username} đã trở lại!`,
                        iconURL: message.author.displayAvatarURL({ dynamic: true })
                    })
                    .setDescription(`**👋 Chào mừng trở lại!**\n\n*Bạn đã rời máy trong ${afkDuration}*`)
                    .addFields(
                        {
                            name: '📝 Lí do AFK',
                            value: `\`\`\`${data.reason}\`\`\``,
                            inline: false
                        },
                        {
                            name: '⏰ Bắt đầu AFK',
                            value: `<t:${Math.floor(data.timestamp/1000)}:F>`,
                            inline: true
                        },
                        {
                            name: '🔙 Trở lại lúc',
                            value: `<t:${Math.floor(Date.now()/1000)}:F>`,
                            inline: true
                        }
                    )
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setFooter({
                        text: 'Trạng thái AFK đã được xóa',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                // Reply in the same channel
                await message.reply({ embeds: [embed] });

            } catch (error) {
                console.error('Error removing AFK status:', error);
                // Fallback to simple message if embed fails
                try {
                    await message.reply(`👋 Chào mừng trở lại **${message.author.username}**! Bạn đã AFK trong ${afkDuration}`);
                } catch (err) {
                    console.error('Error sending fallback message:', err);
                }
            }
        }

        // Check if message mentions any AFK users
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(async mentionedUser => {
                if (client.afkUsers.has(mentionedUser.id)) {
                    const afkData = client.afkUsers.get(mentionedUser.id);
                    const afkTime = formatDuration(Date.now() - afkData.timestamp);

                    try {
                        const embed = new EmbedBuilder()
                            .setColor('#FF6B6B')
                            .setAuthor({
                                name: `${mentionedUser.username} đang AFK`,
                                iconURL: mentionedUser.displayAvatarURL({ dynamic: true })
                            })
                            .setDescription(`**💤 Người dùng này hiện đang rời máy**`)
                            .addFields(
                                {
                                    name: '📝 Lí do',
                                    value: `\`\`\`${afkData.reason}\`\`\``,
                                    inline: false
                                },
                                {
                                    name: '⏰ Đã AFK',
                                    value: afkTime,
                                    inline: true
                                },
                                {
                                    name: '🔙 Quay lại',
                                    value: afkData.returnTime ? `<t:${Math.floor(afkData.returnTime/1000)}:R>` : '`Không xác định`',
                                    inline: true
                                }
                            )
                            .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true, size: 256 }))
                            .setFooter({
                                text: 'Họ sẽ nhận được thông báo khi quay lại',
                                iconURL: client.user.displayAvatarURL()
                            })
                            .setTimestamp();

                        await message.reply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Error sending AFK mention notification:', error);
                    }
                }
            });
        }
    });
};

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} ngày ${hours % 24} giờ`;
    } else if (hours > 0) {
        return `${hours} giờ ${minutes % 60} phút`;
    } else if (minutes > 0) {
        return `${minutes} phút`;
    } else {
        return 'ít hơn 1 phút';
    }
}