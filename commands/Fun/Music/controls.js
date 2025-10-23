const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useMainPlayer, QueueRepeatMode } = require('discord-player');
const { Logger } = require('../../../utils/logger');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getMusicManager } = require('../../../utils/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Control the music player')
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Skip the current track')
                .addIntegerOption(option =>
                    option
                        .setName('to')
                        .setDescription('Skip to a specific track in the queue')
                        .setMinValue(1)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop playback and clear the queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pause')
                .setDescription('Pause the current track'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resume')
                .setDescription('Resume the current track'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('volume')
                .setDescription('Change the player volume')
                .addIntegerOption(option =>
                    option
                        .setName('level')
                        .setDescription('Volume level (0-100)')
                        .setMinValue(0)
                        .setMaxValue(100)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('loop')
                .setDescription('Set loop mode')
                .addStringOption(option =>
                    option
                        .setName('mode')
                        .setDescription('Loop mode')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Off', value: 'off' },
                            { name: 'Track', value: 'track' },
                            { name: 'Queue', value: 'queue' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shuffle')
                .setDescription('Shuffle the queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nowplaying')
                .setDescription('Show information about the current track'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('queue')
                .setDescription('Show the current queue')
                .addIntegerOption(option => 
                    option
                        .setName('page')
                        .setDescription('Page number to view')
                        .setMinValue(1)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('restart')
                .setDescription('Restart the music system without stopping the bot')),
    
    async execute(interaction) {
        try {
            if (!global.config.Music.Enabled) {
                return interaction.reply({
                    content: '❌ The music system is currently disabled.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (global.config.GuildID && interaction.guild.id !== global.config.GuildID) {
                return interaction.reply({
                    content: '❌ This bot is configured for a specific server only.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const player = useMainPlayer();
            if (!player) {
                return interaction.reply({
                    content: '❌ Music player is not initialized.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const queue = player.nodes.get(interaction.guild);
            
            const subcommand = interaction.options.getSubcommand();
            
            if (!queue && subcommand === 'nowplaying') {
                return handleEmptyNowPlaying(interaction);
            }

            if (!queue) {
                return interaction.reply({
                    content: '❌ There is no active music session.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const memberVC = interaction.member.voice.channel;
            if (!memberVC) {
                return interaction.reply({
                    content: '❌ You must be in a voice channel to use music controls.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const botVC = interaction.guild.members.me.voice.channel;
            if (botVC && memberVC.id !== botVC.id) {
                return interaction.reply({
                    content: '❌ You must be in the same voice channel as the bot to use music controls.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (global.config.Music.RequiredControlRoles &&
                global.config.Music.RequiredControlRoles.length > 0) {
                
                const hasRole = interaction.member.roles.cache.some(
                    role => global.config.Music.RequiredControlRoles.includes(role.id)
                );
                
                if (!hasRole) {
                    return interaction.reply({
                        content: '❌ You do not have the required role to use music controls.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            switch (subcommand) {
                case 'skip':
                    return handleSkip(interaction, queue);
                case 'stop':
                    return handleStop(interaction, queue);
                case 'pause':
                    return handlePause(interaction, queue);
                case 'resume':
                    return handleResume(interaction, queue);
                case 'volume':
                    return handleVolume(interaction, queue);
                case 'loop':
                    return handleLoop(interaction, queue);
                case 'shuffle':
                    return handleShuffle(interaction, queue);
                case 'nowplaying':
                    return handleNowPlaying(interaction, queue);
                case 'queue':
                    return handleQueue(interaction, queue);
                case 'restart':
                    return handleRestart(interaction);
                default:
                    return interaction.reply({
                        content: '❌ Unknown subcommand.',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            Logger.error('Error in music controls command:', error);
            return interaction.reply({
                content: `❌ Error: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
};

async function handleSkip(interaction, queue) {
    if (!queue.isPlaying()) {
        return interaction.reply({
            content: '❌ Nothing is currently playing.',
            flags: MessageFlags.Ephemeral
        });
    }
    
    const skipToIndex = interaction.options.getInteger('to');
    
    if (skipToIndex) {
        const tracks = queue.tracks.toArray();
        
        if (skipToIndex > tracks.length) {
            return interaction.reply({
                content: `❌ There are only ${tracks.length} tracks in the queue.`,
                flags: MessageFlags.Ephemeral
            });
        }
        
        const trackTitle = tracks[skipToIndex - 1].title;
        
        try {
            await queue.node.jump(skipToIndex - 1);
            
            const reply = await interaction.reply({
                content: `⏭️ Skipped to track #${skipToIndex}: **${trackTitle}**`,
                flags: MessageFlags.Ephemeral,
                withResponse: true
            });
            
            autoDeleteReply(reply);
            
            return reply;
        } catch (error) {
            Logger.error('Error skipping to track:', error);
            return interaction.reply({
                content: `❌ Failed to skip to track: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    } else {
        const currentTrack = queue.currentTrack;
        
        try {
            await queue.node.skip();
            
            const reply = await interaction.reply({
                content: `⏭️ Skipped **${currentTrack.title}**`,
                flags: MessageFlags.Ephemeral,
                withResponse: true
            });
            
            autoDeleteReply(reply);
            
            return reply;
        } catch (error) {
            Logger.error('Error skipping track:', error);
            return interaction.reply({
                content: `❌ Failed to skip track: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

async function handleStop(interaction, queue) {
    try {
        const { getMusicManager } = require('../../../utils/musicManager');
        const musicManager = getMusicManager();
        
        if (!musicManager) {
            Logger.error('Could not get music manager for stop command');
        } else {
            const channel = interaction.channel;
            
            if (queue.metadata?.nowPlayingMessages?.length > 0 && channel) {
                try {
                    const messageId = queue.metadata.nowPlayingMessages[queue.metadata.nowPlayingMessages.length - 1];
                    const message = await channel.messages.fetch(messageId).catch(() => null);
                    
                    if (message) {
                        Logger.debug('Updating Now Playing canvas before stopping queue');
                        
                        const emptyCanvas = await musicManager.createEmptyNowPlayingCanvas();
                        
                        const tempDir = path.join(__dirname, 'temp');
                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir, { recursive: true });
                        }
                        const tempFile = path.join(tempDir, `np_empty_${Date.now()}.png`);
                        fs.writeFileSync(tempFile, emptyCanvas.toBuffer());
                        
                        const emptyEmbed = new EmbedBuilder()
                            .setColor(parseInt((global.config.Music.EmbedColor || '#FF69B4').replace('#', ''), 16))
                            .setImage(`attachment://np_empty_${path.basename(tempFile)}`)
                            .addFields(
                                { name: 'Status', value: 'Playback stopped', inline: true },
                                { name: 'Next steps', value: 'Use /play to add music', inline: true }
                            )
                            .setFooter({ text: 'Music Player | Waiting for your next track' });
                        
                        const emptyRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('music_play')
                                .setEmoji('▶️')
                                .setLabel('Add Music')
                                .setStyle(ButtonStyle.Success)
                        );
                        
                        await message.edit({
                            content: '🎵 **Nothing currently playing**',
                            embeds: [emptyEmbed],
                            components: [emptyRow],
                            files: [{
                                attachment: tempFile,
                                name: path.basename(tempFile)
                            }]
                        });
                        
                        try {
                            fs.unlinkSync(tempFile);
                            Logger.debug(`Deleted temp file: ${tempFile}`);
                        } catch (unlinkError) {
                            Logger.debug(`Failed to delete temp file immediately: ${unlinkError.message}`);
                            
                            setTimeout(() => {
                                try {
                                    if (fs.existsSync(tempFile)) {
                                        fs.unlinkSync(tempFile);
                                        Logger.debug(`Deleted temp file (delayed): ${tempFile}`);
                                    }
                                } catch (error) {
                                    Logger.debug(`Failed to delete temp file in delayed attempt: ${error.message}`);
                                }
                            }, 5000);
                        }
                    }
                } catch (error) {
                    Logger.debug(`Could not update Now Playing message before stopping: ${error}`);
                }
            }
        }
        
        queue.delete();
        
        return interaction.reply({
            content: '⏹️ Stopped playback and cleared the queue.',
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Error stopping playback:', error);
        return interaction.reply({
            content: `❌ Failed to stop playback: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handlePause(interaction, queue) {
    if (queue.node.isPaused()) {
        return interaction.reply({
            content: '❌ Playback is already paused.',
            flags: MessageFlags.Ephemeral
        });
    }
    
    try {
        queue.node.pause();
        
        return interaction.reply({
            content: '⏸️ Paused playback.',
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Error pausing playback:', error);
        return interaction.reply({
            content: `❌ Failed to pause playback: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleResume(interaction, queue) {
    if (!queue.node.isPaused()) {
        return interaction.reply({
            content: '❌ Playback is already playing.',
            flags: MessageFlags.Ephemeral
        });
    }
    
    try {
        queue.node.resume();
        
        return interaction.reply({
            content: '▶️ Resumed playback.',
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Error resuming playback:', error);
        return interaction.reply({
            content: `❌ Failed to resume playback: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleVolume(interaction, queue) {
    const volume = interaction.options.getInteger('level');
    
    try {
        queue.node.setVolume(volume);
        
        const reply = await interaction.reply({
            content: `🔊 Volume set to ${volume}%.`,
            flags: MessageFlags.Ephemeral,
            withResponse: true
        });
        
        autoDeleteReply(reply);
        
        return reply;
    } catch (error) {
        Logger.error('Error setting volume:', error);
        return interaction.reply({
            content: `❌ Failed to set volume: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleLoop(interaction, queue) {
    const mode = interaction.options.getString('mode');

    let repeatMode;
    switch (mode) {
        case 'off':
            repeatMode = QueueRepeatMode.OFF;
            break;
        case 'track':
            repeatMode = QueueRepeatMode.TRACK;
            break;
        case 'queue':
            repeatMode = QueueRepeatMode.QUEUE;
            break;
        default:
            repeatMode = QueueRepeatMode.OFF;
    }
    
    try {
        queue.setRepeatMode(repeatMode);
        
        const modeText = {
            [QueueRepeatMode.OFF]: 'disabled',
            [QueueRepeatMode.TRACK]: 'set to repeat current track',
            [QueueRepeatMode.QUEUE]: 'set to repeat entire queue'
        }[repeatMode];
        
        return interaction.reply({
            content: `🔄 Loop mode ${modeText}.`,
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Error setting loop mode:', error);
        return interaction.reply({
            content: `❌ Failed to set loop mode: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleShuffle(interaction, queue) {
    if (queue.tracks.size === 0) {
        return interaction.reply({
            content: '❌ There are no tracks in the queue to shuffle.',
            flags: MessageFlags.Ephemeral
        });
    }
    
    try {
        queue.tracks.shuffle();
        
        return interaction.reply({
            content: '🔀 Shuffled the queue.',
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Error shuffling queue:', error);
        return interaction.reply({
            content: `❌ Failed to shuffle queue: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleNowPlaying(interaction, queue) {
    try {
        if (!queue.isPlaying()) {
            return interaction.reply({
                content: '❌ Nothing is currently playing.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const currentTrack = queue.currentTrack;
        if (!currentTrack) {
            return interaction.reply({
                content: '❌ Could not get current track information.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        Logger.debug(`Now Playing - Current Track Data:
${JSON.stringify(currentTrack, null, 2)}`);
        Logger.debug(`Now Playing - Queue Data:
${JSON.stringify({
            guildId: queue.guild.id,
            channelId: queue.metadata?.channel?.id,
            isPlaying: queue.isPlaying(),
            isPaused: queue.node.isPaused(),
            volume: queue.node.volume,
            repeatMode: queue.repeatMode,
            tracksCount: queue.tracks.size
        }, null, 2)}`);
        
        if (!global.musicData) {
            global.musicData = {};
        }
        
        if (!global.musicData.nowPlayingMessages) {
            global.musicData.nowPlayingMessages = {};
        }
        
        const guildId = interaction.guild.id;
        if (!global.musicData.nowPlayingMessages[guildId]) {
            global.musicData.nowPlayingMessages[guildId] = [];
        }
        
        try {
            const musicManager = getMusicManager();
            Logger.debug(`Music Manager available: ${!!musicManager}`);
            
            if (musicManager) {
                Logger.debug(`Music Manager methods: ${Object.getOwnPropertyNames(musicManager)}`);
                Logger.debug(`handleNowPlayingMessage exists: ${typeof musicManager.handleNowPlayingMessage === 'function'}`);
                Logger.debug(`Queue metadata: ${queue.metadata ? 'exists' : 'missing'}`);
                
                const result = await musicManager.handleNowPlayingMessage(queue, currentTrack);
                Logger.debug(`Result from handleNowPlayingMessage: ${result}`);
                
                if (result) {
                    const infoReply = await interaction.editReply({
                        content: `✅ Updated the now playing display.`,
                        flags: MessageFlags.Ephemeral
                    });
                    
                    if (global.config.Music.AutoDeleteCommands) {
                        const deleteDelay = global.config.Music.CommandDeleteDelay || 5000;
                        setTimeout(() => {
                            if (infoReply.deletable) {
                                infoReply.delete().catch(err => {
                                    Logger.debug(`Failed to auto-delete command response: ${err}`);
                                });
                            }
                        }, deleteDelay);
                    }
                    
                    setTimeout(() => {
                        try {
                            fs.unlinkSync(tempFile);
                        } catch (error) {
                        }
                    }, 5000);
                    
                    return;
                }
                
                Logger.debug(`ERROR: handleNowPlayingMessage returned false or null`);
            }
            
            Logger.debug('Fallback: Using local handleNowPlaying implementation');
            
            const canvas = await createNowPlayingCanvas(queue, currentTrack);
            
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFile = path.join(tempDir, `np_${Date.now()}.png`);
            fs.writeFileSync(tempFile, canvas.toBuffer());
            
            let sourceIcon = '🎵';
            if (currentTrack?.url?.includes('youtube')) sourceIcon = '🔴';
            else if (currentTrack?.url?.includes('spotify')) sourceIcon = '🟢';
            else if (currentTrack?.url?.includes('soundcloud')) sourceIcon = '🟠';

            let requestedBy = 'Unknown';
            if (currentTrack.requestedBy) {
                requestedBy = `<@${currentTrack.requestedBy.id || currentTrack.requestedBy}>`;
            }
            
            const embed = new EmbedBuilder()
                .setColor(parseInt((global.config.Music.EmbedColor || '#FF69B4').replace('#', ''), 16))
                .setImage(`attachment://np_${path.basename(tempFile)}`)
                .addFields(
                    { name: 'Volume', value: `${queue.node.volume}%`, inline: true },
                    { name: 'Queue Length', value: `${queue.tracks.size + 1} tracks`, inline: true },
                    { name: 'Requested By', value: requestedBy, inline: true }
                );
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('music_prev')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_playpause')
                    .setEmoji(queue.node.isPaused() ? '▶️' : '⏸️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setEmoji('🔀')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_volume')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary)
            );
            
            const message = await interaction.channel.send({
                content: `${sourceIcon} **Now Playing:** [${currentTrack.title}](${currentTrack.url})`,
                embeds: [embed],
                components: [row],
                files: [{
                    attachment: tempFile,
                    name: path.basename(tempFile)
                }]
            });
            
            global.musicData.nowPlayingMessages[guildId].push(message.id);
            
            if (!queue.metadata) {
                queue.metadata = {};
            }
            
            if (queue.metadata.nowPlayingInterval) {
                clearInterval(queue.metadata.nowPlayingInterval);
                queue.metadata.nowPlayingInterval = null;
            }
            
            queue.metadata.nowPlayingInterval = setInterval(async () => {
                try {
                    if (!queue.isPlaying() || !message || message.deleted) {
                        clearInterval(queue.metadata.nowPlayingInterval);
                        queue.metadata.nowPlayingInterval = null;
                        return;
                    }
                    
                    const updatedCanvas = await createNowPlayingCanvas(queue, queue.currentTrack);
                    
                    const updateTempDir = path.join(__dirname, 'temp');
                    if (!fs.existsSync(updateTempDir)) {
                        fs.mkdirSync(updateTempDir, { recursive: true });
                    }
                    const updateTempFile = path.join(updateTempDir, `np_update_${Date.now()}.png`);
                    fs.writeFileSync(updateTempFile, updatedCanvas.toBuffer());
                    
                    const updatedEmbed = new EmbedBuilder()
                        .setColor(parseInt((global.config.Music.EmbedColor || '#FF69B4').replace('#', ''), 16))
                        .setImage(`attachment://np_update_${path.basename(updateTempFile)}`)
                        .addFields(
                            { name: 'Volume', value: `${queue.node.volume}%`, inline: true },
                            { name: 'Queue Length', value: `${queue.tracks.size + 1} tracks`, inline: true },
                            { name: 'Requested By', value: requestedBy, inline: true }
                        );
                    
                    const updatedRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('music_prev')
                            .setEmoji('⏮️')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('music_playpause')
                            .setEmoji(queue.node.isPaused() ? '▶️' : '⏸️')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('music_skip')
                            .setEmoji('⏭️')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('music_shuffle')
                            .setEmoji('🔀')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('music_volume')
                            .setEmoji('🔊')
                            .setStyle(ButtonStyle.Secondary)
                    );
                    
                    await message.edit({
                        content: `${sourceIcon} **Now Playing:** [${queue.currentTrack.title}](${queue.currentTrack.url})`,
                        embeds: [updatedEmbed],
                        components: [updatedRow],
                        files: [{
                            attachment: updateTempFile,
                            name: path.basename(updateTempFile)
                        }]
                    });
                    
                    try {
                        fs.unlinkSync(updateTempFile);
                        Logger.debug(`Deleted temp file: ${updateTempFile}`);
                    } catch (unlinkError) {
                        Logger.debug(`Failed to delete temp file immediately: ${unlinkError.message}`);
                        
                        setTimeout(() => {
                            try {
                                if (fs.existsSync(updateTempFile)) {
                                    fs.unlinkSync(updateTempFile);
                                    Logger.debug(`Deleted temp file (delayed): ${updateTempFile}`);
                                }
                            } catch (error) {
                                Logger.debug(`Failed to delete temp file in delayed attempt: ${error.message}`);
                            }
                        }, 5000);
                    }
                } catch (error) {
                    Logger.error('Error updating now playing message:', error);
                    clearInterval(queue.metadata.nowPlayingInterval);
                    queue.metadata.nowPlayingInterval = null;
                }
            }, 3000);
            
            const infoReply = await interaction.editReply({
                content: `✅ Updated the now playing display.`,
                flags: MessageFlags.Ephemeral
            });
            
            if (global.config.Music.AutoDeleteCommands) {
                const deleteDelay = global.config.Music.CommandDeleteDelay || 5000;
                setTimeout(() => {
                    if (infoReply.deletable) {
                        infoReply.delete().catch(err => {
                            Logger.debug(`Failed to auto-delete command response: ${err}`);
                        });
                    }
                }, deleteDelay);
            }
            
            setTimeout(() => {
                try {
                    fs.unlinkSync(tempFile);
                } catch (error) {
                }
            }, 5000);
            
            return;
        } catch (error) {
            Logger.error('Error in nowplaying command:', error);
            return interaction.editReply({
                content: '❌ An error occurred while updating the now playing display.',
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        Logger.error('Error in nowplaying command:', error);
        return interaction.editReply({
            content: '❌ An error occurred while handling the nowplaying command.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function createNowPlayingCanvas(queue, track) {
    if (!track) {
        const { getMusicManager } = require('../../../utils/musicManager');
        const musicManager = getMusicManager();
        
        if (musicManager) {
            return await musicManager.createEmptyNowPlayingCanvas();
        }
        return createEmptyNowPlayingCanvas();
    }

    const timestamp = queue.node.getTimestamp();
    let currentPosition = 0;
    let duration = 0;
    let progress = 0;
    
    if (timestamp) {
        currentPosition = timestamp.current.value;
        duration = timestamp.total.value;
        progress = Math.min(currentPosition / duration, 1);
    }

    const canvasWidth = 600;
    const canvasHeight = 120;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(0, 0, canvasWidth, canvasHeight, 25);
    ctx.fill();
    ctx.restore();
    
    const imageRadius = 40;
    const imageX = 60;
    const imageY = canvasHeight / 2;
    const progressRadius = 40;
    const progressThickness = 5;
    const progressX = canvasWidth - 60;
    const progressY = canvasHeight / 2;
    const textX = imageX + imageRadius + 40;
    const textY = canvasHeight / 2 - 10;
    const maxTitleWidth = progressX - progressRadius - textX - 20;
    
    let thumbnail;
    try {
        const currentTrack = queue?.currentTrack || track;
        
        let thumbnailUrl = currentTrack?.thumbnail || 'https://i.imgur.com/AfFp7pu.png';

        if (thumbnailUrl) {
            if (thumbnailUrl.includes('ytimg.com')) {
                const match = thumbnailUrl.match(/\/vi(?:_webp)?\/([^\/]+)\//);
                if (match && match[1]) {
                    const videoId = match[1];
                    thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                }
            }
            
            if (thumbnailUrl.endsWith('.webp')) {
                thumbnailUrl = thumbnailUrl.replace('.webp', '.jpg');
            }
        }

        thumbnail = await loadImage(thumbnailUrl);
    } catch (error) {
        if (track?.url && track.url.includes('youtube.com')) {
            try {
                const videoId = track.url.split('v=')[1]?.split('&')[0];
                if (videoId) {
                    const alternateUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                    thumbnail = await loadImage(alternateUrl);
                } else {
                    thumbnail = await loadImage('https://i.imgur.com/AfFp7pu.png');
                }
            } catch (fallbackError) {
                thumbnail = await loadImage('https://i.imgur.com/AfFp7pu.png');
            }
        } else {
            thumbnail = await loadImage('https://i.imgur.com/AfFp7pu.png');
        }
    }

    ctx.save();
    
    ctx.beginPath();
    ctx.arc(imageX, imageY, imageRadius, 0, Math.PI * 2);
    ctx.clip();
    
    const imgWidth = thumbnail.width;
    const imgHeight = thumbnail.height;
    
    const minDimension = Math.min(imgWidth, imgHeight);
    
    const sourceX = (imgWidth - minDimension) / 2;
    const sourceY = (imgHeight - minDimension) / 2;

    ctx.drawImage(
        thumbnail,
        sourceX, sourceY, minDimension, minDimension,
        imageX - imageRadius, imageY - imageRadius, 
        imageRadius * 2, imageRadius * 2
    );
    
    ctx.restore();
    
    ctx.fillStyle = '#FF69B4';
    ctx.font = 'bold 18px Arial';
    
    let displayTitle = track?.title || 'Unknown Track';
    let titleWidth = ctx.measureText(displayTitle).width;
    
    if (titleWidth > maxTitleWidth) {
        let ellipsis = '...';
        let truncated = '';
        for (let i = 0; i < displayTitle.length; i++) {
            let testText = displayTitle.substring(0, i) + ellipsis;
            if (ctx.measureText(testText).width > maxTitleWidth) {
                break;
            }
            truncated = testText;
        }
        displayTitle = truncated;
    }

    ctx.fillText(displayTitle, textX, textY);
    
    ctx.fillStyle = '#FFB6C1'; 
    ctx.font = 'bold 14px Arial';
    ctx.fillText(track?.author || 'Unknown Artist', textX, textY + 25);
    
    ctx.beginPath();
    ctx.arc(progressX, progressY, progressRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = progressThickness;
    ctx.stroke();
    
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * progress);

    const gradient = ctx.createLinearGradient(
        progressX - progressRadius, 
        progressY - progressRadius, 
        progressX + progressRadius, 
        progressY + progressRadius
    );
    gradient.addColorStop(0, '#FF1493');
    gradient.addColorStop(1, '#FF69B4');
    
    ctx.beginPath();
    ctx.arc(progressX, progressY, progressRadius, startAngle, endAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = progressThickness;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const percentText = Math.floor(progress * 100) + '%';
    ctx.fillText(percentText, progressX, progressY);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    
    return canvas;
}

async function createEmptyNowPlayingCanvas() {
    const { getMusicManager } = require('../../../utils/musicManager');
    const musicManager = getMusicManager();
    
    if (musicManager) {
        return musicManager.createEmptyNowPlayingCanvas();
    }

    const canvasWidth = 600;
    const canvasHeight = 150;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, 'rgba(25, 25, 35, 0.85)');
    gradient.addColorStop(1, 'rgba(35, 35, 45, 0.85)');
    
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, canvasWidth, canvasHeight, 20);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 105, 180, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(2, 2, canvasWidth-4, canvasHeight-4, 18);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const centerY = canvasHeight / 2;
    const startX = 150;
    const endX = canvasWidth - 40;
    const segmentWidth = (endX - startX) / 20;
    
    ctx.moveTo(startX, centerY);
    for (let i = 0; i < 20; i++) {
        const x = startX + i * segmentWidth;
        const height = i % 2 === 0 ? 5 : 3;
        ctx.lineTo(x, centerY - height);
        ctx.lineTo(x + segmentWidth/2, centerY);
        ctx.lineTo(x + segmentWidth, centerY - height);
    }
    ctx.lineTo(endX, centerY);
    ctx.stroke();
    ctx.restore();

    const musicX = 75;
    const musicY = canvasHeight / 2;

    const circleRadius = 45;
    ctx.save();
    const iconGradient = ctx.createRadialGradient(
        musicX, musicY, 0,
        musicX, musicY, circleRadius
    );
    iconGradient.addColorStop(0, 'rgba(255, 105, 180, 0.15)');
    iconGradient.addColorStop(1, 'rgba(255, 105, 180, 0.05)');
    
    ctx.fillStyle = iconGradient;
    ctx.beginPath();
    ctx.arc(musicX, musicY, circleRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(musicX, musicY, circleRadius - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('♪', musicX - 5, musicY - 5);
    ctx.restore();

    const textX = musicX + circleRadius + 40;
    const mainTextY = centerY - 15;

    const textGradient = ctx.createLinearGradient(textX, mainTextY - 20, textX + 300, mainTextY + 20);
    textGradient.addColorStop(0, '#FF69B4');
    textGradient.addColorStop(1, '#FFB6C1');

    ctx.save();
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText('Nothing Playing', textX + 1, mainTextY + 1);

    ctx.fillStyle = textGradient;
    ctx.fillText('Nothing Playing', textX, mainTextY);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Arial';
    ctx.fillText('Use /play to start your musical journey', textX, mainTextY + 30);
    ctx.restore();
    
    return canvas;
}

async function handleQueue(interaction, queue) {
    try {
        if (!queue.isPlaying()) {
            return interaction.reply({
                content: '❌ Nothing is currently playing.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const tracks = queue.tracks.toArray();

        const pageInput = interaction.options.getInteger('page') || 1;
        const tracksPerPage = 10;
        const totalPages = Math.ceil(tracks.length / tracksPerPage) || 1;
        const page = Math.min(Math.max(pageInput, 1), totalPages);

        const startIndex = (page - 1) * tracksPerPage;
        const endIndex = Math.min(startIndex + tracksPerPage, tracks.length);

        let description = '';
        if (tracks.length === 0) {
            description = 'No upcoming tracks in the queue.';
        } else {
            description = tracks.slice(startIndex, endIndex).map((track, i) => {
                return `**${startIndex + i + 1}.** [${track.title}](${track.url}) - ${track.duration} - Requested by <@${track.requestedBy.id}>`;
            }).join('\n\n');
        }

        const embed = {
            title: '🎵 Queue',
            description: description,
            fields: [
                { name: 'Now Playing', value: `[${queue.currentTrack.title}](${queue.currentTrack.url}) - ${queue.currentTrack.duration}` },
                { name: 'Total Tracks', value: `${tracks.length}`, inline: true },
                { name: 'Page', value: `${page}/${totalPages}`, inline: true }
            ],
            color: parseInt((global.config.Music.EmbedColor || '#FF69B4').replace('#', ''), 16)
        };

        const components = [];
        if (totalPages > 1) {
            const row = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 2,
                        label: '◀️ Previous',
                        custom_id: 'queue_prev',
                        disabled: page === 1
                    },
                    {
                        type: 2,
                        style: 2,
                        label: 'Next ▶️',
                        custom_id: 'queue_next',
                        disabled: page === totalPages
                    }
                ]
            };
            components.push(row);
        }
        
        return interaction.reply({
            embeds: [embed],
            components: components,
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Error displaying queue:', error);
        return interaction.reply({
            content: `❌ Error displaying queue: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

function autoDeleteReply(reply) {
    if (!reply) return;
    
    if (global.config.Music.AutoDeleteCommands) {
        setTimeout(() => {
            if (reply.deletable) {
                reply.delete().catch(err => {
                    Logger.debug(`Failed to auto-delete control command: ${err}`);
                });
            }
        }, global.config.Music.CommandDeleteDelay || 5000);
    }
    
    return reply;
}

if (!global.musicModalHandlerRegistered) {
    global.musicModalHandlerRegistered = true;

    try {
        const client = global.client;
        
        if (!client) {
            Logger.error('Failed to get client instance for music modal handler');
        } else {
            Logger.debug('Setting up music play modal handler...');
            
            client.on('interactionCreate', async (interaction) => {
                try {
                    if (interaction.isButton() && (interaction.customId === 'music_play' || interaction.customId === 'music_play_modal')) {
                        try {
                            const voiceChannel = interaction.member.voice.channel;
                            if (!voiceChannel) {
                                return interaction.reply({
                                    content: '❌ You need to be in a voice channel to play music.',
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            const botVC = interaction.guild.members.me.voice.channel;
                            if (botVC) {
                                if (voiceChannel.id !== botVC.id) {
                                    return interaction.reply({
                                        content: '❌ You must be in the same voice channel as the bot to play music.',
                                        flags: MessageFlags.Ephemeral
                                    });
                                }
                            }

                            const modal = new ModalBuilder()
                                .setCustomId('music_play_search')
                                .setTitle('Play Music');

                            const songInput = new TextInputBuilder()
                                .setCustomId('song_query')
                                .setLabel("Enter a song name or URL")
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Never Gonna Give You Up')
                                .setRequired(true);

                            const firstActionRow = new ActionRowBuilder().addComponents(songInput);
                            modal.addComponents(firstActionRow);

                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.showModal(modal);
                                Logger.debug('Successfully showed music play modal');
                            } else {
                                Logger.warn('Interaction already acknowledged, cannot show modal');

                                if (voiceChannel) {
                                    const { getMusicManager } = require('../../../utils/musicManager');
                                    const musicManager = getMusicManager();
                                    
                                    if (musicManager) {
                                        try {
                                            const { joinVoiceChannel } = require('@discordjs/voice');
                                            joinVoiceChannel({
                                                channelId: voiceChannel.id,
                                                guildId: interaction.guild.id,
                                                adapterCreator: interaction.guild.voiceAdapterCreator
                                            });
                                            
                                            await interaction.followUp({
                                                content: '✅ Joined your voice channel. Use the Add Music button again to play music.',
                                                flags: MessageFlags.Ephemeral
                                            });
                                        } catch (joinError) {
                                            Logger.error(`Failed to join voice channel: ${joinError}`);
                                            await interaction.followUp({
                                                content: '❌ Failed to join the voice channel. Please try again.',
                                                flags: MessageFlags.Ephemeral
                                            });
                                        }
                                    }
                                }
                            }
                        } catch (error) {
                            Logger.error(`Error showing music play modal: ${error.stack || error}`);
                            if (!interaction.replied && !interaction.deferred) {
                                try {
                                    await interaction.reply({
                                        content: 'An error occurred while opening the play music dialog.',
                                        flags: MessageFlags.Ephemeral
                                    });
                                } catch (replyError) {
                                    Logger.error(`Failed to reply with error: ${replyError}`);
                                    try {
                                        await interaction.followUp({
                                            content: 'An error occurred while processing your request.',
                                            flags: MessageFlags.Ephemeral
                                        });
                                    } catch (finalError) {
                                        Logger.error(`Final error attempt failed: ${finalError}`);
                                    }
                                }
                            } else {
                                try {
                                    await interaction.followUp({
                                        content: 'An error occurred while processing your request.',
                                        flags: MessageFlags.Ephemeral
                                    });
                                } catch (followUpError) {
                                    Logger.error(`Failed to follow up with error: ${followUpError}`);
                                }
                            }
                        }
                        return; 
                    }

                    if (interaction.isModalSubmit() && interaction.customId === 'music_play_search') {
                        try {
                            const query = interaction.fields.getTextInputValue('song_query');
                            Logger.debug(`Modal submitted with query: ${query}`);

                            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                            const player = useMainPlayer();
                            const { getMusicManager } = require('../../../utils/musicManager');
                            const musicManager = getMusicManager();
                            
                            if (!player || !musicManager) {
                                Logger.error('Music player or manager not initialized');
                                return interaction.editReply('❌ Music system is not initialized.');
                            }

                            const memberVC = interaction.member.voice.channel;
                            if (!memberVC) {
                                Logger.debug('User not in a voice channel');
                                return interaction.editReply('❌ You need to be in a voice channel to play music.');
                            }

                            const botVC = interaction.guild.members.me.voice.channel;
                            if (botVC) {
                                if (memberVC.id !== botVC.id) {
                                    return interaction.editReply('❌ You must be in the same voice channel as the bot to play music.');
                                }
                            }
                            
                            Logger.debug(`Attempting to search for: "${query}" in channel ${memberVC.name}`);

                            let searchResult;
                            try {
                                searchResult = await player.search(query, {
                                    requestedBy: interaction.user,
                                    searchEngine: 'youtube'
                                });
                                
                                if (!searchResult?.tracks?.length) {
                                    Logger.debug('No YouTube results, trying SoundCloud...');
                                    searchResult = await player.search(query, {
                                        requestedBy: interaction.user,
                                        searchEngine: 'soundcloud'
                                    });
                                }

                                if (!searchResult?.tracks?.length) {
                                    Logger.debug('No SoundCloud results, trying generic search...');
                                    searchResult = await player.search(query, {
                                        requestedBy: interaction.user
                                    });
                                }

                                if (!searchResult || !searchResult.tracks.length) {
                                    return interaction.editReply(`❌ No results found for: ${query}!`);
                                }

                                Logger.debug(`Search results: ${searchResult?.tracks?.length || 0} tracks found`);
                                const result = await musicManager.play(memberVC, searchResult, interaction, true, { playTop: false, skipCurrent: false });
                                
                                Logger.debug(`Play result: ${JSON.stringify(result)}`);
                                
                                if (result.success) {
                                    return interaction.editReply(`✅ Song Queued`);
                                } else {
                                    return interaction.editReply(`❌ ${result.message || 'An error occurred while playing the song.'}`);
                                }
                            } catch (error) {
                                Logger.error(`Error searching for tracks: ${error.stack || error}`);
                                return interaction.editReply(`❌ Error searching for tracks: ${error.message}`);
                            }
                        } catch (error) {
                            Logger.error(`Error in modal music play handler: ${error.stack || error}`);
                            try {
                                if (interaction.deferred) {
                                    return interaction.editReply('❌ An error occurred while trying to play music.');
                                } else {
                                    return interaction.reply({
                                        content: '❌ An error occurred while trying to play music.',
                                        flags: MessageFlags.Ephemeral
                                    });
                                }
                            } catch (responseError) {
                                Logger.error(`Failed to respond with error: ${responseError}`);
                            }
                        }
                        return;
                    }
                } catch (error) {
                    Logger.error(`Error handling music modal interaction: ${error.stack || error}`);
                    try {
                        if (interaction.replied || interaction.deferred) {
                            await interaction.editReply('An error occurred while processing your request.');
                        } else {
                            await interaction.reply({
                                content: 'An error occurred while processing your request.',
                                flags: MessageFlags.Ephemeral
                            });
                        }
                    } catch (finalError) {
                        Logger.error(`Failed to send final error message: ${finalError}`);
                    }
                }
            });
            
            Logger.debug('Registered music modal handler');
        }
    } catch (error) {
        Logger.error(`Error setting up music modal handler: ${error.stack || error}`);
    }
}

async function handleRestart(interaction) {
    try {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: '❌ You need administrator permissions to restart the music system.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const { getMusicManager } = require('../../../utils/musicManager');
        const musicManager = getMusicManager();
        
        if (!musicManager) {
            return interaction.editReply('❌ Music manager is not initialized.');
        }

        await musicManager.saveQueues(true);

        const players = musicManager.musicSubscriptions;
        const guildIds = [...players.keys()];
        const playerCount = guildIds.length;
        
        if (playerCount === 0) {
            return interaction.editReply('✅ No active music players found. System ready.');
        }

        for (const guildId of guildIds) {
            const player = players.get(guildId);
            if (player && player.player) {
                player.player.stop();
                if (player.connection) {
                    player.connection.destroy();
                }
                players.delete(guildId);
            }
        }

        await musicManager.restoreQueues();
        
        return interaction.editReply({
            content: `✅ Music system restarted. Destroyed ${playerCount} players and attempted to restore queues.`,
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        Logger.error('Error in restart command:', error);
        return interaction.editReply({
            content: `❌ Error restarting music system: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleEmptyNowPlaying(interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const { getMusicManager } = require('../../../utils/musicManager');
        const musicManager = getMusicManager();

        const emptyCanvas = musicManager 
            ? await musicManager.createEmptyNowPlayingCanvas()
            : await createEmptyNowPlayingCanvas();

        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFile = path.join(tempDir, `np_empty_${Date.now()}.png`);
        fs.writeFileSync(tempFile, emptyCanvas.toBuffer());

        const emptyEmbed = new EmbedBuilder()
            .setColor(parseInt((global.config.Music.EmbedColor || '#FF69B4').replace('#', ''), 16))
            .setImage(`attachment://np_empty_${path.basename(tempFile)}`)
            .addFields(
                { name: 'Status', value: 'No active session', inline: true },
                { name: 'Next steps', value: 'Use /play to start listening', inline: true }
            )
            .setFooter({ text: 'Music Player | Waiting for your next track' });

        const emptyRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('music_play')
                .setEmoji('▶️')
                .setLabel('Add Music')
                .setStyle(ButtonStyle.Success)
        );

        const reply = await interaction.editReply({
            content: '🎵 **Nothing Playing**',
            embeds: [emptyEmbed],
            components: [emptyRow],
            files: [{
                attachment: tempFile,
                name: path.basename(tempFile)
            }]
        });

        try {
            fs.unlinkSync(tempFile);
            Logger.debug(`Deleted temp file: ${tempFile}`);
        } catch (unlinkError) {
            Logger.debug(`Failed to delete temp file immediately: ${unlinkError.message}`);

            setTimeout(() => {
                try {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                        Logger.debug(`Deleted temp file (delayed): ${tempFile}`);
                    }
                } catch (error) {
                    Logger.debug(`Failed to delete temp file in delayed attempt: ${error.message}`);
                }
            }, 5000);
        }

        try {
            if (musicManager && reply.id && interaction.guild && interaction.guild.id) {
                if (!global.musicData) {
                    global.musicData = {};
                }
                
                if (!global.musicData.nowPlayingMessages) {
                    global.musicData.nowPlayingMessages = {};
                }
                
                if (!global.musicData.nowPlayingMessages[interaction.guild.id]) {
                    global.musicData.nowPlayingMessages[interaction.guild.id] = [];
                }

                global.musicData.nowPlayingMessages[interaction.guild.id].push(reply.id);

                await musicManager.saveNowPlayingMessage(
                    interaction.guild.id, 
                    reply.id, 
                    interaction.channel.id
                );
                
                Logger.debug(`Created empty nowplaying message for guild ${interaction.guild.id}`);
            }
        } catch (error) {
            Logger.error(`Error tracking empty nowplaying message: ${error}`);
        }
        
        return reply;
    } catch (error) {
        Logger.error('Error creating empty nowplaying display:', error);
        return interaction.editReply({
            content: `❌ Error creating music display: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
} 