const { EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const UserData = require('../../models/UserData');
const GuildSettings = require('../../models/GuildSettings');
//const fs = require('fs');
const { getConfig, getLangSync, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLangSync();

const xpCooldown = new Map();
const voiceXpTimers = new Map();
const spamTracker = new Map();

function getRandomXP(range) {
    const [min, max] = range.split('-').map(Number);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomLevelMessage(placeholders) {
    const defaultMessages = [
        "Ting! {user} đã lên cấp {newLevel}!",
        "Chúc mừng {user}! Bạn đã đạt cấp {newLevel}!",
        "Wow! {user} đã thăng cấp {newLevel}. Quá dữ!",
        "Pằng chíu! {user} level up -> {newLevel}!",
        "Đỉnh của chóp! {user} cán mốc level {newLevel}!",
        "{user} đang cày cuốc rất chăm chỉ! Cấp {newLevel} rồi nè!",
        "Level up! {user} đã mạnh hơn một chút (Cấp {newLevel})!",
        "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ {user} đã lên cấp {newLevel}!",
        "Gắt quá! {user} đã leo lên cấp {newLevel}!",
        "{user} has leveled up to {newLevel}!"
    ];
    const messages = lang?.Levels?.LevelMessages || defaultMessages;
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
        // console.warn('Received an invalid message or missing guild');
        return;
    }

    // BLOCK BOTS & WEBHOOKS
    if (message.author.bot || message.webhookId) return;

    if (!config.LevelingSystem || !config.CommandsPrefix) {
        console.error('Missing necessary configuration for Leveling System or Commands Prefix');
        return;
    }

    if (!config.LevelingSystem.Enabled || message.content.startsWith(config.CommandsPrefix) ||
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
        // Global Data for XP/Level
        let userData = await UserData.findOne({ userId: message.author.id, guildId: 'global' });
        if (!userData) {
            userData = await UserData.create({
                userId: message.author.id,
                guildId: 'global'
            });
        }

        // Guild Data for Message Count
        let guildData = await UserData.findOne({ userId: message.author.id, guildId: message.guild.id });
        if (!guildData) {
            guildData = await UserData.create({
                userId: message.author.id,
                guildId: message.guild.id
            });
        }
        guildData.totalMessages = (guildData.totalMessages || 0) + 1;
        await guildData.save();

        const xpToAdd = getRandomXP(config.LevelingSystem.MessageXP);
        if (isNaN(xpToAdd) || xpToAdd <= 0) {
            console.error('Invalid XP configuration');
            return;
        }

        let levelUpMessageSent = false;

        userData.xp += xpToAdd;

        // SCALING XP FORMULA
        const scalingBase = config.LevelingSystem.XPScaling?.Base || 2800;
        const scalingIncrement = config.LevelingSystem.XPScaling?.Increment || 2500;
        const prestigeMult = config.LevelingSystem.XPScaling?.PrestigeMultiplier || 2.2;

        // Formula: (Base + (CurrentLevel * Increment)) * (Multiplier ^ Prestige)
        let xpNeeded = scalingBase + (userData.level * scalingIncrement);
        if (userData.prestige && userData.prestige > 0) {
            xpNeeded = Math.floor(xpNeeded * Math.pow(prestigeMult, userData.prestige));
        }

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
            const mode = guildSettings?.leveling?.notificationMode || 'current';

            if (mode === 'none') {
                channel = null;
            } else if (mode === 'channel') {
                const specificChannelId = guildSettings?.leveling?.levelUpChannelId;
                if (specificChannelId) {
                    const specificChannel = message.guild.channels.cache.get(specificChannelId);
                    if (specificChannel && specificChannel.isTextBased()) {
                        channel = specificChannel;
                    }
                }
            }

            // Fallback: If no channel found or current, use message.channel. 
            // If permissions are missing, we will check below.

            const placeholders = {
                userName: message.author.username,
                user: message.author.toString(),
                userId: message.author.id,
                guildName: message.guild.name,
                guildIcon: message.guild.iconURL(),
                userIcon: message.author.displayAvatarURL(),
                oldLevel: oldLevel,
                newLevel: newLevel,
                randomLevelMessage: getRandomLevelMessage({
                    user: message.author.toString(),
                    newLevel: newLevel
                })
            };

            // STRICT MESSAGING & UI
            if (channel) {
                // permission check
                const botPerms = channel.permissionsFor(message.guild.members.me);
                if (botPerms && botPerms.has(PermissionsBitField.Flags.SendMessages) && botPerms.has(PermissionsBitField.Flags.EmbedLinks)) {

                    const embed = new EmbedBuilder()
                        .setColor('#34eb6b') // Fixed Green Color
                        .setTitle("🎉 Tăng Cấp!!!")
                        .setDescription(`${placeholders.user} bây giờ là cấp **${placeholders.newLevel}**!\n\n_${placeholders.randomLevelMessage}_`)
                        .setThumbnail(placeholders.userIcon)
                        .setFooter({ text: `Level Up • ${placeholders.guildName}`, iconURL: placeholders.guildIcon });

                    await channel.send({ embeds: [embed] }).catch(console.error);
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
    const scalingBase = config.LevelingSystem.XPScaling?.Base || 2500;
    const scalingIncrement = config.LevelingSystem.XPScaling?.Increment || 2500;
    const prestigeMult = config.LevelingSystem.XPScaling?.PrestigeMultiplier || 1.5;

    let xpNeeded = scalingBase + (userData.level * scalingIncrement);
    if (userData.prestige && userData.prestige > 0) {
        xpNeeded = Math.floor(xpNeeded * Math.pow(prestigeMult, userData.prestige));
    }

    while (userData.xp >= xpNeeded) {
        const oldLevel = userData.level;
        userData.xp -= xpNeeded;
        userData.level++;
        const newLevel = userData.level;

        // Roles & Rewards (Keep Existing Logic)
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
                                if (oldRole) await member.roles.remove(oldRole).catch(() => { });
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

        // --- Notification Logic ---
        let channel = null;

        // 1. Configured Channel
        if (config.LevelingSystem.ChannelSettings?.LevelUpChannelID && config.LevelingSystem.ChannelSettings?.LevelUpChannelID !== 'CHANNEL_ID') {
            channel = member.guild.channels.cache.get(config.LevelingSystem.ChannelSettings?.LevelUpChannelID);
        }

        // 2. Context Channel (Voice Text Channel) if no configured channel
        if (!channel && member.voice.channel && member.voice.channel.isTextBased()) {
            channel = member.voice.channel;
        }

        // 3. Fallback: System Channel or First Text Channel
        if (!channel) {
            channel = member.guild.systemChannel || member.guild.channels.cache.find(ch => ch.type === ChannelType.GuildText && ch.permissionsFor(member.guild.members.me).has(PermissionsBitField.Flags.SendMessages));
        }

        if (channel) {
            const botPerms = channel.permissionsFor(member.guild.members.me);
            if (botPerms && botPerms.has(PermissionsBitField.Flags.SendMessages) && botPerms.has(PermissionsBitField.Flags.EmbedLinks)) {
                const placeholders = {
                    user: member.user.toString(),
                    guildName: member.guild.name,
                    guildIcon: member.guild.iconURL(),
                    userIcon: member.user.displayAvatarURL(),
                    newLevel: newLevel,
                    randomLevelMessage: getRandomLevelMessage({
                        user: member.user.toString(),
                        newLevel: newLevel
                    })
                };

                const embed = new EmbedBuilder()
                    .setColor('#34eb6b')
                    .setTitle("🎉 Tăng Cấp!!!")
                    .setDescription(`${placeholders.user} bây giờ là cấp **${placeholders.newLevel}**!\n\n_${placeholders.randomLevelMessage}_`)
                    .setThumbnail(placeholders.userIcon)
                    .setFooter({ text: `Level Up • ${placeholders.guildName}`, iconURL: placeholders.guildIcon });

                await channel.send({ embeds: [embed] }).catch(() => { });
            }
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
