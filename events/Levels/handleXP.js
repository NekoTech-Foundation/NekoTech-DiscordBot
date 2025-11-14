const { EmbedBuilder, ChannelType } = require('discord.js');
const UserData = require('../../models/UserData');
//const fs = require('fs');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

const xpCooldown = new Map();
const voiceXpTimers = new Map();
const spamTracker = new Map();

function getRandomXP(range) {
    const [min, max] = range.split('-').map(Number);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomLevelMessage(placeholders) {
    const messages = lang.Levels.LevelMessages;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    return replacePlaceholders(randomMessage, placeholders);
}

function replacePlaceholders(text, placeholders) {
    return text.replace(/{(\w+)}/g, (_, key) => placeholders[key] || `{${key}}`);
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function parseTime(timeString) {
    const regex = /^(\d+)([smhd])$/;
    const match = timeString.match(regex);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 0;
    }
}

async function handleXP(message) {
    if (!message || !message.guild) {
        console.warn('Received an invalid message or missing guild');
        return;
    }

    if (!config.LevelingSystem || !config.CommandsPrefix) {
        console.error('Missing necessary configuration for Leveling System or Commands Prefix');
        return;
    }

    if (!config.LevelingSystem.Enabled || message.author.bot || message.content.startsWith(config.CommandsPrefix) ||
        config.LevelingSystem.ChannelSettings.DisabledChannels?.includes(message.channel.id) ||
        (message.channel.parentId && config.LevelingSystem.ChannelSettings.DisabledCategories?.includes(message.channel.parentId))) {
        return;
    }

    // Simple anti-spam: limit messages counted per user per guild in a short window
    const spamWindowMs = (config.LevelingSystem.SpamProtection?.WindowSeconds || 10) * 1000;
    const spamMaxMessages = config.LevelingSystem.SpamProtection?.MaxMessages || 7;
    const spamKey = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    let spamInfo = spamTracker.get(spamKey);

    if (!spamInfo || now - spamInfo.windowStart > spamWindowMs) {
        spamInfo = { count: 0, windowStart: now };
    }

    spamInfo.count += 1;
    spamTracker.set(spamKey, spamInfo);

    if (spamInfo.count > spamMaxMessages) {
        return;
    }

    if (config.LevelingSystem.CooldownSettings.EnableXPCooldown) {
        const cooldownAmount = parseTime(config.LevelingSystem.CooldownSettings.XPCooldown || '20s');
        const currentTime = Date.now();
        const cooldownKey = `${message.guild.id}-${message.author.id}`;
        const userCooldown = xpCooldown.get(cooldownKey);

        if (userCooldown && currentTime < userCooldown + cooldownAmount) {
            return;
        }

        xpCooldown.set(cooldownKey, currentTime);
        setTimeout(() => xpCooldown.delete(cooldownKey), cooldownAmount);
    }

    try {
        let userData = await UserData.findOne({ userId: message.author.id, guildId: message.guild.id });
        if (!userData) {
            userData = new UserData({ userId: message.author.id, guildId: message.guild.id, xp: 0, level: 0, totalMessages: 0, balance: 0 });
        }

        const xpToAdd = getRandomXP(config.LevelingSystem.MessageXP);
        if (isNaN(xpToAdd) || xpToAdd <= 0) {
            console.error('Invalid XP configuration');
            return;
        }

        let levelUpMessageSent = false;

        userData.xp += xpToAdd;
        const xpNeeded = userData.level === 0 ? 70 : userData.level * config.LevelingSystem.XPNeeded;

        while (userData.xp >= xpNeeded) {
            if (levelUpMessageSent) break;

            const oldLevel = userData.level;
            userData.xp -= xpNeeded;
            userData.level++;
            const newLevel = userData.level;

            const levelUpRoles = config.LevelingSystem.RoleSettings.LevelRoles || [];
            for (const levelUpRole of levelUpRoles) {
                if (userData.level >= levelUpRole.level && levelUpRole.roleID) {
                    const role = message.guild.roles.cache.get(levelUpRole.roleID);
                    if (role) {
                        await message.member.roles.add(role);
                        if (!config.LevelingSystem.RoleSettings.StackRoles) {
                            for (const otherLevelUpRole of levelUpRoles) {
                                if (userData.level > otherLevelUpRole.level && otherLevelUpRole.roleID && otherLevelUpRole.roleID !== levelUpRole.roleID) {
                                    const oldRole = message.guild.roles.cache.get(otherLevelUpRole.roleID);
                                    if (oldRole) {
                                        await message.member.roles.remove(oldRole);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            const scaleRewards = config.LevelingSystem.RoleSettings.ScaleRewards || {};
            const rewards = scaleRewards.Rewards || [];

            let highestReward = { level: 0, coins: 0 };
            for (const scaleReward of rewards) {
                if (newLevel % scaleReward.level === 0 && scaleReward.coins > highestReward.coins) {
                    highestReward = scaleReward;
                }
            }

            if (highestReward.coins > 0) {
                userData.balance += highestReward.coins;
            }

            let channel = message.channel;

            if (config.LevelingSystem.ChannelSettings.LevelUpChannelID && config.LevelingSystem.ChannelSettings.LevelUpChannelID !== 'CHANNEL_ID' && message.guild.channels.cache.has(config.LevelingSystem.ChannelSettings.LevelUpChannelID)) {
                const configuredChannel = message.guild.channels.cache.get(config.LevelingSystem.ChannelSettings.LevelUpChannelID);
                if (configuredChannel && configuredChannel.type === ChannelType.GuildText) {
                    channel = configuredChannel;
                }
            }

            if (!channel || channel.type !== ChannelType.GuildText) {
                channel = message.channel;
            }

            const placeholders = {
                userName: message.author.username,
                user: message.author.toString(),
                userId: message.author.id,
                guildName: message.guild.name,
                guildIcon: message.guild.iconURL(),
                userIcon: message.author.displayAvatarURL(),
                oldLevel: oldLevel,
                newLevel: newLevel,
                oldXP: xpToAdd,
                newXP: xpNeeded,
                randomLevelMessage: getRandomLevelMessage({
                    userName: message.author.username,
                    user: message.author.toString(),
                    userId: message.author.id,
                    guildName: message.guild.name,
                    guildIcon: message.guild.iconURL(),
                    userIcon: message.author.displayAvatarURL(),
                    oldLevel: oldLevel,
                    newLevel: newLevel,
                    oldXP: xpToAdd,
                    newXP: xpNeeded
                })
            };

            const userIconURL = placeholders.userIcon;
            const guildIconURL = placeholders.guildIcon;

            if (config.LevelingSystem.LevelUpMessageSettings.UseEmbed) {
                const embed = new EmbedBuilder().setColor(config.LevelingSystem.LevelUpMessageSettings.Embed.Color || '#34eb6b');

                if (config.LevelingSystem.LevelUpMessageSettings.Embed.Title) {
                    embed.setTitle(replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Title, placeholders));
                }

                if (config.LevelingSystem.LevelUpMessageSettings.Embed.Description && config.LevelingSystem.LevelUpMessageSettings.Embed.Description.length > 0) {
                    embed.setDescription(config.LevelingSystem.LevelUpMessageSettings.Embed.Description.map(line => replacePlaceholders(line, placeholders)).join('\n'));
                }

                if (config.LevelingSystem.LevelUpMessageSettings.Embed.Footer && config.LevelingSystem.LevelUpMessageSettings.Embed.Footer.Text) {
                    const footerText = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Footer.Text, placeholders);
                    const footerIconURL = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Footer.Icon || "", placeholders);
                    if (footerText) {
                        embed.setFooter({
                            text: footerText,
                            iconURL: isValidUrl(footerIconURL) ? footerIconURL : null
                        });
                    } else {
                        embed.setFooter({
                            text: footerText
                        });
                    }
                }

                if (config.LevelingSystem.LevelUpMessageSettings.Embed.Author && config.LevelingSystem.LevelUpMessageSettings.Embed.Author.Text) {
                    const authorIconURL = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Author.Icon || "", placeholders);
                    embed.setAuthor({
                        name: replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Author.Text, placeholders),
                        iconURL: isValidUrl(authorIconURL) ? authorIconURL : null
                    });
                }

                if (config.LevelingSystem.LevelUpMessageSettings.Embed.Thumbnail) {
                    const thumbnailURL = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Thumbnail, placeholders);
                    if (isValidUrl(thumbnailURL)) {
                        embed.setThumbnail(thumbnailURL);
                    }
                }

                if (config.LevelingSystem.LevelUpMessageSettings.Embed.Image) {
                    const imageURL = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Image, placeholders);
                    if (isValidUrl(imageURL)) {
                        embed.setImage(imageURL);
                    }
                }

                channel.send({ embeds: [embed] });
            } else {
                const levelUpMessage = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.LevelUpMessage, placeholders);
                if (levelUpMessage.trim() !== '') {
                    channel.send(levelUpMessage);
                }
            }
            levelUpMessageSent = true; 
        }

        await userData.save();
    } catch (error) {
        console.error('Error handling XP:', error);
    }
}

