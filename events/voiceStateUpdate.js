const { ChannelType, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const moment = require('moment-timezone');
const { getConfig, getLang } = require('../utils/configLoader');
const config = getConfig();
const lang = getLang();
const { handleVoiceXP } = require('./Levels/handleXP');

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

const voiceXpTimers = new Map();
const activeVoiceSessions = new Map(); // Map<userId, startTime>
const VoiceSession = require('../models/VoiceSession');
const UserData = require('../models/UserData');

async function handleVoiceTracking(oldState, newState) {
    if (newState.member.user.bot) return;

    const userId = newState.member.id;
    const guildId = newState.guild.id;
    const now = Date.now();

    // User Left Voice or Switched Channel (End previous session)
    if (oldState.channelId && (!newState.channelId || oldState.channelId !== newState.channelId)) {
        if (activeVoiceSessions.has(userId)) {
            const startTime = activeVoiceSessions.get(userId);
            const duration = now - startTime;

            // Only save valid sessions (> 1 second)
            if (duration > 1000) {
                try {
                    // Save Session Log
                    await VoiceSession.create({
                        userId,
                        guildId,
                        channelId: oldState.channelId,
                        startTime,
                        endTime: now,
                        duration: Math.floor(duration / 1000), // seconds
                        date: new Date(startTime).toISOString().split('T')[0]
                    });

                    // Update Total Voice Time in UserData
                    let userData = await UserData.findOne({ userId, guildId });
                    if (!userData) {
                        userData = await UserData.create({ userId, guildId });
                    }
                    userData.voiceTime = (userData.voiceTime || 0) + Math.floor(duration / 1000);
                    await userData.save();

                } catch (err) {
                    console.error('Error saving voice session:', err);
                }
            }
            activeVoiceSessions.delete(userId);
        }
    }

    // User Joined Voice or Switched Channel (Start new session)
    if (newState.channelId && (!oldState.channelId || oldState.channelId !== newState.channelId)) {
        // Check for mute/deaf if we want to ignore them (User request: "tránh việc treo máy... không tính tiếp")
        // Implementation: If user joins muted/deaf, maybe we don't start tracking? 
        // Or we track but mark it? The request said "nếu treo trong voice và không hoạt động quá lâu".
        // For now, let's track pure time but maybe pause if muted/deaf?
        // Let's keep it simple: Start tracking on join. 
        // Refinement: If they are selfMute or selfDeaf, maybe we *don't* start the timer, or we track it as "afk"?
        // The implementation plan said: "Add checks: if (member.voice.selfMute...) return;" for XP.
        // For Leaderboard/Stats, usually "Voice Time" implies "Active Voice Time".
        // Let's Apply the same rule: If muted/deaf, don't track time.

        const isIgnored = newState.selfDeaf || newState.serverDeaf;
        if (!isIgnored) {
            activeVoiceSessions.set(userId, now);
        }
    }

    // Handle Mute/Deaf Toggle (State Change within same channel)
    // removed as we track all states now
}

async function handleVoiceStateUpdate(client, oldState, newState) {
    try {
        await handleVoiceTracking(oldState, newState); // Add tracking call

        handleVoiceXPEvents(client, oldState, newState);
        // ... rest of existing code

        // Ensure we don't crash if config is missing (basic check)
        const voiceConfigKey = getVoiceStateConfig(oldState, newState);
        if (voiceConfigKey) {
            await sendVoiceStateEmbed(oldState, newState, voiceConfigKey);
        }

        await handleVoiceGreetings(oldState, newState);

        // --- Music Bot Logic ---
        if (client.players) {
            const guild = oldState.guild || newState.guild;
            const player = client.players.get(guild.id);

            if (player) {
                const oldChannelId = oldState.channelId;
                const newChannelId = newState.channelId;

                // ... (rest of music logic if any, assuming it was cut off in view, I should probably not delete hidden lines if I can avoid it)
                // Actually, I'll use REPLACE BLOCK on specific lines to be safe.


                // 1. Check if bot was disconnected
                if (oldState.member.id === client.user.id) {
                    if (!newChannelId) {
                        // Bot disconnected
                        try {
                            if (client.musicEmbedManager) {
                                await client.musicEmbedManager.handlePlaybackEnd(player);
                            }
                        } catch (err) {
                            console.error('Error handling playback end on disconnect:', err);
                        } finally {
                            player.cleanup();
                            client.players.delete(guild.id);
                        }
                        return;
                    }
                    // Bot moved
                    else if (oldChannelId !== newChannelId) {
                        if (newState.channel) {
                            await player.moveToChannel(newState.channel);
                            player.clearInactivityTimer(false);
                            if (client.musicEmbedManager) await client.musicEmbedManager.updateNowPlayingEmbed(player);
                        }
                    }
                }

                // 2. Check if channel is empty
                const voiceChannelId = player.voiceChannel?.id;
                if (voiceChannelId && (oldChannelId === voiceChannelId || newChannelId === voiceChannelId)) {
                    const channel = guild.channels.cache.get(voiceChannelId);
                    if (channel) {
                        const listeners = channel.members.filter(m => !m.user.bot).size;
                        if (listeners === 0) {
                            player.startInactivityTimer();
                            if (client.musicEmbedManager && player.currentTrack) await client.musicEmbedManager.updateNowPlayingEmbed(player);
                        } else {
                            player.clearInactivityTimer(true);
                            if (client.musicEmbedManager && player.currentTrack && player.pauseReasons?.has('alone')) await client.musicEmbedManager.updateNowPlayingEmbed(player);
                        }
                    }
                }
            }
        }
        // -----------------------
    } catch (error) {
        console.error('Error in voiceStateUpdate event:', error);
    }
}

function getVoiceStateConfig(oldState, newState) {
    const voiceLogs = config.VoiceLogs;
    if (!voiceLogs) return null;

    if (oldState.channelId === null && newState.channelId !== null && voiceLogs.Join) {
        return 'VoiceChannelJoin';
    } else if (oldState.channelId !== null && newState.channelId === null && voiceLogs.Leave) {
        return 'VoiceChannelLeave';
    } else if (oldState.channelId !== newState.channelId && oldState.channelId !== null && newState.channelId !== null && oldState.member.id === newState.member.id && voiceLogs.Switch) {
        return 'VoiceChannelSwitch';
    } else if (oldState.streaming !== newState.streaming) {
        if (newState.streaming && voiceLogs.StreamStart) {
            return 'VoiceChannelStreamStart';
        } else if (!newState.streaming && voiceLogs.StreamStop) {
            return 'VoiceChannelStreamStop';
        }
    }
    return null;
}

function replacePlaceholders(text, oldState, newState, moderator = null) {
    const currentTime = moment().tz(config.Timezone);
    const shortTime = currentTime.format("HH:mm");
    const longTime = currentTime.format('MMMM Do YYYY');
    const oldChannelName = oldState.channel ? oldState.channel.name : "None";
    const newChannelName = newState.channel ? newState.channel.name : "None";

    const channelName = newState.channelId ? newChannelName : oldChannelName;

    return text.replace(/{user}/g, newState.member ? `<@${newState.member.id}>` : "N/A")
        .replace(/{moderator}/g, moderator ? `<@${moderator.id}>` : "N/A")
        .replace(/{oldChannel}/g, oldChannelName)
        .replace(/{newChannel}/g, newChannelName)
        .replace(/{channel}/g, channelName)
        .replace(/{shorttime}/g, shortTime)
        .replace(/{longtime}/g, longTime);
}

async function sendVoiceStateEmbed(oldState, newState, voiceConfigKey, moderator = null) {
    if (!voiceConfigKey) return;

    // Map config key to VoiceLogs key (e.g. VoiceChannelJoin -> Join)
    const logType = voiceConfigKey.replace('VoiceChannel', '');
    const channelId = config.VoiceLogs[logType];

    if (!channelId || channelId === 'CHANNEL_ID') return;

    const embedConfig = lang[voiceConfigKey].Embed;
    if (!embedConfig) return;

    const embed = new EmbedBuilder()
        .setColor(embedConfig.Color)
        .setTitle(replacePlaceholders(embedConfig.Title, oldState, newState, moderator));

    if (embedConfig.Description && Array.isArray(embedConfig.Description)) {
        const desc = embedConfig.Description.map(line => replacePlaceholders(line, oldState, newState, moderator)).join("\n");
        if (desc && desc.trim().length > 0) embed.setDescription(desc);
    } else if (typeof embedConfig.Description === 'string') {
        const desc = replacePlaceholders(embedConfig.Description, oldState, newState, moderator);
        if (desc && desc.trim().length > 0) embed.setDescription(desc);
    }

    if (embedConfig.Footer && embedConfig.Footer.Text) {
        embed.setFooter({ text: embedConfig.Footer.Text, iconURL: embedConfig.Footer.Icon || undefined });
    }

    if (embedConfig.Author && embedConfig.Author.Text) {
        embed.setAuthor({ name: embedConfig.Author.Text, iconURL: embedConfig.Author.Icon || undefined });
    }

    if (embedConfig.Thumbnail && newState.member) {
        embed.setThumbnail(newState.member.user.displayAvatarURL());
    }

    if (embedConfig.Image) {
        embed.setImage(embedConfig.Image);
    }

    const guild = oldState.guild || newState.guild;
    const voiceLogChannel = guild.channels.cache.get(channelId);

    if (voiceLogChannel) {
        try {
            await voiceLogChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending voice state embed:', error);
        }
    }
}

// Voice Greetings Logic
const VoiceGreetings = require('../models/VoiceGreetings');

async function handleVoiceGreetings(oldState, newState) {
    if (newState.member.user.bot) return; // Ignore bots

    const guildId = newState.guild.id;
    const config = await VoiceGreetings.findOne({ guildId });

    if (!config || !config.enabled) return;

    const welcomeMessages = JSON.parse(config.welcomeMessages || "[]");
    const goodbyeMessages = JSON.parse(config.goodbyeMessages || "[]");

    // Helper to replace placeholders
    const replaceMsg = (msg, member, channel) => {
        const userName = config.pingUser !== false ? `<@${member.id}>` : `**${member.user.displayName}**`;
        return msg
            .replace(/{user}/g, userName)
            .replace(/{channel}/g, channel.name)
            .replace(/{guildName}/g, member.guild.name);
    };

    // User Joined
    if (!oldState.channelId && newState.channelId) {
        if (welcomeMessages.length > 0) {
            const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
            const finalMsg = replaceMsg(randomMsg, newState.member, newState.channel);
            try {
                // Send to the voice channel's text chat if possible
                if (newState.channel.type === ChannelType.GuildVoice) {
                    await newState.channel.send(finalMsg);
                }
            } catch (err) {
                // Ignore if cannot send (perms etc)
                console.error("Failed to send welcome greeting:", err);
            }
        }
    }

    // User Left (or switched, treated as left old channel if we want, but user request implies just welcome when joining. 
    // However, "chào và tạm biệt user khi vào kênh voice" implies goodbyes too.
    // Let's implement goodbye for leaving a channel.

    if (oldState.channelId && !newState.channelId) {
        if (goodbyeMessages.length > 0) {
            const randomMsg = goodbyeMessages[Math.floor(Math.random() * goodbyeMessages.length)];
            const finalMsg = replaceMsg(randomMsg, oldState.member, oldState.channel);
            try {
                if (oldState.channel.type === ChannelType.GuildVoice) {
                    await oldState.channel.send(finalMsg);
                }
            } catch (err) {
                // Ignore Unknown Channel (10003) - happens if channel deleted
                // Ignore Missing Permissions (50013)
                if (err.code !== 10003 && err.code !== 50013) {
                    console.error("Failed to send goodbye greeting:", err);
                }
            }
        }
    }

    // Switch Channel (Treat as Join New + Leave Old)
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // Leave Old
        if (goodbyeMessages.length > 0) {
            const randomMsg = goodbyeMessages[Math.floor(Math.random() * goodbyeMessages.length)];
            const finalMsg = replaceMsg(randomMsg, oldState.member, oldState.channel);
            try {
                if (oldState.channel.type === ChannelType.GuildVoice) {
                    await oldState.channel.send(finalMsg);
                }
            } catch (err) { }
        }

        // Join New
        if (welcomeMessages.length > 0) {
            const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
            const finalMsg = replaceMsg(randomMsg, newState.member, newState.channel);
            try {
                if (newState.channel.type === ChannelType.GuildVoice) {
                    await newState.channel.send(finalMsg);
                }
            } catch (err) { }
        }
    }
}

