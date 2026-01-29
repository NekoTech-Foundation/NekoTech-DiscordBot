const { EmbedBuilder, ChannelType } = require('discord.js');
const UserData = require('../../models/UserData');
const GuildSettings = require('../../models/GuildSettings');
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
    const messages = lang?.Levels?.LevelMessages || ["Ting! {user} đã lên cấp {newLevel}!"];
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
        config.LevelingSystem.ChannelSettings?.DisabledChannels?.includes(message.channel.id) ||
        (message.channel.parentId && config.LevelingSystem.ChannelSettings?.DisabledCategories?.includes(message.channel.parentId))) {
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
        // Dùng bản ghi toàn cục cho level/xp (dùng guildId = 'global')
        let userData = await UserData.findOne({ userId: message.author.id, guildId: 'global' });
        if (!userData) {
            userData = await UserData.create({
                userId: message.author.id,
                guildId: 'global'
            });
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

            const levelUpRoles = config.LevelingSystem.RoleSettings?.LevelRoles || [];
            for (const levelUpRole of levelUpRoles) {
                if (userData.level >= levelUpRole.level && levelUpRole.roleID) {
                    const role = message.guild.roles.cache.get(levelUpRole.roleID);
                    if (role) {
                        await message.member.roles.add(role);
                        if (!config.LevelingSystem.RoleSettings?.StackRoles) {
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

            const scaleRewards = config.LevelingSystem.RoleSettings?.ScaleRewards || {};
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

            // Per-Guild Config Override
            const guildSettings = await GuildSettings.findOne({ guildId: message.guild.id });
            const mode = guildSettings?.leveling?.notificationMode || 'current'; // Default to 'current'

            if (mode === 'none') {
                channel = null; // Disable notification
            } else if (mode === 'channel') {
                const specificChannelId = guildSettings?.leveling?.levelUpChannelId;
                if (specificChannelId && message.guild.channels.cache.has(specificChannelId)) {
                    const specificChannel = message.guild.channels.cache.get(specificChannelId);
                    if (specificChannel.type === ChannelType.GuildText) {
                        channel = specificChannel;
                    }
                }
            } else {
                // mode === 'current' or fallback
                // Fallback to config.yml if specific per-guild channel is not set but 'channel' mode is selected (edge case) OR if still using old config style
                if (config.LevelingSystem.ChannelSettings?.LevelUpChannelID && config.LevelingSystem.ChannelSettings?.LevelUpChannelID !== 'CHANNEL_ID' && message.guild.channels.cache.has(config.LevelingSystem.ChannelSettings?.LevelUpChannelID)) {
                    // Only override if config.yml explicitly sets a channel AND per-guild mode is NOT 'current' (to respect 'current' default)
                    // Actually, per-guild settings should take precedence. If mode is 'current', use message.channel. 
                }
            }

            // Fallback for 'channel' mode if specific channel is invalid or generic fallback logic
            if ((!channel || channel.type !== ChannelType.GuildText) && mode !== 'none') {
                channel = message.channel;
            } else if (mode === 'none') {
                channel = null;
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

            if (channel) {
                if (config.LevelingSystem.LevelUpMessageSettings.UseEmbed) {
                    const embedSettings = config.LevelingSystem.LevelUpMessageSettings.Embed || {};
                    const embed = new EmbedBuilder().setColor(embedSettings.Color || '#34eb6b');

                    if (embedSettings.Title) {
                        embed.setTitle(replacePlaceholders(embedSettings.Title, placeholders));
                    }

                    let desc = '';
                    if (embedSettings.Description && Array.isArray(embedSettings.Description)) {
                        desc = embedSettings.Description.map(line => replacePlaceholders(line, placeholders)).join('\n');
                    } else if (typeof embedSettings.Description === 'string') {
                        desc = replacePlaceholders(embedSettings.Description, placeholders);
                    } else {
                        // Fallback to the plain text message if no embed description is provided
                        desc = replacePlaceholders(config.LevelingSystem.LevelUpMessageSettings.LevelUpMessage, placeholders);
                    }

                    if (desc && desc.trim().length > 0) {
                        embed.setDescription(desc);
                    }

                    if (!embed.data.description && !embed.data.title && !embed.data.image && !embed.data.thumbnail) {
                        // Absolute fallback to ensure embed is not empty
                        embed.setDescription(`Chúc mừng ${placeholders.user} đã lên cấp ${placeholders.newLevel}!`);
                    }

                    if (embedSettings.Footer && embedSettings.Footer.Text) {
                        const footerText = replacePlaceholders(embedSettings.Footer.Text, placeholders);
                        const footerIconURL = replacePlaceholders(embedSettings.Footer.Icon || "", placeholders);
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

                    if (embedSettings.Author && embedSettings.Author.Text) {
                        const authorIconURL = replacePlaceholders(embedSettings.Author.Icon || "", placeholders);
                        embed.setAuthor({
                            name: replacePlaceholders(embedSettings.Author.Text, placeholders),
                            iconURL: isValidUrl(authorIconURL) ? authorIconURL : null
                        });
                    }

                    if (embedSettings.Thumbnail) {
                        const thumbnailURL = replacePlaceholders(embedSettings.Thumbnail, placeholders);
                        if (isValidUrl(thumbnailURL)) {
                            embed.setThumbnail(thumbnailURL);
                        }
                    }

                    if (embedSettings.Image) {
                        const imageURL = replacePlaceholders(embedSettings.Image, placeholders);
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
        config.LevelingSystem.ChannelSettings?.DisabledCategories?.includes(member.voice.channel.parentId)) {
        return;
    }

    // Dùng bản ghi toàn cục cho level/xp (guildId = 'global')
    let userData = await UserData.findOne({ userId: member.id, guildId: 'global' });
    if (!userData) {
        userData = await UserData.create({
            userId: member.id,
            guildId: 'global'
        });
    }

    const xpToAdd = getRandomXP(config.LevelingSystem.VoiceXP);
    if (isNaN(xpToAdd) || xpToAdd <= 0) {
        // console.error('Invalid XP configuration');
        return;
    }

    userData.xp += xpToAdd;
    const xpNeeded = userData.level === 0 ? 70 : userData.level * config.LevelingSystem.XPNeeded;

    while (userData.xp >= xpNeeded) {
        const oldLevel = userData.level;
        userData.xp -= xpNeeded;
        userData.level++;
        const newLevel = userData.level;

        const levelUpRoles = config.LevelingSystem.RoleSettings?.LevelRoles || [];
        for (const levelUpRole of levelUpRoles) {
            if (userData.level >= levelUpRole.level && levelUpRole.roleID) {
                const role = member.guild.roles.cache.get(levelUpRole.roleID);
                if (role) {
                    await member.roles.add(role).catch(() => { });
                    if (!config.LevelingSystem.RoleSettings?.StackRoles) {
                        for (const otherLevelUpRole of levelUpRoles) {
                            if (userData.level > otherLevelUpRole.level && otherLevelUpRole.roleID && otherLevelUpRole.roleID !== levelUpRole.roleID) {
                                const oldRole = member.guild.roles.cache.get(otherLevelUpRole.roleID);
                                if (oldRole) {
                                    await member.roles.remove(oldRole).catch(() => { });
                                }
                            }
                        }
                    }
                }
            }
        }

        const scaleRewards = config.LevelingSystem.RoleSettings?.ScaleRewards || {};
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

        if (config.LevelingSystem.ChannelSettings?.LevelUpChannelID &&
            config.LevelingSystem.ChannelSettings?.LevelUpChannelID !== 'CHANNEL_ID') {
            channel = member.guild.channels.cache.get(config.LevelingSystem.ChannelSettings?.LevelUpChannelID);
        }

        if (!channel || channel.type !== ChannelType.GuildText) {
            channel = member.guild.channels.cache.find(ch => ch.type === ChannelType.GuildText);
        }

        if (!channel) {
            // console.warn(`Could not find a valid text channel to send level up message for user ${member.id}`);
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
            newXP: xpNeeded
        };
        // Generate random message only if used
        placeholders.randomLevelMessage = getRandomLevelMessage(placeholders);

        try {
            if (config.LevelingSystem.LevelUpMessageSettings.UseEmbed) {
                const embedSettings = config.LevelingSystem.LevelUpMessageSettings.Embed || {};
                const embed = new EmbedBuilder()
                    .setColor(embedSettings.Color || '#34eb6b');

                // Title
                if (embedSettings.Title) {
                    embed.setTitle(replacePlaceholders(embedSettings.Title, placeholders));
                } else {
                    embed.setTitle("🎉 Tăng Cấp!!!");
                }

                // Description
                let desc = '';
                if (embedSettings.Description && Array.isArray(embedSettings.Description)) {
                    desc = embedSettings.Description.map(line => replacePlaceholders(line, placeholders)).join('\n');
                } else if (typeof embedSettings.Description === 'string') {
                    desc = replacePlaceholders(embedSettings.Description, placeholders);
                } else {
                    // Richer Default Description
                    desc = `${placeholders.user} bây giờ là cấp **${placeholders.newLevel}**!\n\n_${placeholders.randomLevelMessage}_`;
                }

                if (desc && desc.trim().length > 0) {
                    embed.setDescription(desc);
                }

                // Fallback if description is somehow empty
                if (!embed.data.description && !embed.data.title && !embed.data.image && !embed.data.thumbnail) {
                    // Absolute fallback to ensure embed is not empty
                    embed.setDescription(`Chúc mừng ${placeholders.user} đã lên cấp ${placeholders.newLevel}!`);
                }

                // Footer
                if (embedSettings.Footer && embedSettings.Footer.Text) {
                    const footerText = replacePlaceholders(embedSettings.Footer.Text, placeholders);
                    const footerIconURL = replacePlaceholders(embedSettings.Footer.Icon || "", placeholders);
                    if (footerText) {
                        embed.setFooter({
                            text: footerText,
                            iconURL: isValidUrl(footerIconURL) ? footerIconURL : null
                        });
                    }
                } else {
                    embed.setFooter({ text: `Level Up • ${placeholders.guildName}`, iconURL: placeholders.guildIcon });
                }

                // Author
                if (embedSettings.Author && embedSettings.Author.Text) {
                    const authorIconURL = replacePlaceholders(embedSettings.Author.Icon || "", placeholders);
                    embed.setAuthor({
                        name: replacePlaceholders(embedSettings.Author.Text, placeholders),
                        iconURL: isValidUrl(authorIconURL) ? authorIconURL : null
                    });
                }

                // Thumbnail (User Avatar default)
                if (embedSettings.Thumbnail) {
                    const thumbnailURL = replacePlaceholders(embedSettings.Thumbnail, placeholders);
                    if (isValidUrl(thumbnailURL)) {
                        embed.setThumbnail(thumbnailURL);
                    }
                } else {
                    embed.setThumbnail(placeholders.userIcon);
                }

                // Image (User Avatar default)
                if (embedSettings.Image) {
                    const imageURL = replacePlaceholders(embedSettings.Image, placeholders);
                    if (isValidUrl(imageURL)) {
                        embed.setImage(imageURL);
                    }
                } else {
                    // Default to User Avatar as requested
                    embed.setImage(placeholders.userIcon);
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
}

module.exports = {
    handleXP,
    handleVoiceXP
};
