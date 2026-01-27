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

async function handleVoiceStateUpdate(client, oldState, newState) {
    try {
        handleVoiceXPEvents(client, oldState, newState);

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
    if (oldState.channelId === null && newState.channelId !== null && config.VoiceChannelJoin && config.VoiceChannelJoin.Enabled) {
        return 'VoiceChannelJoin';
    } else if (oldState.channelId !== null && newState.channelId === null && config.VoiceChannelLeave && config.VoiceChannelLeave.Enabled) {
        return 'VoiceChannelLeave';
    } else if (oldState.channelId !== newState.channelId && oldState.channelId !== null && newState.channelId !== null && oldState.member.id === newState.member.id && config.VoiceChannelSwitch && config.VoiceChannelSwitch.Enabled) {
        return 'VoiceChannelSwitch';
    } else if (oldState.streaming !== newState.streaming) {
        if (newState.streaming && config.VoiceChannelStreamStart && config.VoiceChannelStreamStart.Enabled) {
            return 'VoiceChannelStreamStart';
        } else if (!newState.streaming && config.VoiceChannelStreamStop && config.VoiceChannelStreamStop.Enabled) {
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

    const voiceConfig = config[voiceConfigKey];
    const embedConfig = lang[voiceConfigKey].Embed;

    const embed = new EmbedBuilder()
        .setColor(embedConfig.Color)
        .setTitle(replacePlaceholders(embedConfig.Title, oldState, newState, moderator))
        .setDescription(embedConfig.Description.map(line => replacePlaceholders(line, oldState, newState, moderator)).join("\n"));

    if (embedConfig.Footer.Text) {
        embed.setFooter({ text: embedConfig.Footer.Text, iconURL: embedConfig.Footer.Icon || undefined });
    }

    if (embedConfig.Author.Text) {
        embed.setAuthor({ name: embedConfig.Author.Text, iconURL: embedConfig.Author.Icon || undefined });
    }

    if (embedConfig.Thumbnail && newState.member) {
        embed.setThumbnail(newState.member.user.displayAvatarURL());
    }

    if (embedConfig.Image) {
        embed.setImage(embedConfig.Image);
    }

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
        return msg
            .replace(/{user}/g, `<@${member.id}>`)
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
                console.error("Failed to send goodbye greeting:", err);
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

module.exports = handleVoiceStateUpdate;