async function handleVoiceXP(client, member) {
    if (!member || !member.guild) {
        return;
    }

    if (!config.LevelingSystem.Enabled || member.user.bot) {
        return;
    }

    if (member.voice.channel && member.voice.channel.parentId &&
        config.LevelingSystem.ChannelSettings.DisabledCategories?.includes(member.voice.channel.parentId)) {
        return;
    }

    const voiceInterval = parseTime(config.LevelingSystem.CooldownSettings.VoiceInterval || '10s');
    const timerKey = `${member.guild.id}-${member.id}`;
    let userData = await UserData.findOne({ userId: member.id, guildId: member.guild.id });
    if (!userData) {
        userData = new UserData({ userId: member.id, guildId: member.guild.id, xp: 0, level: 0, totalMessages: 0, balance: 0 });
    }

    if (voiceXpTimers.has(timerKey)) {
        clearInterval(voiceXpTimers.get(timerKey));
        voiceXpTimers.delete(timerKey);
    }

    const intervalId = setInterval(async () => {
        const xpToAdd = getRandomXP(config.LevelingSystem.VoiceXP);
        if (isNaN(xpToAdd) || xpToAdd <= 0) {
            console.error('Invalid XP configuration');
            return;
        }

        userData.xp += xpToAdd;
        const xpNeeded = userData.level === 0 ? 70 : userData.level * config.LevelingSystem.XPNeeded;

        while (userData.xp >= xpNeeded) {
            const oldLevel = userData.level;
            userData.xp -= xpNeeded;
            userData.level++;
            const newLevel = userData.level;

            const levelUpRoles = config.LevelingSystem.RoleSettings.LevelRoles || [];
            for (const levelUpRole of levelUpRoles) {
                if (userData.level >= levelUpRole.level && levelUpRole.roleID) {
                    const role = member.guild.roles.cache.get(levelUpRole.roleID);
                    if (role) {
                        await member.roles.add(role);
                        if (!config.LevelingSystem.RoleSettings.StackRoles) {
                            for (const otherLevelUpRole of levelUpRoles) {
                                if (userData.level > otherLevelUpRole.level && otherLevelUpRole.roleID && otherLevelUpRole.roleID !== levelUpRole.roleID) {
                                    const oldRole = member.guild.roles.cache.get(otherLevelUpRole.roleID);
                                    if (oldRole) {
                                        await member.roles.remove(oldRole);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            const scaleRewards = config.LevelingSystem.RoleSettings.ScaleRewards || {};
            const rewards = scaleRewards.Rewards || [];

            let highestReward = { level: 0, coins: 0 };
            for (const scaleReward of rewards) {
                if (newLevel % scaleReward.level === 0 && scaleReward.coins > highestReward.coins) {
                    highestReward = scaleReward;
                }
            }

            if (highestReward.coins > 0) {
                userData.balance += highestReward.coins;
            }

            let channel;
            
            if (config.LevelingSystem.ChannelSettings.LevelUpChannelID && 
                config.LevelingSystem.ChannelSettings.LevelUpChannelID !== 'CHANNEL_ID') {
                channel = member.guild.channels.cache.get(config.LevelingSystem.ChannelSettings.LevelUpChannelID);
            }

            if (!channel || channel.type !== ChannelType.GuildText) {
                channel = member.guild.channels.cache.find(ch => ch.type === ChannelType.GuildText);
            }

            if (!channel) {
                console.warn(`Could not find a valid text channel to send level up message for user ${member.id}`);
                continue;
            }

            const placeholders = {
                userName: member.user.username,
                user: member.user.toString(),
                userId: member.user.id,
                guildName: member.guild.name,
                guildIcon: member.guild.iconURL(),
                userIcon: member.user.displayAvatarURL(),
                oldLevel: oldLevel,
                newLevel: newLevel,
                oldXP: xpToAdd,
                newXP: xpNeeded,
                randomLevelMessage: getRandomLevelMessage({
                    userName: member.user.username,
                    user: member.user.toString(),
                    userId: member.user.id,
                    guildName: member.guild.name,
                    guildIcon: member.guild.iconURL(),
                    userIcon: member.user.displayAvatarURL(),
                    oldLevel: oldLevel,
                    newLevel: newLevel,
                    oldXP: xpToAdd,
                    newXP: xpNeeded
                })
            };

            const userIconURL = placeholders.userIcon;
            const guildIconURL = placeholders.guildIcon;

            try {
                if (config.LevelingSystem.LevelUpMessageSettings.UseEmbed) {
                    const embed = new EmbedBuilder()
                    .setColor(config.LevelingSystem.LevelUpMessageSettings.Embed.Color || '#34eb6b');

                    if (config.LevelingSystem.LevelUpMessageSettings.Embed.Title) {
                        embed.setTitle(replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Title, placeholders));
                    }

                    if (config.LevelingSystem.LevelUpMessageSettings.Embed.Description && config.LevelingSystem.LevelUpMessageSettings.Embed.Description.length > 0) {
                        embed.setDescription(config.LevelingSystem.LevelUpMessageSettings.Embed.Description.map(line => replacePlaceholders(line, placeholders)).join('\n'));
                    }

                    if (config.LevelingSystem.LevelUpMessageSettings.Embed.Footer && config.LevelingSystem.LevelUpMessageSettings.Embed.Footer.Text) {
                        const footerText = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Footer.Text, placeholders);
                        const footerIconURL = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Footer.Icon || "", placeholders);
                        if (footerText) {
                            embed.setFooter({
                                text: footerText,
                                iconURL: isValidUrl(footerIconURL) ? footerIconURL : null
                            });
                        } else {
                            embed.setFooter({
                                text: footerText
                            });
                        }
                    }

                    if (config.LevelingSystem.LevelUpMessageSettings.Embed.Author && config.LevelingSystem.LevelUpMessageSettings.Embed.Author.Text) {
                        const authorIconURL = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Author.Icon || "", placeholders);
                        embed.setAuthor({
                            name: replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Author.Text, placeholders),
                            iconURL: isValidUrl(authorIconURL) ? authorIconURL : null
                        });
                    }

                    if (config.LevelingSystem.LevelUpMessageSettings.Embed.Thumbnail) {
                        const thumbnailURL = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Thumbnail, placeholders);
                        if (isValidUrl(thumbnailURL)) {
                            embed.setThumbnail(thumbnailURL);
                        }
                    }

                    if (config.LevelingSystem.LevelUpMessageSettings.Embed.Image) {
                        const imageURL = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.Embed.Image, placeholders);
                        if (isValidUrl(imageURL)) {
                            embed.setImage(imageURL);
                        }
                    }

                    await channel.send({ embeds: [embed] }).catch(err => {
                        console.error('Failed to send level up embed:', err);
                    });
                } else {
                    const levelUpMessage = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.LevelUpMessage, placeholders);
                    if (levelUpMessage.trim() !== '') {
                        await channel.send(levelUpMessage).catch(err => {
                            console.error('Failed to send level up message:', err);
                        });
                    }
                }
            } catch (error) {
                console.error('Error sending level up message:', error);
            }
        }

        await userData.save().catch(err => {
            console.error('Failed to save user data:', err);
        });
    }, voiceInterval);

    voiceXpTimers.set(timerKey, intervalId);

    const handleVoiceStateUpdate = (oldState, newState) => {
        if (oldState.member.id === member.id && 
            (!newState.channelId || oldState.channelId !== newState.channelId)) {
            const existingTimer = voiceXpTimers.get(timerKey);
            if (existingTimer) {
                clearInterval(existingTimer);
                voiceXpTimers.delete(timerKey);
            }
            client.off('voiceStateUpdate', handleVoiceStateUpdate);
        }
    };

    client.on('voiceStateUpdate', handleVoiceStateUpdate);
}

module.exports = {
    handleXP,
    handleVoiceXP
};