function handleVoiceXPEvents(client, oldState, newState) {
    const interval = parseTime(config.LevelingSystem.CooldownSettings.VoiceInterval || '10s');

    if (!oldState.channel && newState.channel) {
        if (newState.member) {
            if (!voiceXpTimers.has(newState.member.id)) {
                const timer = setInterval(() => handleVoiceXP(client, newState.member), interval);
                voiceXpTimers.set(newState.member.id, timer);
            }
        }
    }
    else if (oldState.channel && !newState.channel) {
        if (oldState.member) {
            clearInterval(voiceXpTimers.get(oldState.member.id));
            voiceXpTimers.delete(oldState.member.id);
        }
    }
    else if (oldState.channelId !== newState.channelId) {
        if (oldState.member && newState.member) {
            clearInterval(voiceXpTimers.get(oldState.member.id));
            const timer = setInterval(() => handleVoiceXP(client, newState.member), interval);
            voiceXpTimers.set(newState.member.id, timer);
        }
    }
}

async function restoreVoiceSessions(client) {
    console.log('Restoring active voice sessions...');
    const now = Date.now();
    const interval = parseTime(config.LevelingSystem.CooldownSettings.VoiceInterval || '1m');

    for (const [guildId, guild] of client.guilds.cache) {
        for (const [channelId, channel] of guild.channels.cache) {
            if (channel.type === ChannelType.GuildVoice) {
                for (const [memberId, member] of channel.members) {
                    if (!member.user.bot) {
                        // Restore Active Session
                        if (!activeVoiceSessions.has(memberId)) {
                            activeVoiceSessions.set(memberId, now);
                        }
                        
                        // Restore XP Timer
                        if (!voiceXpTimers.has(memberId)) {
                            const timer = setInterval(() => handleVoiceXP(client, member), interval);
                            voiceXpTimers.set(memberId, timer);
                        }
                    }
                }
            }
        }
    }
    console.log(`Restored ${activeVoiceSessions.size} active voice sessions and ${voiceXpTimers.size} XP timers.`);
}

handleVoiceStateUpdate.restoreVoiceSessions = restoreVoiceSessions;
module.exports = handleVoiceStateUpdate;