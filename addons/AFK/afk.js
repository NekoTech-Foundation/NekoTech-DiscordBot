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

    const getNotificationChannel = (guild, defaultChannel) => {
        if (config.settings.notification_channel) {
            return guild.channels.cache.get(config.settings.notification_channel) || defaultChannel;
        }
        return defaultChannel;
    };

    const createEmbed = (template, data) => {
        const embed = new EmbedBuilder()
            .setColor(template.color || config.settings.default_color)
            .setTitle(replaceVariables(template.title, data))
            .setDescription(replaceVariables(template.description, data));

        if (template.thumbnail) {
            embed.setThumbnail(
                template.thumbnail === '{user_avatar}' 
                    ? data.user.displayAvatarURL() 
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
            .replace('{user_avatar}', data.user.displayAvatarURL())
            .replace('{reason}', data.reason || 'Không lí do cụ thể')
            .replace('{return_time}', data.returnTime ? `<t:${Math.floor(data.returnTime/1000)}:R>` : 'Indefinite')
            .replace('{timestamp}', `<t:${Math.floor(data.timestamp/1000)}:R>`)
            .replace('{duration}', data.duration || '');
    };

    setInterval(() => {
        const now = Date.now();

        client.afkUsers.forEach((data, userId) => {
            if (data.returnTime && now >= data.returnTime) {
                const user = client.users.cache.get(userId);
                if (user) {
                    const messageData = {
                        user,
                        duration: formatDuration(now - data.timestamp),
                        reason: data.reason,
                        timestamp: data.timestamp
                    };

                    const template = config.messages.afk_disabled;
                    const guild = client.guilds.cache.first();
                    const channel = getNotificationChannel(guild, 
                        guild.channels.cache.find(c => c.type === 0 && 
                            c.permissionsFor(client.user).has('SendMessages'))
                    );

                    if (channel) {
                        if (template.type === 'embed') {
                            channel.send({ 
                                embeds: [createEmbed(template.embed, messageData)] 
                            });
                        } else {
                            channel.send(replaceVariables(template.text, messageData));
                        }
                    }
                }
                client.afkUsers.delete(userId);
            }
        });
    }, 60000);

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        
        if (client.afkUsers.has(message.author.id)) {
            
            const data = client.afkUsers.get(message.author.id);
            const messageData = {
                user: message.author,
                duration: formatDuration(Date.now() - data.timestamp),
                reason: data.reason,
                timestamp: data.timestamp
            };

            try {
                client.afkUsers.delete(message.author.id);

                const template = config.messages.afk_disabled;
                if (template.type === 'embed') {
                    const embed = createEmbed(template.embed, messageData);
                    await message.channel.send({ embeds: [embed] });
                } else {
                    const text = replaceVariables(template.text, messageData);
                    await message.channel.send(text);
                }

            } catch (error) {
                console.error('Error removing AFK status:', error);
            }
        }

        message.mentions.users.forEach(mentionedUser => {
            if (client.afkUsers.has(mentionedUser.id)) {
                const afkData = client.afkUsers.get(mentionedUser.id);
                const messageData = {
                    user: mentionedUser,
                    reason: afkData.reason,
                    timestamp: afkData.timestamp,
                    returnTime: afkData.returnTime
                };

                const template = config.messages.mention;
                if (template.type === 'embed') {
                    const embed = createEmbed(template.embed, messageData);
                    message.reply({ embeds: [embed] });
                } else {
                    const text = replaceVariables(template.text, messageData);
                    message.reply(text);
                }
            }
        });
    });
};

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return 'ít hơn 1 phút';
    }
} 