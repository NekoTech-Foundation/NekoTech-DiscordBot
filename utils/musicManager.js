const { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandOptionType, AttachmentBuilder, ActivityType, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, QueueRepeatMode } = require('discord.js');
const { useMainPlayer, useQueue } = require('discord-player');
const { Logger } = require('./logger');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const MusicQueue = require('../models/musicQueue');
const { createCanvas, loadImage } = require('canvas');

let _instance = null;

class MusicManager {
    constructor(client) {
        if (_instance) {
            Logger.warn("MusicManager already initialized - returning existing instance");
            return _instance;
        }

        this.client = client;
        this.config = global.config.Music;
        this.playerMessages = new Map();
        this.updateIntervals = new Map();

        if (!global.musicData) {
            global.musicData = {
                nowPlayingMessages: {}
            };
        } else if (!global.musicData.nowPlayingMessages) {
            global.musicData.nowPlayingMessages = {};
        }

        try {
            mongoose.connection.on('disconnected', () => {
                Logger.debug('MongoDB disconnected - queue saves will be disabled');
                this.mongoDisconnected = true;
            });
            
            mongoose.connection.on('connected', () => {
                Logger.debug('MongoDB connected - queue saves enabled');
                this.mongoDisconnected = false;
            });
            
            mongoose.connection.on('error', (err) => {
                Logger.error(`MongoDB connection error: ${err}`);
                this.mongoDisconnected = true;
            });

            Logger.debug('Queue persistence enabled - existing queue data will be preserved');
        } catch (error) {
            Logger.error(`Error setting up MongoDB event handlers: ${error}`);
        }
        
        this.setupPlayer();
        this.setupQueueSaveRestore();

        this._voiceStateUpdateHandlers = [];
        this._patchedVoiceStateUpdateHandlers = [];

        process.on('exit', () => this.cleanupEventListeners());
        process.on('SIGINT', () => this.cleanupEventListeners());
        process.on('SIGTERM', () => this.cleanupEventListeners());
    }

    async setupPlayer() {
        try {
            this.player = global.player || useMainPlayer();
            
            if (!this.player) {
                Logger.error('No player instance available. Player must be initialized in index.js first.');
                return { success: false, error: new Error('Player not initialized') };
            }
            
            Logger.debug('Using existing discord-player instance');

            this.applyVoiceConnectionPatches();

            this.setupConnectionPatching();

            try {
                const duplicates = await MusicQueue.find({});

                const queuesByGuild = {};
                for (const queue of duplicates) {
                    if (!queuesByGuild[queue.guildId]) {
                        queuesByGuild[queue.guildId] = [];
                    }
                    queuesByGuild[queue.guildId].push(queue);
                }

                let fixedGuilds = 0;
                for (const [guildId, queues] of Object.entries(queuesByGuild)) {
                    if (queues.length > 1) {
                        Logger.debug(`Auto-fixing ${queues.length} duplicate queue entries for guild ${guildId}`);

                        queues.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                        const keepQueue = queues[0];

                        await MusicQueue.deleteMany({ guildId });

                        await MusicQueue.create(keepQueue.toObject());
                        
                        fixedGuilds++;
                    }
                }
                
                if (fixedGuilds > 0) {
                    Logger.debug(`Auto-fixed queue duplicates for ${fixedGuilds} guilds on startup`);
                }

                const allQueues = await MusicQueue.find({});
                let fixedRequestedBy = 0;
                
                for (const queue of allQueues) {
                    let needsUpdate = false;

                    if (queue.currentTrack && queue.currentTrack.requestedBy === null) {
                        queue.currentTrack.requestedBy = undefined;
                        needsUpdate = true;
                    }

                    if (queue.queue && queue.queue.length > 0) {
                        for (const track of queue.queue) {
                            if (track.requestedBy === null) {
                                track.requestedBy = undefined;
                                needsUpdate = true;
                            }
                        }
                    }
                    
                    if (needsUpdate) {
                        await MusicQueue.updateOne(
                            { _id: queue._id },
                            { 
                                currentTrack: queue.currentTrack,
                                queue: queue.queue
                            }
                        );
                        fixedRequestedBy++;
                    }
                }
                
                if (fixedRequestedBy > 0) {
                    Logger.debug(`Auto-fixed requestedBy values for ${fixedRequestedBy} queue entries on startup`);
                }
            } catch (error) {
                Logger.error(`Error during queue auto-fixing on startup: ${error}`);
            }

            this.registerEvents();

            this.setupQueueSaveRestore();

            await this.restoreQueues();
            
            Logger.debug('Initialized MusicManager');
            
            return { success: true, player: this.player };
        } catch (error) {
            Logger.error('Error setting up player:', error);
            return { success: false, error };
        }
    }

    setupQueueSaveRestore() {
        try {
            if (this.config.AutoSaveInterval) {
                this.autoSaveInterval = setInterval(() => {
                    this.saveQueues();
                }, this.config.AutoSaveInterval || 30000);
            }
            
            const handleShutdown = async (signal) => {
                Logger.debug(`${signal} signal received - graceful shutdown in progress`);

                global.isShuttingDown = true;

                if (this.autoSaveInterval) {
                    clearInterval(this.autoSaveInterval);
                    this.autoSaveInterval = null;
                }
                
                if (this._scheduledSave) {
                    clearTimeout(this._scheduledSave);
                    this._scheduledSave = null;
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            };

            process.once('SIGINT', async () => {
                await handleShutdown('SIGINT');
            });
            
            process.once('SIGTERM', async () => {
                await handleShutdown('SIGTERM');
            });

            if (mongoose && mongoose.connection) {
                this.mongoDisconnected = !mongoose.connection.readyState;
                
                mongoose.connection.on('disconnected', () => {
                    this.mongoDisconnected = true;
                    Logger.debug('MongoDB disconnected - queue saves will be disabled');
                });
                
                mongoose.connection.on('connected', () => {
                    this.mongoDisconnected = false;
                    Logger.debug('MongoDB reconnected - queue saves re-enabled');
                });
            } else {
                Logger.debug('Mongoose connection not available - queue persistence disabled');
                this.mongoDisconnected = true;
            }

        } catch (error) {
            Logger.error(`Error setting up queue save/restore: ${error}`);
        }
    }

    async saveQueues(forceAll = false) {
        const now = Date.now();
        

        if (!forceAll && this._lastSaveTime && (now - this._lastSaveTime < 2000)) {
            Logger.debug('Skipping queue save - debounce period active');

            if (!this._scheduledSave) {
                this._scheduledSave = setTimeout(() => {
                    this._scheduledSave = null;
                    this.saveQueues(true).catch(err => {
                        Logger.error(`Error in scheduled queue save: ${err}`);
                    });
                }, 2000);
            }
            
            return;
        }

        this._lastSaveTime = now;

        if (this._scheduledSave) {
            clearTimeout(this._scheduledSave);
            this._scheduledSave = null;
        }
        
        try {
            if (this.mongoDisconnected) {
                Logger.debug('Skipping queue save - MongoDB is disconnected');
                return;
            }

            const queues = this.player.nodes.cache;
            if (queues.size === 0 && !forceAll) {
                Logger.debug('No active queues to save');
                return;
            }

            try {
                const guildIds = Array.from(queues.keys());

                for (const guildId of guildIds) {
                    const duplicates = await MusicQueue.find({ guildId });
                    
                    if (duplicates.length > 1) {
                        Logger.debug(`Found ${duplicates.length} queue entries for guild ${guildId}. Removing duplicates.`);

                        duplicates.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                        const keepId = duplicates[0]._id;

                        await MusicQueue.deleteMany({ guildId, _id: { $ne: keepId } });
                    }
                }
            } catch (error) {
                Logger.error(`Error cleaning up duplicate queues: ${error}`);
            }
            
            Logger.debug(`Found ${queues.size} active queue(s) to save`);

            const processedGuilds = new Map();
            
            for (const [guildId, queue] of queues) {
                if (processedGuilds.has(guildId)) {
                    Logger.debug(`Skipping duplicate save for guild ${guildId} in this operation`);
                    continue;
                }

                processedGuilds.set(guildId, true);
                
                try {
                    let voiceChannelId = null;
                    if (queue.connection && queue.connection.channel) {
                        voiceChannelId = queue.connection.channel.id;
                    } else if (queue.channel) {
                        voiceChannelId = queue.channel.id;
                    } else {
                        const { getVoiceConnection } = require('@discordjs/voice');
                        const connection = getVoiceConnection(guildId);
                        if (connection) {
                            voiceChannelId = connection.joinConfig.channelId;
                        }
                    }

                    Logger.debug(`Saving queue for guild ${guildId}:`);
                    Logger.debug(`  Current track: ${queue.currentTrack ? queue.currentTrack.title : 'None'}`);
                    Logger.debug(`  Queue size: ${queue.tracks.size} tracks`);
                    Logger.debug(`  Voice channel: ${voiceChannelId || 'Not connected'}`);

                    const hasNowPlaying = queue.metadata && queue.metadata.nowPlayingMessages && 
                        queue.metadata.nowPlayingMessages.length > 0;
                        
                    if (!queue.currentTrack && queue.tracks.size === 0 && !hasNowPlaying) {
                        const existingQueue = await MusicQueue.findOne({ guildId });
                        if (existingQueue && (existingQueue.nowPlayingMessageId || existingQueue.nowPlayingChannelId)) {
                            Logger.debug(`  Keeping empty queue document for guild ${guildId} because it has nowPlaying data`);

                            await MusicQueue.updateOne(
                                { guildId },
                                { 
                                    $set: { 
                                        currentTrack: null,
                                        queue: [],
                                        updatedAt: new Date()
                                    }
                                }
                            );
                        } else {
                        await MusicQueue.deleteMany({ guildId });
                            Logger.debug(`  Removed completely empty queue document for guild ${guildId}`);
                        }
                        continue;
                    }

                    let nowPlayingMessageId = null;
                    let nowPlayingChannelId = null;
                    
                    if (queue.metadata && queue.metadata.nowPlayingMessages && queue.metadata.nowPlayingMessages.length > 0) {
                        nowPlayingMessageId = queue.metadata.nowPlayingMessages[queue.metadata.nowPlayingMessages.length - 1];
                        nowPlayingChannelId = queue.metadata.channel?.id;
                    }

                    const currentTrackRequestedById = queue.currentTrack?.requestedBy?.id || undefined;

                    const queueData = {
                        guildId,
                        nowPlayingMessageId,
                        nowPlayingChannelId,
                        currentTrack: queue.currentTrack && queue.isPlaying() ? {
                            title: queue.currentTrack.title,
                            url: queue.currentTrack.url,
                            author: queue.currentTrack.author,
                            duration: queue.currentTrack.duration,
                            thumbnail: queue.currentTrack.thumbnail,
                            durationMS: queue.currentTrack.durationMS,
                            requestedBy: currentTrackRequestedById
                        } : null,
                        queue: queue.tracks.toArray().map(track => ({
                            title: track.title,
                            url: track.url,
                            author: track.author,
                            duration: track.duration,
                            thumbnail: track.thumbnail,
                            durationMS: track.durationMS,
                            requestedBy: track.requestedBy?.id || undefined
                        })),
                        volume: queue.node.volume,
                        repeatMode: queue.repeatMode,
                        voiceChannelId: voiceChannelId,
                        textChannelId: queue.metadata?.channel?.id || null,
                        isPaused: queue.node.isPaused(),
                        updatedAt: new Date()
                    };

                    const existingQueue = await MusicQueue.findOne({ guildId });
                    if (existingQueue) {

                        await MusicQueue.updateOne({ guildId }, { $set: queueData });
                        Logger.debug(`Updated existing queue data for guild ${guildId}`);
                    } else {
                    await MusicQueue.create(queueData);
                        Logger.debug(`Created new queue data for guild ${guildId}`);
                    }
                } catch (error) {
                    Logger.error(`Error saving queue for guild ${guildId}: ${error}`);
                }
            }
        } catch (error) {
            Logger.error(`Error saving queues to MongoDB: ${error}`);
        }
    }

    async restoreQueues() {
        try {
            if (!this.client.isReady()) {
                await new Promise(resolve => {
                    this.client.once('ready', resolve);
                });
            }

            const savedQueues = await MusicQueue.find({});
            
            if (savedQueues.length === 0) {
                Logger.debug('No saved queues found in MongoDB');
                return;
            }
            
            Logger.debug(`Attempting to restore ${savedQueues.length} music queues`);

            try {
                await this.fixDuplicateQueues();
                const updatedQueues = await MusicQueue.find({});
                if (updatedQueues.length < savedQueues.length) {
                    Logger.debug(`Reduced queue documents from ${savedQueues.length} to ${updatedQueues.length} after cleanup`);
                    if (updatedQueues.length === 0) {
                        return;
                    }
                }
            } catch (error) {
                Logger.error(`Error fixing duplicate queues during restore: ${error}`);
            }

            for (const queueData of await MusicQueue.find({})) {
                try {
                    const hasNowPlayingData = queueData.nowPlayingMessageId && queueData.nowPlayingChannelId;
                    
                    if (!queueData.currentTrack && (!queueData.queue || queueData.queue.length === 0)) {
                        if (hasNowPlayingData) {
                            Logger.debug(`Queue for guild ${queueData.guildId} has no tracks but has nowPlaying data - will try to restore visuals`);
                        } else {
                            Logger.debug(`Skipping queue for guild ${queueData.guildId} - no tracks to restore and no nowPlaying data`);
                        continue;
                        }
                    }

                    const guild = await this.client.guilds.fetch(queueData.guildId).catch((err) => {
                        Logger.debug(`Could not fetch guild ${queueData.guildId}: ${err.message}`);
                        return null;
                    });
                    
                    if (!guild) {
                        Logger.debug(`Skipping queue restore for guild ${queueData.guildId} - guild not found`);
                        continue;
                    }

                    let textChannel = null;
                    if (queueData.nowPlayingChannelId) {
                        textChannel = await guild.channels.fetch(queueData.nowPlayingChannelId).catch((err) => {
                            Logger.debug(`Could not fetch nowPlaying channel ${queueData.nowPlayingChannelId}: ${err.message}`);
                        return null;
                    });
                    
                        if (textChannel) {
                            Logger.debug(`Found nowPlaying channel for guild ${queueData.guildId}`);
                        }
                    }

                    if (!textChannel && queueData.textChannelId) {
                        textChannel = await guild.channels.fetch(queueData.textChannelId).catch((err) => {
                            Logger.debug(`Could not fetch text channel ${queueData.textChannelId}: ${err.message}`);
                            return null;
                        });
                    }

                    if (!textChannel) {
                        textChannel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
                        if (!textChannel) {
                            Logger.debug(`Skipping queue restore for guild ${queueData.guildId} - no suitable text channel found`);
                            continue;
                        }
                    }

                    let nowPlayingMessage = null;
                    if (queueData.nowPlayingMessageId && textChannel) {
                        try {
                            nowPlayingMessage = await textChannel.messages.fetch(queueData.nowPlayingMessageId).catch(() => null);
                            if (nowPlayingMessage) {
                                Logger.debug(`Found existing nowPlaying message in guild ${queueData.guildId}`);
                            }
                        } catch (error) {
                            Logger.debug(`Could not fetch nowPlaying message: ${error.message}`);
                        }
                    }

                    if ((!queueData.currentTrack || !queueData.currentTrack.url) && (!queueData.queue || queueData.queue.length === 0)) {
                        if (nowPlayingMessage) {
                            Logger.debug(`Updating nowPlaying message to empty state for guild ${queueData.guildId}`);
                            
                            try {
                                const emptyCanvas = await this.createEmptyNowPlayingCanvas();

                                const tempDir = path.join(__dirname, '../../temp');
                                if (!fs.existsSync(tempDir)) {
                                    fs.mkdirSync(tempDir, { recursive: true });
                                }
                                const tempFile = path.join(tempDir, `np_empty_${Date.now()}.png`);
                                fs.writeFileSync(tempFile, emptyCanvas.toBuffer());

                                const emptyEmbed = new EmbedBuilder()
                                    .setColor(parseInt((this.config.EmbedColor || '#FF69B4').replace('#', ''), 16))
                                    .setImage(`attachment://np_empty_${path.basename(tempFile)}`)
                                    .addFields(
                                        { name: '🎧 Music Queue', value: 'No tracks in queue', inline: true },
                                        { name: '▶️ Ready to Play', value: 'Use /play to add music', inline: true }
                                    )
                                    .setFooter({ text: 'Music Player | Waiting for your next track' });

                                await nowPlayingMessage.edit({
                                    content: '🎵 **Ready for music. What would you like to play?**',
                                    embeds: [emptyEmbed],
                                    files: [{
                                        attachment: tempFile,
                                        name: path.basename(tempFile)
                                    }]
                                });

                                setTimeout(() => {
                                    try {
                                        fs.unlinkSync(tempFile);
                                    } catch (error) {
                                    }
                                }, 5000);
                                
                                Logger.debug(`Successfully updated nowPlaying message to empty state for guild ${queueData.guildId}`);
                                continue;
                            } catch (error) {
                                Logger.error(`Error updating nowPlaying message to empty state: ${error}`);
                            }
                        }

                        Logger.debug(`No tracks to restore and couldn't update nowPlaying for guild ${queueData.guildId}`);
                        continue;
                    }

                    if (!queueData.voiceChannelId) {
                        Logger.debug(`Skipping queue restore for guild ${queueData.guildId} - no voice channel ID`);
                        continue;
                    }

                    const voiceChannel = await guild.channels.fetch(queueData.voiceChannelId).catch((err) => {
                        Logger.debug(`Could not fetch voice channel ${queueData.voiceChannelId}: ${err.message}`);
                        return null;
                    });
                    
                    if (!voiceChannel || !voiceChannel.isVoiceBased()) {
                        Logger.debug(`Skipping queue restore for guild ${queueData.guildId} - voice channel not found or not a voice channel`);
                        continue;
                    }

                    const queue = this.player.nodes.create(guild, {
                        metadata: {
                            channel: textChannel,
                            client: guild.members.me,
                            guild: guild,
                            requestedBy: this.client.user
                        },
                        volume: queueData.volume || global.config.Music?.DefaultVolume || 80,
                        leaveOnEmpty: global.config.Music?.LeaveOnEmpty === true,
                        leaveOnEmptyCooldown: global.config.Music?.LeaveEmptyDelay || 60000,
                        leaveOnEnd: global.config.Music?.LeaveOnEnd === true,
                        leaveOnStop: global.config.Music?.LeaveOnEnd === true,
                        leaveOnEndCooldown: global.config.Music?.LeaveEndDelay || 300000,
                        skipOnNoStream: true,
                        connectionTimeout: 30000,
                        bufferingTimeout: 20000,
                        pauseOnEmpty: global.config.Music?.AutoPause !== false
                    });
                    
                    try {
                        await queue.connect(voiceChannel);

                        const tracksToAdd = [];

                        if (queueData.queue && queueData.queue.length > 0) {
                            for (const trackData of queueData.queue) {
                                try {
                                    let requestedBy = null;
                                    
                                    if (trackData.requestedBy) {
                                        try {

                                            requestedBy = await this.client.users.fetch(trackData.requestedBy)
                                                .catch(() => this.client.user);
                                        } catch (userError) {
                                            requestedBy = this.client.user;
                                        }
                                    } else {
                                        requestedBy = this.client.user;
                                    }

                                    const searchResult = await this.player.search(trackData.url, {
                                        requestedBy: requestedBy,
                                        fallbackSearchEngine: 'soundcloud'
                                    });
                                    
                                    if (searchResult.tracks.length > 0) {
                                        tracksToAdd.push(searchResult.tracks[0]);
                                    }
                                } catch (trackError) {
                                    Logger.error(`Error processing queued track: ${trackError}`);
                                }
                            }

                            if (tracksToAdd.length > 0) {
                                queue.addTrack(tracksToAdd);
                            }
                        }

                        if (queueData.currentTrack) {
                            try {
                                let requestedBy = null;
                                
                                if (queueData.currentTrack.requestedBy) {
                                    try {
                                        requestedBy = await this.client.users.fetch(queueData.currentTrack.requestedBy)
                                            .catch(() => this.client.user);
                                    } catch (userError) {
                                        requestedBy = this.client.user;
                                    }
                                } else {
                                    requestedBy = this.client.user;
                                }

                                const currentTrackResult = await this.player.search(queueData.currentTrack.url, {
                                    requestedBy: requestedBy,
                                    fallbackSearchEngine: 'soundcloud'
                                });
                                
                                if (currentTrackResult.tracks.length > 0) {
                                    await queue.node.play(currentTrackResult.tracks[0]);

                                    queue.node.setVolume(queueData.volume || global.config.Music?.DefaultVolume || 80);

                                    if (queueData.repeatMode !== undefined) {
                                        queue.setRepeatMode(queueData.repeatMode);
                                    }

                                    if (queueData.isPaused) {
                                        queue.node.pause();
                                    }
                                    
                                    Logger.debug(`Restored queue for guild ${queueData.guildId} with ${tracksToAdd.length} queued tracks and 1 current track`);

                                    setTimeout(async () => {
                                        try {
                                            if (queue && queue.currentTrack && textChannel) {
                                                if (queueData.nowPlayingMessageId && queueData.nowPlayingChannelId) {
                                                    try {
                                                        const existingMessage = await textChannel.messages.fetch(queueData.nowPlayingMessageId).catch(() => null);
                                                        
                                                        if (existingMessage) {
                                                            Logger.debug(`Found existing nowPlaying message in guild ${queueData.guildId}, will update it instead of creating a new one`);
                                                            queue.metadata.nowPlayingMessages = [queueData.nowPlayingMessageId];
                                                            this.setupNowPlayingInterval(queue, textChannel);
                                                            return;
                                                        }
                                                    } catch (msgError) {
                                                        Logger.debug(`Error fetching existing nowPlaying message: ${msgError}`);
                                                    }
                                                }

                                                await this.handleNowPlayingMessage(queue, queue.currentTrack);
                                                Logger.debug(`Created new nowplaying message for restored queue in guild ${queueData.guildId}`);
                                            }
                                        } catch (err) {
                                            Logger.error(`Error creating nowplaying message for restored queue: ${err}`);
                                        }
                                    }, 2000);
                                } else {
                                    if (tracksToAdd.length > 0) {
                                        await queue.node.play();
                                        Logger.debug(`Restored queue for guild ${queueData.guildId} with ${tracksToAdd.length} queued tracks (couldn't restore current track)`);

                                        setTimeout(async () => {
                                            try {
                                                if (queue && queue.currentTrack && textChannel) {
                                                    await this.handleNowPlayingMessage(queue, queue.currentTrack);
                                                    Logger.debug(`Created new nowplaying message for restored queue in guild ${queueData.guildId}`);
                                                }
                                            } catch (err) {
                                                Logger.error(`Error creating nowplaying message for restored queue: ${err}`);
                                            }
                                        }, 2000);
                                    } else {
                                        queue.delete();
                                        Logger.debug(`Failed to restore any tracks for guild ${queueData.guildId}`);

                                        if (queueData.nowPlayingMessageId && queueData.nowPlayingChannelId) {
                                            Logger.debug(`Preserving queue document for guild ${queueData.guildId} with nowplaying data`);
                                            await MusicQueue.updateOne(
                                                { guildId: queueData.guildId },
                                                { 
                                                    $set: { 
                                                        currentTrack: null,
                                                        queue: [],
                                                        updatedAt: new Date()
                                                    }
                                                }
                                            );
                                        } else {
                                        await MusicQueue.deleteMany({ guildId: queueData.guildId });
                                            Logger.debug(`Queue deleted for guild ${queueData.guildId} - no nowplaying data to preserve`);
                                        }
                                    }
                                }
                            } catch (currentTrackError) {
                                Logger.error(`Error processing current track: ${currentTrackError}`);

                                if (tracksToAdd.length > 0) {
                                    await queue.node.play();
                                    Logger.debug(`Playing from queue after current track restore failed for guild ${queueData.guildId}`);

                                    setTimeout(async () => {
                                        try {
                                            if (queue && queue.currentTrack && textChannel) {
                                                await this.handleNowPlayingMessage(queue, queue.currentTrack);
                                                Logger.debug(`Created new nowplaying message for restored queue in guild ${queueData.guildId}`);
                                            }
                                        } catch (err) {
                                            Logger.error(`Error creating nowplaying message for restored queue: ${err}`);
                                        }
                                    }, 2000);
                                } else {
                                    queue.delete();
                                    Logger.debug(`No tracks to play for guild ${queueData.guildId}`);
                                }
                            }
                        } else if (tracksToAdd.length > 0) {
                            await queue.node.play();
                            Logger.debug(`Started playback from queue for guild ${queueData.guildId}`);

                            setTimeout(async () => {
                                try {
                                    if (queue && queue.currentTrack && textChannel) {
                                        await this.handleNowPlayingMessage(queue, queue.currentTrack);
                                        Logger.debug(`Created new nowplaying message for restored queue in guild ${queueData.guildId}`);
                                    }
                                } catch (err) {
                                    Logger.error(`Error creating nowplaying message for restored queue: ${err}`);
                                }
                            }, 2000);
                        } else {
                            queue.delete();
                            Logger.debug(`No tracks to restore for guild ${queueData.guildId}`);
                        }
                    } catch (queueError) {
                        Logger.error(`Error setting up restored queue for guild ${queueData.guildId}: ${queueError}`);
                        if (queue) {
                            queue.delete();
                        }
                    }
                } catch (error) {
                    Logger.error(`Error restoring queue for guild ${queueData.guildId}: ${error}`);
                }
            }
        } catch (error) {
            Logger.error(`Error restoring queues: ${error}`);
        }
    }

    registerEvents() {
        try {
            if (this._eventsRegistered) {
                Logger.debug('Events already registered, skipping duplicate registration');
                return;
            }

            this._eventsRegistered = true;
            Logger.debug('Registering player events (first time)');

            let isProcessingPlayerStart = false;

            this.player.events.on('playerStart', async (queue, track) => {
                try {
                    if (isProcessingPlayerStart) {
                        Logger.debug(`Skipping duplicate playerStart event while processing another one`);
                        return;
                    }
                    
                    isProcessingPlayerStart = true;

                    const resetTimer = setTimeout(() => {
                        isProcessingPlayerStart = false;
                    }, 3000);
                    
                    try {
                Logger.debug(`Player started playing track: ${track.title} in guild ${queue.metadata?.guild?.id || 'unknown'}`);
                
                if (this.config.DisplayNowPlaying) {
                    try {
                                if (!this._processedTracks) {
                                    this._processedTracks = new Map();
                                }
                                
                            const guildId = queue.metadata?.guild?.id;
                            const trackId = track.id || track.url;
                                const processingKey = `${guildId}-${trackId}`;
                            
                                Logger.debug(`Processing playerStart event: ${processingKey}`);
                                
                                const lastProcessed = this._processedTracks.get(processingKey);
                                const now = Date.now();
                                
                                if (lastProcessed && (now - lastProcessed < 5000)) {
                                    Logger.debug(`Skipping duplicate nowPlaying message for ${track.title} (processed ${now - lastProcessed}ms ago)`);
                                    clearTimeout(resetTimer);
                                    isProcessingPlayerStart = false;
                                return;
                            }
                            
                                this._processedTracks.set(processingKey, now);
                            
                                const cleanupTime = now - 60000;
                                for (const [key, timestamp] of this._processedTracks.entries()) {
                                    if (timestamp < cleanupTime) {
                                        this._processedTracks.delete(key);
                                        }
                                    }
                                
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                Logger.debug(`Creating now playing message for: ${track.title}`);
                                await this.handleNowPlayingMessage(queue, track).catch(err => {
                                Logger.error(`Error handling now playing message: ${err}`);
                            });
                    } catch (error) {
                        Logger.error(`Error in playerStart event: ${error}`);
                    }
                        }
                        
                        try {
                            await this.saveQueues();
                        } catch (error) {
                            Logger.error(`Error saving queue after playerStart: ${error}`);
                        }
                    } finally {
                        clearTimeout(resetTimer);
                        isProcessingPlayerStart = false;
                    }
                } catch (error) {
                    Logger.error(`Unhandled error in playerStart event: ${error}`);
                    isProcessingPlayerStart = false;
                }
            });
            
            this.player.events.on('audioTrackAdd', (queue, track) => {
                Logger.debug(`Track added to queue - saving queue data`);
                this.saveQueues().catch(err => {
                    Logger.error(`Error saving queue after track add: ${err}`);
                });
            });
            
            this.player.events.on('audioTracksAdd', (queue, tracks) => {
                Logger.debug(`${tracks.length} tracks added to queue - saving queue data`);
                this.saveQueues().catch(err => {
                    Logger.error(`Error saving queue after tracks add: ${err}`);
                });
            });
            
            this.player.events.on('queueEnd', (queue) => {
                Logger.debug(`Queue ended for guild ${queue.metadata?.guild?.id || 'unknown'}`);
                this.saveQueues().catch(err => {
                    Logger.error(`Error saving queue after queue end: ${err}`);
                });
                
                this.handleQueueEnd(queue).catch(err => {
                    Logger.error(`Error handling queue end: ${err}`);
                });
                
                if (global.config.Music?.LeaveOnEnd === false && queue.connection) {
                    Logger.debug(`LeaveOnEnd is disabled - preventing bot from leaving voice channel`);
                    
                    if (queue.connection._disconnect) {
                        const originalDisconnect = queue.connection._disconnect;
                        
                        queue.connection._disconnect = function(...args) {
                            if (args[0] === 'manual') {
                                return originalDisconnect.apply(this, args);
                            }
                            Logger.debug(`Prevented auto-disconnect due to LeaveOnEnd being false`);
                            return null;
                        };
                    }
                    
                    if (queue.connection.leaveTimeout) {
                        clearTimeout(queue.connection.leaveTimeout);
                        queue.connection.leaveTimeout = null;
                        Logger.debug('Cleared existing leave timeout');
                    }
                    
                    try {
                        const guildId = queue.metadata?.guild?.id;
                        if (guildId && queue.metadata?.nowPlayingMessages?.length > 0) {
                            Logger.debug(`Preserving queue data with nowPlaying message for guild ${guildId}`);
                            const messageId = queue.metadata.nowPlayingMessages[queue.metadata.nowPlayingMessages.length - 1];
                            const channelId = queue.metadata.channel?.id;
                            
                            if (messageId && channelId) {
                                MusicQueue.updateOne(
                                    { guildId },
                                    {
                                        $set: {
                                            nowPlayingMessageId: messageId,
                                            nowPlayingChannelId: channelId,
                                            currentTrack: null,
                                            queue: [],
                                            updatedAt: new Date()
                                        }
                                    },
                                    { upsert: true }
                                ).catch(err => {
                                    Logger.error(`Error preserving queue data: ${err}`);
                                });
                            }
                        }
                    } catch (error) {
                        Logger.error(`Error preserving queue data after end: ${error}`);
                    }
                }
            });
            
            this.player.events.on('connectionCreate', (queue) => {
                Logger.debug(`Voice connection established - saving queue data with voice channel info`);
                this.saveQueues().catch(err => {
                    Logger.error(`Error saving queue after connection create: ${err}`);
                });
                
                if (queue && queue.connection) {
                    Logger.debug('Applying custom voice connection settings');
                    
                    const connection = queue.connection;
                    
                    const originalOnVoiceStateUpdate = connection.voiceConnection.onVoiceStateUpdate;
                    
                    connection.voiceConnection.onVoiceStateUpdate = function(oldState, newState) {
                        const result = originalOnVoiceStateUpdate.call(this, oldState, newState);
                        
                        try {
                            if (global.config.Music?.LeaveOnEmpty === false) {
                                if (connection.leaveTimeout) {
                                    clearTimeout(connection.leaveTimeout);
                                    connection.leaveTimeout = null;
                                    Logger.debug('LeaveOnEmpty disabled - cleared disconnect timeout');
                                }
                            } else if (global.config.Music?.LeaveOnEmpty === true && 
                                       global.config.Music?.LeaveEmptyDelay) {
                                const delay = global.config.Music.LeaveEmptyDelay;
                                Logger.debug(`Using custom LeaveEmptyDelay: ${delay}ms`);
                            }
                            
                            if (global.config.Music?.LeaveOnEnd === false) {
                                if (connection._disconnectTimeout) {
                                    clearTimeout(connection._disconnectTimeout);
                                    connection._disconnectTimeout = null;
                                    Logger.debug('LeaveOnEnd disabled - cleared disconnect timeout');
                                }
                            }
                        } catch (err) {
                            Logger.error(`Error in custom voice state handler: ${err}`);
                        }
                        
                        return result;
                    };
                }
            });
            
            this.player.events.on('connectionDestroy', (queue) => {
                Logger.debug(`Voice connection destroyed - saving queue data`);
                this.saveQueues().catch(err => {
                    Logger.error(`Error saving queue after connection destroy: ${err}`);
                });
            });
            
            this.player.events.on('queueDelete', async (queue) => {
                try {
                    const guildId = queue.metadata?.guild?.id;
                    if (guildId) {
                        Logger.debug(`Queue deleted for guild ${guildId} - updating database instead of removing`);
                        
                        const existingData = await MusicQueue.findOne({ guildId });
                        
                        if (existingData && (existingData.nowPlayingMessageId || existingData.nowPlayingChannelId)) {
                            await MusicQueue.updateOne(
                                { guildId },
                                {
                                    $set: {
                                        currentTrack: null,
                                        queue: [],
                                        isPaused: false,
                                        updatedAt: new Date()
                                    }
                                }
                            );
                            Logger.debug(`Preserved queue data with nowplaying information for guild ${guildId}`);
                        } else {
                        await MusicQueue.deleteMany({ guildId });
                            Logger.debug(`Removed queue with no nowplaying data for guild ${guildId}`);
                        }
                    }
                } catch (error) {
                    Logger.error(`Error handling queue delete: ${error}`);
                }
            });
            
            this.player.events.on('error', (queue, error) => {
                Logger.error(`Player error: ${error.message} in guild ${queue.metadata?.guild?.id || 'unknown'}`);
            });
            
            this.player.events.on('playerError', (queue, error) => {
                Logger.error(`Player playback error: ${error.message} in guild ${queue.metadata?.guild?.id || 'unknown'}`);
            });
            
            this.player.events.on('connectionError', (queue, error) => {
                Logger.error(`Player connection error: ${error.message} in guild ${queue.metadata?.guild?.id || 'unknown'}`);
            });
            
            this.player.events.on('playerFinish', async (queue, track) => {
                Logger.debug(`Track finished playing: ${track.title} in guild ${queue.metadata?.guild?.id || 'unknown'}`);
                
                try {
                    const guildId = queue.metadata?.guild?.id;
                    
                    const hasMoreTracks = queue.tracks.size > 0;
                    
                    if (!hasMoreTracks) {
                        Logger.debug(`No more tracks in queue for guild ${guildId} - clearing current track in database`);
                        
                        if (guildId) {
                            const existingQueue = await MusicQueue.findOne({ guildId });
                            
                            if (existingQueue) {
                                existingQueue.currentTrack = null;
                                existingQueue.updatedAt = new Date();
                                await existingQueue.save();
                                Logger.debug(`Cleared current track in database for guild ${guildId}`);
                            }
                        }
                    } else {
                        Logger.debug(`More tracks in queue for guild ${guildId} - will update when next track starts`);
                    }
                } catch (error) {
                    Logger.error(`Error handling track finish: ${error}`);
                }
            });
            
            Logger.debug('Registered player event handlers');
        } catch (error) {
            Logger.error(`Error registering player events: ${error}`);
        }
    }

    async handleNowPlayingMessage(queue, track) {
        try {
            if (!this.config.Music?.DisplayNowPlaying) {
                Logger.debug('Now playing messages are disabled in config, skipping');
                return null;
            }

            if (!queue || !track) {
                return null;
            }

            const guildId = queue.guild.id;
            if (!guildId) {
                return null;
            }

            const textChannel = queue.metadata?.channel;
            if (!textChannel || !textChannel.isTextBased()) {
                return null;
            }
            
            if (!global.musicData) {
                global.musicData = {};
            }
            if (!global.musicData.nowPlayingMessages) {
                global.musicData.nowPlayingMessages = {};
            }
            if (!global.musicData.nowPlayingMessages[guildId]) {
                global.musicData.nowPlayingMessages[guildId] = [];
            }
            
            if (this.config.Music.RemoveOldNowPlaying) {
                await this.cleanupOldMessages(guildId, 'nowplaying');
            } else {
                Logger.debug('RemoveOldNowPlaying is disabled, skipping cleanup');
            }
            
            const embed = new EmbedBuilder()
                .setColor(this.config.EmbedColor)
                .setTitle('Now Playing')
                .setDescription(`[${track.title}](${track.url})`)
                .addFields(
                    { 
                        name: 'Duration', 
                        value: track.duration === '0:00' 
                            ? 'LIVE' 
                            : `\`${track.duration}\``,
                        inline: true 
                    },
                    { 
                        name: 'Requested by', 
                        value: `${track.requestedBy}`, 
                        inline: true 
                    }
                )
                .setTimestamp();
                
            if (track.thumbnail) {
                embed.setThumbnail(track.thumbnail);
            }
            
            const message = await textChannel.send({ embeds: [embed] });
            
            global.musicData.nowPlayingMessages[guildId].push(message.id);
            
            await this.saveNowPlayingMessage(guildId, message.id, textChannel.id, queue);
            
            return message;
        } catch (error) {
            Logger.error('Error handling now playing message:', error);
            return null;
        }
    }

    setupNowPlayingInterval(queue, textChannel) {
        try {
            if (queue.metadata.nowPlayingInterval) {
                clearInterval(queue.metadata.nowPlayingInterval);
                queue.metadata.nowPlayingInterval = null;
            }
            
            queue.metadata.nowPlayingInterval = setInterval(async () => {
                try {
                    if (!queue || !queue.metadata) {
                        clearInterval(queue.metadata.nowPlayingInterval);
                        return;
                    }
                    
                    const messageId = queue.metadata.nowPlayingMessages && 
                        queue.metadata.nowPlayingMessages.length > 0 ? 
                        queue.metadata.nowPlayingMessages[queue.metadata.nowPlayingMessages.length - 1] : null;
                    
                    if (!messageId) {
                        clearInterval(queue.metadata.nowPlayingInterval);
                        queue.metadata.nowPlayingInterval = null;
                        return;
                    }
                    
                    const message = await textChannel.messages.fetch(messageId).catch(() => null);
                    if (!message || message.deleted) {
                        clearInterval(queue.metadata.nowPlayingInterval);
                        queue.metadata.nowPlayingInterval = null;
                        return;
                    }
                    
                    if (!queue.isPlaying() || !queue.currentTrack) {
                        Logger.debug(`Queue not playing - updating to empty state in guild ${queue.metadata?.guild?.id}`);
                        
                        try {
                        const emptyCanvas = await this.createEmptyNowPlayingCanvas();
                        
                            const tempDir = path.join(__dirname, '../temp');
                            if (!fs.existsSync(tempDir)) {
                                fs.mkdirSync(tempDir, { recursive: true });
                            }
                        const tempFile = path.join(tempDir, `np_empty_${Date.now()}.png`);
                        fs.writeFileSync(tempFile, emptyCanvas.toBuffer());
                            
                            const emptyEmbed = new EmbedBuilder()
                                .setColor(parseInt((this.config.EmbedColor || '#FF69B4').replace('#', ''), 16))
                                .setImage(`attachment://np_empty_${path.basename(tempFile)}`)
                                .addFields(
                                    { name: 'Status', value: 'Queue ended', inline: true },
                                    { name: 'Next steps', value: 'Use /play to add music', inline: true }
                        );
                        
                        await message.edit({
                            content: '🎵 **Nothing currently playing**',
                            embeds: [emptyEmbed],
                            files: [{
                                attachment: tempFile,
                                name: path.basename(tempFile)
                            }]
                        });
                        
                        setTimeout(() => {
                            try {
                                fs.unlinkSync(tempFile);
                            } catch (error) {
                            }
                        }, 5000);
                        
                            return;
                        } catch (error) {
                            Logger.error(`Error updating to empty state: ${error}`);
                            clearInterval(queue.metadata.nowPlayingInterval);
                            queue.metadata.nowPlayingInterval = null;
                        return;
                    }
                    }
                    
                    let sourceIcon = '🎵';
                    if (queue.currentTrack?.url?.includes('youtube')) sourceIcon = '🔴';
                    else if (queue.currentTrack?.url?.includes('spotify')) sourceIcon = '🟢';
                    else if (queue.currentTrack?.url?.includes('soundcloud')) sourceIcon = '🟠';
                    
                    const updatedCanvas = await this.createNowPlayingCanvas(queue, queue.currentTrack);
                    
                    const tempDir = path.join(__dirname, '../temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    const tempFile = path.join(tempDir, `np_update_${Date.now()}.png`);
                    fs.writeFileSync(tempFile, updatedCanvas.toBuffer());
                    
                    const requestedByValue = queue.currentTrack?.requestedBy?.id 
                        ? `<@${queue.currentTrack.requestedBy.id}>`
                        : 'Unknown';
                    
                    const updatedEmbed = new EmbedBuilder()
                        .setColor(parseInt((this.config.EmbedColor || '#FF69B4').replace('#', ''), 16))
                        .setImage(`attachment://np_update_${path.basename(tempFile)}`)
                        .addFields(
                            { name: 'Volume', value: `${queue.node.volume}%`, inline: true },
                            { name: 'Queue Length', value: `${queue.tracks.size + 1} track(s)`, inline: true },
                            { name: 'Requested By', value: requestedByValue, inline: true }
                        );
                    
                    const updatedButtons = this.createControlButtons(queue);
                    
                    await message.edit({
                        content: `${sourceIcon} **Now Playing: ${queue.currentTrack.title}**`,
                        embeds: [updatedEmbed],
                        components: updatedButtons,
                        files: [{
                            attachment: tempFile,
                            name: path.basename(tempFile)
                        }]
                    });
                    
                    setTimeout(() => {
                        try {
                            fs.unlinkSync(tempFile);
                        } catch (error) {
                        }
                    }, 5000);
                } catch (error) {
                    Logger.error(`Error updating nowplaying message: ${error}`);
                }
            }, 10000);
            
            if (!queue._hasCleanupListener) {
                const originalDelete = queue.delete;
                queue.delete = function() {
                    if (this.metadata && this.metadata.nowPlayingInterval) {
                        clearInterval(this.metadata.nowPlayingInterval);
                        this.metadata.nowPlayingInterval = null;
                    }
                    return originalDelete.apply(this, arguments);
                };
                queue._hasCleanupListener = true;
            }
        } catch (error) {
            Logger.error(`Error setting up nowplaying interval: ${error}`);
        }
    }

    async createEmptyNowPlayingCanvas() {
        const canvasWidth = 600;
        const canvasHeight = 150;
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        gradient.addColorStop(0, 'rgba(22, 22, 30, 0.92)');
        gradient.addColorStop(0.5, 'rgba(30, 30, 42, 0.92)');
        gradient.addColorStop(1, 'rgba(22, 22, 30, 0.92)');
        
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(0, 0, canvasWidth, canvasHeight, 20);
        ctx.fill();
        ctx.restore();
        
        ctx.save();
        const borderGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        borderGradient.addColorStop(0, 'rgba(255, 20, 147, 0.4)');
        borderGradient.addColorStop(0.5, 'rgba(255, 105, 180, 0.7)');
        borderGradient.addColorStop(1, 'rgba(255, 20, 147, 0.4)');
        
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(2, 2, canvasWidth-4, canvasHeight-4, 18);
        ctx.stroke();
        ctx.restore();
        
        ctx.save();
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < canvasWidth; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvasHeight);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        
        ctx.save();
        const centerY = canvasHeight / 2;
        
        const barCount = 26;
        const maxBarHeight = 40;
        const barWidth = 3;
        const barGap = 4;
        const startX = canvasWidth - 180;
        const barsTotalWidth = barCount * (barWidth + barGap);
        
        const spectrumGradient = ctx.createLinearGradient(startX, centerY - maxBarHeight/2, startX + barsTotalWidth, centerY + maxBarHeight/2);
        spectrumGradient.addColorStop(0, 'rgba(255, 105, 180, 0.2)');
        spectrumGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
        spectrumGradient.addColorStop(1, 'rgba(255, 105, 180, 0.2)');
        
        ctx.fillStyle = spectrumGradient;
        
        for (let i = 0; i < barCount; i++) {
            const position = i / (barCount - 1);
            const bellCurve = Math.sin(Math.PI * position);
            const height = maxBarHeight * bellCurve * 0.3;
            
            ctx.fillRect(
                startX + i * (barWidth + barGap),
                centerY - height/2,
                barWidth,
                height
            );
        }
        ctx.restore();
        
        const musicX = 75;
        const musicY = canvasHeight / 2;
        
        const circleRadius = 45;
        ctx.save();
        const glowGradient = ctx.createRadialGradient(
            musicX, musicY, 0,
            musicX, musicY, circleRadius + 10
        );
        glowGradient.addColorStop(0, 'rgba(255, 105, 180, 0.3)');
        glowGradient.addColorStop(0.6, 'rgba(255, 105, 180, 0.1)');
        glowGradient.addColorStop(1, 'rgba(255, 105, 180, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(musicX, musicY, circleRadius + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
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
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
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
        
        ctx.save();
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        ctx.fillText('♪', musicX - 5, musicY - 5);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('♫', musicX + 15, musicY - 15);
        ctx.restore();
        
        const textX = musicX + circleRadius + 40;
        const mainTextY = centerY - 20;
        
        const textGradient = ctx.createLinearGradient(textX, mainTextY - 20, textX + 300, mainTextY + 20);
        textGradient.addColorStop(0, '#FF69B4');
        textGradient.addColorStop(0.5, '#FFFFFF');
        textGradient.addColorStop(1, '#FF69B4');k
        
        ctx.save();
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillText('Nothing Playing', textX + 1, mainTextY + 1);
        
        ctx.fillStyle = textGradient;
        ctx.fillText('Nothing Playing', textX, mainTextY);
        ctx.restore();
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '16px Arial';
        ctx.fillText('Use /play to discover and play music', textX, mainTextY + 35);
        ctx.restore();
        
        return canvas;
    }

    getSourceIcon(url) {
        if (!url) return '🎵';
        
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return '🔴';
        } else if (url.includes('spotify.com')) {
            return '🟢';
        } else if (url.includes('soundcloud.com')) {
            return '🟠';
        } else {
            return '🎵';
        }
    }

    createControlButtons(queue) {
        const mainRow = new ActionRowBuilder();
        const secondRow = new ActionRowBuilder();
        
        
        if (global.config.Music?.Buttons?.ShowPrevious !== false) {
            mainRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('music_previous')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        if (global.config.Music?.Buttons?.ShowPauseResume !== false) {
            mainRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('music_playpause')
                    .setEmoji(queue?.node?.isPaused() ? '▶️' : '⏸️')
                    .setStyle(queue?.node?.isPaused() ? ButtonStyle.Success : ButtonStyle.Secondary)
            );
        }
        
        if (global.config.Music?.Buttons?.ShowSkip !== false) {
            mainRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        if (global.config.Music?.Buttons?.ShowLoop !== false) {
            mainRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        if (global.config.Music?.Buttons?.ShowShuffle !== false) {
            mainRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setEmoji('🔀')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        let hasSecondRowButtons = false;
        
        if (global.config.Music?.Buttons?.ShowVolumeControls !== false) {
            secondRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('music_volumedown')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_volumeup')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary)
            );
            hasSecondRowButtons = true;
        }
        
        if (global.config.Music?.Buttons?.ShowStop !== false) {
            secondRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger)
        );
            hasSecondRowButtons = true;
        }
        
        const rows = [mainRow];
        if (hasSecondRowButtons) {
            rows.push(secondRow);
        }
        
        return rows;
    }

    storePlayerMessage(guildId, type, messageId, channelId) {
        if (!this.playerMessages.has(guildId)) {
            this.playerMessages.set(guildId, new Map());
        }
        
        this.playerMessages.get(guildId).set(type, { messageId, channelId });
    }

    async cleanupOldMessages(guildId, type) {
        try {
            if (type === 'nowplaying' && !this.config.Music.RemoveOldNowPlaying) {
                Logger.debug('Now playing message cleanup is disabled in config, skipping');
                return 0;
            }
            
            if (!this.client || !guildId) {
                return 0;
            }
            
            let messageCollection;
            if (type === 'nowplaying') {
                if (!global.musicData?.nowPlayingMessages?.[guildId]) {
                    return 0;
                }
                messageCollection = [...global.musicData.nowPlayingMessages[guildId]];
            } else if (type === 'player') {
                if (!global.musicData?.playerMessages?.[guildId]) {
                    return 0;
                }
                messageCollection = [...global.musicData.playerMessages[guildId]];
            } else {
                return 0;
            }
            
            if (!messageCollection || messageCollection.length === 0) {
                return 0;
            }
            
            let messagesToKeep = [];
            if (type === 'nowplaying') {
                messagesToKeep = messageCollection.slice(-2);
            } else if (type === 'player') {
                messagesToKeep = messageCollection.slice(-1);
            }
            
            const messagesToDelete = messageCollection.filter(
                msgId => !messagesToKeep.includes(msgId)
            );
            
            if (messagesToDelete.length === 0) {
                return 0;
            }
            
            let deletedCount = 0;
            const collection = type === 'nowplaying' 
                ? global.musicData.nowPlayingMessages
                : global.musicData.playerMessages;
            
            for (const messageId of messagesToDelete) {
                try {
                    const messageData = await this.db.get(
                        `SELECT * FROM music_messages WHERE guild_id = ? AND message_id = ? AND type = ?`,
                        [guildId, messageId, type]
                    );
                    
                    if (messageData) {
                        const channel = await this.client.channels.fetch(messageData.channel_id).catch(() => null);
                        
                        if (channel && channel.isTextBased()) {
                            const message = await channel.messages.fetch(messageId).catch(() => null);
                            
                            if (message && message.deletable) {
                                await message.delete();
                                deletedCount++;
                                Logger.debug(`Deleted old ${type} message: ${messageId}`);
                                
                                await this.db.run(
                                    'DELETE FROM music_messages WHERE guild_id = ? AND message_id = ? AND type = ?',
                                    [guildId, messageId, type]
                                );
                            }
                        }
                    }
                    
                    const index = collection[guildId].indexOf(messageId);
                    if (index > -1) {
                        collection[guildId].splice(index, 1);
                    }
                } catch (error) {
                    Logger.error(`Error deleting ${type} message ${messageId}: ${error}`);
                    
                    const index = collection[guildId].indexOf(messageId);
                    if (index > -1) {
                        collection[guildId].splice(index, 1);
                    }
                }
            }
            
            return deletedCount;
        } catch (error) {
            Logger.error(`Error in cleanupOldMessages: ${error}`);
            return 0;
        }
    }

    async handleQueueEnd(queue) {
        try {
            const channel = queue?.metadata?.channel;
            if (channel) {
                const message = await channel.send({
                    content: '🎵 Music playback has ended. Queue is now empty.'
                });
                
                if (this.config.AutoDeleteCommands) {
                    setTimeout(() => {
                        if (message && message.deletable) {
                            message.delete().catch(() => {});
                        }
                    }, this.config.CommandDeleteDelay || 5000);
                }
            }
            
            if (queue.metadata?.nowPlayingMessages?.length > 0 && channel) {
                try {
                    const messageId = queue.metadata.nowPlayingMessages[queue.metadata.nowPlayingMessages.length - 1];
                    const nowPlayingMessage = await channel.messages.fetch(messageId).catch(() => null);
                    
                    if (nowPlayingMessage) {
                        Logger.debug(`Queue ended - Forcing update of Now Playing message to empty state`);
                        
                        const emptyCanvas = await this.createEmptyNowPlayingCanvas();
                        
                        const tempDir = path.join(__dirname, '../../temp');
                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir, { recursive: true });
                        }
                        const tempFile = path.join(tempDir, `np_empty_${Date.now()}.png`);
                        fs.writeFileSync(tempFile, emptyCanvas.toBuffer());
                        
                        const emptyEmbed = new EmbedBuilder()
                            .setColor(parseInt((this.config.EmbedColor || '#FF69B4').replace('#', ''), 16))
                            .setImage(`attachment://np_empty_${path.basename(tempFile)}`)
                            .addFields(
                                { name: '🎧 Music Queue', value: 'No tracks in queue', inline: true },
                                { name: '▶️ Ready to Play', value: 'Use /play to add music', inline: true }
                            )
                            .setFooter({ text: 'Music Player | Waiting for your next track' });
                        
                        await nowPlayingMessage.edit({
                            content: '🎵 **Ready for music. What would you like to play?**',
                            embeds: [emptyEmbed],
                            files: [{
                                attachment: tempFile,
                                name: path.basename(tempFile)
                            }]
                        });
                        
                        setTimeout(() => {
                            try {
                                fs.unlinkSync(tempFile);
                            } catch (error) {
                            }
                        }, 5000);
                    }
                } catch (error) {
                    Logger.error(`Error updating nowplaying message on queue end: ${error}`);
                }
            }
        } catch (error) {
            Logger.error('Error handling queue end:', error);
        }
    }

    /**
     * Play a track in a voice channel
     * @param {VoiceChannel} voiceChannel - The voice channel to join
     * @param {string} query - The track query (URL or search terms)
     * @param {Interaction} interaction - The interaction that triggered the play command
     * @param {Object} options - Additional options for playback
     * @returns {Promise<Object>} - Queue and track information
     */
    async play(voiceChannel, query, interaction, skipSearch = false, options = {}) {
        try {
            const { playTop = false, skipCurrent = false } = options;
            
            const botVC = interaction.guild.members.me.voice.channel;
            if (botVC) {
                if (voiceChannel.id !== botVC.id) {
                    return { success: false, message: 'You must be in the same voice channel as the bot to play music.' };
                }
            }
            
            const guildId = interaction.guild.id;
            let existingQueueData = null;
            let existingNowPlayingData = null;
            
            try {
                existingQueueData = await MusicQueue.findOne({ guildId });
                if (existingQueueData) {
                    Logger.debug(`Found existing queue data for guild ${guildId}, will update instead of delete`);
                    
                    if (existingQueueData.nowPlayingMessageId && existingQueueData.nowPlayingChannelId) {
                        existingNowPlayingData = {
                            messageId: existingQueueData.nowPlayingMessageId,
                            channelId: existingQueueData.nowPlayingChannelId
                        };
                        Logger.debug(`Preserved nowPlaying message data: ${existingNowPlayingData.messageId}`);
                    }
                }
            } catch (error) {
                Logger.error(`Error checking for existing queue: ${error}`);
            }
            
            let result;
            if (skipSearch === true && typeof query === 'object' && query.tracks && query.tracks.length > 0) {
                Logger.debug('Using provided search result object instead of searching');
                result = query;
            } else {
                result = await this.player.search(query, {
                    requestedBy: interaction.user,
                    fallbackSearchEngine: 'soundcloud'
                }).catch(error => {
                    Logger.error(`Search error: ${error}`);
                    return null;
                });
            }
            
            if (!result || result.tracks.length === 0) {
                return { success: false, message: `No results found for: ${typeof query === 'string' ? query : 'the provided input'}!` };
            }
            
            const queue = this.player.nodes.create(interaction.guild, {
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild.members.me,
                    guild: interaction.guild,
                    requestedBy: interaction.user,
                    nowPlayingMessages: []
                },
                volume: global.config.Music?.DefaultVolume || 80,
                leaveOnEmpty: global.config.Music?.LeaveOnEmpty === true,
                leaveOnEmptyCooldown: global.config.Music?.LeaveEmptyDelay || 60000,
                leaveOnEnd: global.config.Music?.LeaveOnEnd === true,
                leaveOnStop: global.config.Music?.LeaveOnEnd === true,
                leaveOnEndCooldown: global.config.Music?.LeaveEndDelay || 300000,
                skipOnNoStream: true,
                connectionTimeout: 30000,
                bufferingTimeout: 20000,
                pauseOnEmpty: global.config.Music?.AutoPause !== false
            });
            
            
            if (!queue.connection) {
                await queue.connect(voiceChannel);
            }
            
            const maxQueueSize = global.config.Music?.MaxQueueSize || 100;
            
            if (result.playlist) {
                const tracks = result.tracks;
                
                if (queue.tracks.size + tracks.length > maxQueueSize) {
                    const availableSpace = Math.max(0, maxQueueSize - queue.tracks.size);
                    const tracksToAdd = tracks.slice(0, availableSpace);
                    
                    if (playTop) {
                        for (let i = tracksToAdd.length - 1; i >= 0; i--) {
                            queue.insertTrack(tracksToAdd[i]);
                        }
                    } else {
                        queue.addTrack(tracksToAdd);
                    }
                    
                    if (!queue.isPlaying()) {
                        await queue.node.play();
                    } else if (skipCurrent) {
                        await queue.node.skip();
                    }
                    
                    return {
                        success: true,
                        message: `Added ${tracksToAdd.length} tracks to the queue`,
                        playlist: result.playlist,
                        tracks: tracksToAdd,
                        limitReached: true
                    };
                } else {
                    if (playTop) {
                        for (let i = tracks.length - 1; i >= 0; i--) {
                            queue.insertTrack(tracks[i]);
                        }
                    } else {
                        queue.addTrack(tracks);
                    }
                    
                    if (!queue.isPlaying()) {
                        await queue.node.play();
                    } else if (skipCurrent) {
                        await queue.node.skip();
                    }
                    
                    return {
                        success: true,
                        message: `Added ${tracks.length} tracks to the queue`,
                        playlist: result.playlist,
                        tracks: tracks
                    };
                }
            } else {
                const track = result.tracks[0];
                
                if (queue.tracks.size >= maxQueueSize) {
                    return {
                        success: false,
                        message: `Cannot add track: Queue size limit reached`,
                        limitReached: true
                    };
                }
                
                if (playTop) {
                    queue.insertTrack(track);
                } else {
                    queue.addTrack(track);
                }
                
                if (!queue.isPlaying()) {
                    await queue.node.play();
                } else if (skipCurrent) {
                    await queue.node.skip();
                }
                
                return {
                    success: true,
                    message: `Song Queued`,
                    track: track
                };
            }
        } catch (error) {
            Logger.error(`Error in play method: ${error}`);
            return { success: false, message: `Error: ${error.message}` };
        }
    }

    async fixDuplicateQueues() {
        try {
            Logger.debug('Checking for duplicate queue entries...');
            
            const allQueues = await MusicQueue.find({});
            
            const queuesByGuild = {};
            for (const queue of allQueues) {
                if (!queuesByGuild[queue.guildId]) {
                    queuesByGuild[queue.guildId] = [];
                }
                queuesByGuild[queue.guildId].push(queue);
            }
            
            let fixedCount = 0;
            let totalDuplicates = 0;
            
            for (const [guildId, queues] of Object.entries(queuesByGuild)) {
                if (queues.length > 1) {
                    totalDuplicates += queues.length - 1;
                    Logger.debug(`Found ${queues.length} duplicate queue entries for guild ${guildId}`);
                    
                    queues.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                    
                    const keepQueue = queues[0];
                    
                    let mergedQueue = { ...keepQueue.toObject() };
                    
                    if (!mergedQueue.currentTrack && mergedQueue.queue && mergedQueue.queue.length > 0) {
                        mergedQueue.currentTrack = mergedQueue.queue.shift();
                    }
                    
                    for (let i = 1; i < queues.length; i++) {
                        const dupQueue = queues[i].toObject();
                        
                        if (!mergedQueue.currentTrack && dupQueue.currentTrack) {
                            mergedQueue.currentTrack = dupQueue.currentTrack;
                        }
                        
                        if (dupQueue.queue && dupQueue.queue.length > 0) {
                            const existingTrackUrls = new Set(
                                mergedQueue.queue.map(track => track.url)
                            );
                            
                            for (const track of dupQueue.queue) {
                                if (!existingTrackUrls.has(track.url)) {
                                    mergedQueue.queue.push(track);
                                    existingTrackUrls.add(track.url);
                                }
                            }
                        }
                    }
                    
                    await MusicQueue.deleteMany({ guildId });
                    
                    await MusicQueue.create(mergedQueue);
                    
                    fixedCount++;
                }
            }
            
            Logger.debug(`Fixed ${fixedCount} guilds with duplicate queues (total of ${totalDuplicates} duplicates removed)`);
            return { fixedGuilds: fixedCount, totalDuplicates };
        } catch (error) {
            Logger.error(`Error fixing duplicate queues: ${error}`);
            return { error: error.message };
        }
    }

    async cleanMusicQueues() {
        try {
            Logger.debug('Manually cleaning up all music queue data...');
            const result = await MusicQueue.deleteMany({});
            Logger.debug(`Deleted ${result.deletedCount} queue entries`);
            return result.deletedCount;
        } catch (error) {
            Logger.error(`Failed to clean up music queues: ${error}`);
            return 0;
        }
    }

    patchQueueSettings(queue) {
        try {
            if (!queue) return;
            
            Logger.debug(`Applying aggressive queue patches to enforce config settings`);
            
            queue._customLeaveOnEnd = global.config.Music?.LeaveOnEnd === true;
            queue._customLeaveOnEmpty = global.config.Music?.LeaveOnEmpty === true;
            queue._customLeaveEndDelay = global.config.Music?.LeaveEndDelay || 300000;
            queue._customLeaveEmptyDelay = global.config.Music?.LeaveEmptyDelay || 60000;
            
            queue.once('connectionCreate', (connection) => {
                if (!connection) return;
                
                Logger.debug(`Patching new voice connection`);
                
                try {
                    if (!connection._originalDisconnect && connection.disconnect) {
                        connection._originalDisconnect = connection.disconnect;
                        
                        connection.disconnect = () => {
                            if (!queue._customLeaveOnEnd && !queue._customLeaveOnEmpty) {
                                Logger.debug(`Blocking automatic disconnect per config settings`);
                                return;
                            }
                            
                            return connection._originalDisconnect();
                        };
                    }
                    
                    if (connection.voiceConnection) {
                        const checkAndClearTimeouts = () => {
                            if (!queue._customLeaveOnEmpty) {
                                if (connection._emptyTimeout) {
                                    clearTimeout(connection._emptyTimeout);
                                    connection._emptyTimeout = null;
                                    Logger.debug(`Cleared empty timeout (LeaveOnEmpty=false)`);
                                }
                            }
                            
                            if (!queue._customLeaveOnEnd) {
                                if (connection._endTimeout) {
                                    clearTimeout(connection._endTimeout);
                                    connection._endTimeout = null;
                                    Logger.debug(`Cleared end timeout (LeaveOnEnd=false)`);
                                }
                            }
                        };
                        
                        checkAndClearTimeouts();
                        
                        const intervalId = setInterval(checkAndClearTimeouts, 5000);
                        
                        connection._leaveCheckInterval = intervalId;
                        
                        const originalDestroy = connection.destroy;
                        connection.destroy = function(...args) {
                            if (this._leaveCheckInterval) {
                                clearInterval(this._leaveCheckInterval);
                                this._leaveCheckInterval = null;
                            }
                            
                            return originalDestroy.apply(this, args);
                        };
                    }
                } catch (error) {
                    Logger.error(`Error patching voice connection: ${error}`);
                }
            });
            
            if (queue.connection) {
                try {
                    Logger.debug(`Patching existing voice connection`);
                    
                    const connection = queue.connection;
                    
                    if (!connection._originalDisconnect && connection.disconnect) {
                        connection._originalDisconnect = connection.disconnect;
                        
                        connection.disconnect = () => {
                            if (!queue._customLeaveOnEnd && !queue._customLeaveOnEmpty) {
                                Logger.debug(`Blocking automatic disconnect per config settings`);
                                return;
                            }
                            
                            return connection._originalDisconnect();
                        };
                    }
                    
                    if (!queue._customLeaveOnEmpty) {
                        if (connection._emptyTimeout) {
                            clearTimeout(connection._emptyTimeout);
                            connection._emptyTimeout = null;
                            Logger.debug(`Cleared empty timeout (LeaveOnEmpty=false)`);
                        }
                    }
                    
                    if (!queue._customLeaveOnEnd) {
                        if (connection._endTimeout) {
                            clearTimeout(connection._endTimeout);
                            connection._endTimeout = null;
                            Logger.debug(`Cleared end timeout (LeaveOnEnd=false)`);
                        }
                    }
                } catch (error) {
                    Logger.error(`Error patching existing voice connection: ${error}`);
                }
            }
        } catch (error) {
            Logger.error(`Error in patchQueueSettings: ${error}`);
        }
    }

    applyVoiceConnectionPatches() {
        try {
            const { Logger } = require('./logger');
            Logger.debug('Applying voice connection patches');
            
            if (this._patchedVoiceStateUpdateHandlers) {
                this._patchedVoiceStateUpdateHandlers.forEach(handler => {
                    if (this.client && handler) {
                        this.client.off('voiceStateUpdate', handler);
                    }
                });
            }
            this._patchedVoiceStateUpdateHandlers = [];
            
            try {
                const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
                global.voiceChannelConfigs = global.voiceChannelConfigs || new Map();
                
                if (!global.originalJoinVoiceChannel) {
                    global.originalJoinVoiceChannel = joinVoiceChannel;
                }
                
                global.patchedJoinVoiceChannel = function(config) {
                    if (config && config.guildId) {
                        global.voiceChannelConfigs.set(config.guildId, config);
                    }
                    return global.originalJoinVoiceChannel(config);
                };
                
                global.joinVoiceChannel = global.patchedJoinVoiceChannel;
                
                Logger.debug('Patched joinVoiceChannel function for connection tracking');
            } catch (error) {
                Logger.error(`Failed to patch discord-player directly: ${error}`);
            }
            
            try {
                if (this.client && this.client.on) {
                    const voiceStateHandler = (oldState, newState) => {
                        if (oldState.member.id !== this.client.user.id && newState.member.id !== this.client.user.id) {
                            return;
                        }
                        
                        if (oldState.channel && !newState.channel) {
                            Logger.debug('Bot being disconnected from voice channel');
                            
                            if (global.config.Music?.LeaveOnEmpty === false) {
                                try {
                                    const player = this.player;
                                    if (!player) return;
                                    
                                    const guild = oldState.guild;
                                    const queue = player.nodes.get(guild.id);
                                    
                                    if (queue) {
                                        setTimeout(async () => {
                                            try {
                                                if (oldState.channel.joinable) {
                                                    Logger.debug(`Attempting to reconnect to ${oldState.channel.name}`);
                                                    await queue.connect(oldState.channel);
                                                    Logger.debug('Reconnected to voice channel');
                                                }
                                            } catch (error) {
                                                Logger.error(`Error reconnecting to voice channel: ${error}`);
                                            }
                                        }, 1000);
                                    }
                                } catch (error) {
                                    Logger.error(`Error in voice state reconnect handler: ${error}`);
                                }
                            }
                        }
                    };
                    
                    this.client.on('voiceStateUpdate', voiceStateHandler);
                    this._patchedVoiceStateUpdateHandlers = this._patchedVoiceStateUpdateHandlers || [];
                    this._patchedVoiceStateUpdateHandlers.push(voiceStateHandler);
                    
                    Logger.debug('Voice state update handler patched');
                }
            } catch (error) {
                Logger.error(`Failed to patch voice state handler: ${error}`);
            }
        } catch (error) {
            Logger.error(`Error applying voice connection patches: ${error}`);
        }
    }

    async saveNowPlayingMessage(guildId, messageId, channelId, queue = null) {
        try {
            if (!guildId || !messageId || !channelId) return;
            
            const existingQueue = await MusicQueue.findOne({ guildId });
            
            if (existingQueue) {
                existingQueue.nowPlayingMessageId = messageId;
                existingQueue.nowPlayingChannelId = channelId;
                existingQueue.updatedAt = new Date();
                await existingQueue.save();
            } else {
                await MusicQueue.create({
                    guildId,
                    nowPlayingMessageId: messageId,
                    nowPlayingChannelId: channelId,
                    textChannelId: channelId,
                    updatedAt: new Date()
                });
            }
            
            Logger.debug(`Saved nowPlaying message to MongoDB: ${messageId} in guild ${guildId}`);
        } catch (error) {
            Logger.error(`Error saving nowPlaying message to MongoDB: ${error}`);
        }
    }

    async createNowPlayingCanvas(queue, track) {
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
            const currentTrack = queue.currentTrack;
            
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
        
        let displayTitle = track.title || 'Unknown Track';
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
        ctx.fillText(track.author || 'Unknown Artist', textX, textY + 25);
        
        ctx.beginPath();
        ctx.arc(progressX, progressY, progressRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = progressThickness;
        ctx.stroke();
        
        const startAngle = -Math.PI / 2; // Start from top
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

    setupConnectionPatching() {
        try {
            const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
            const { useQueue } = require('discord-player');
            const { Logger } = require('./logger');
            
            this._voiceStateUpdateHandlers = this._voiceStateUpdateHandlers || [];
            
            const guildJoinConfigs = new Map();
            
            if (!global.originalJoinVoiceChannel) {
                global.originalJoinVoiceChannel = joinVoiceChannel;
            }
            
            global.joinVoiceChannel = function(config) {
                if (config && config.guildId) {
                    guildJoinConfigs.set(config.guildId, config);
                }
                
                return global.originalJoinVoiceChannel(config);
            };
            
            if (this._voiceStateUpdateHandlers.length > 0) {
                this._voiceStateUpdateHandlers.forEach(handler => {
                    if (this.client && handler) {
                        this.client.off('voiceStateUpdate', handler);
                    }
                });
                this._voiceStateUpdateHandlers = [];
            }
            
            const voiceStateHandler = (oldState, newState) => {
                if (oldState.member.id !== this.client.user.id) return;

                if (oldState.channel && !newState.channel) {
                    const queue = useQueue(oldState.guild.id);
                    if (!queue) return;

                    const leaveOnEmpty = queue.node.options?.leaveOnEmpty !== false;
                    const leaveOnEnd = queue.node.options?.leaveOnEnd !== false;

                    if ((!leaveOnEmpty || !leaveOnEnd) && (queue.isPlaying() || queue.tracks.data.length > 0)) {
                        const config = guildJoinConfigs.get(oldState.guild.id);
                        if (config) {
                            setTimeout(() => {
                                try {
                                    global.joinVoiceChannel(config);
                                    Logger.debug(`Reconnected to voice channel in guild ${oldState.guild.id} after disconnect`);
                                } catch (err) {
                                    Logger.error(`Failed to reconnect after voice state update: ${err.message}`);
                                }
                            }, 5000);
                        }
                    }
                }
            };
            
            this.client.on('voiceStateUpdate', voiceStateHandler);
            this._voiceStateUpdateHandlers.push(voiceStateHandler);
            
            Logger.debug("Voice connection patching applied successfully");
        } catch (error) {
            Logger.error(`Failed to setup connection patching: ${error.message}`);
        }
    }

    patchNewConnection(connection) {
        try {
            if (!connection || connection._customPatched) return;
            
            connection._customPatched = true;
            
            if (global.connectionsPatcher && typeof global.connectionsPatcher.patchConnection === 'function') {
                Logger.debug('Using global patcher to patch voice connection');
                if (connection.voiceConnection) {
                    global.connectionsPatcher.patchConnection(connection.voiceConnection);
                }
            }
            
            if (connection.disconnect && typeof connection.disconnect === 'function') {
                if (!connection._originalDisconnect) {
                    connection._originalDisconnect = connection.disconnect;
                    
                    connection.disconnect = () => {
                        const leaveOnEmpty = global.config.Music?.LeaveOnEmpty === true;
                        const leaveOnEnd = global.config.Music?.LeaveOnEnd === true;
                        
                        Logger.debug(`Connection disconnect attempted: LeaveOnEmpty=${leaveOnEmpty}, LeaveOnEnd=${leaveOnEnd}`);
                        
                        if (!leaveOnEmpty && !leaveOnEnd) {
                            Logger.debug('Blocking voice disconnect per config settings');
                            return null;
                        }
                        
                        return connection._originalDisconnect();
                    };
                    
                    Logger.debug('Successfully patched connection disconnect method');
                }
            }
        } catch (error) {
            Logger.error(`Error patching new connection: ${error}`);
        }
    }

    /**
     * Handle a button interaction for music controls
     * @param {ButtonInteraction} interaction The Discord.js button interaction
     * @returns {Promise<void>}
     */
    async handleButtonInteraction(interaction) {
        try {
            Logger.debug(`MusicManager handling button interaction: ${interaction.customId}`);
            
            const buttonAction = interaction.customId.split('_')[1];
            
            if (buttonAction === 'play') {
                return this.handlePlayButton(interaction);
            }
            
            const queue = this.player.nodes.get(interaction.guildId);
            
            if (!queue || !queue.connection) {
                return await interaction.followUp({
                    content: '❌ There is no active music queue.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            switch (buttonAction) {
                case 'playpause':
                    await this.handlePlayPauseButton(interaction, queue);
                    break;
                case 'skip':
                    await this.handleSkipButton(interaction, queue);
                    break;
                case 'previous':
                    await this.handlePreviousButton(interaction, queue);
                    break;
                case 'stop':
                    await this.handleStopButton(interaction, queue);
                    break;
                case 'loop':
                    await this.handleLoopButton(interaction, queue);
                    break;
                case 'shuffle':
                    await this.handleShuffleButton(interaction, queue);
                    break;
                case 'volume':
                    try {
                        
                        const volumeRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('music_volumedown')
                                .setEmoji('🔉')
                                .setLabel('-10%')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId('music_volumeup')
                                .setEmoji('🔊')
                                .setLabel('+10%')
                                .setStyle(ButtonStyle.Secondary)
                        );
                        
                        await interaction.followUp({
                            content: `🔊 Current volume: **${queue.node.volume}%**\nUse the buttons below to adjust:`,
                            components: [volumeRow],
                            flags: MessageFlags.Ephemeral
                        });
                    } catch (error) {
                        Logger.error(`Error showing volume controls: ${error.stack || error}`);
                    }
                    break;
                case 'volumeup':
                    await this.handleVolumeUpButton(interaction, queue);
                    break;
                case 'volumedown':
                    await this.handleVolumeDownButton(interaction, queue);
                    break;
                default:
                    await interaction.followUp({
                        content: '❌ Unknown music button action.',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            Logger.error(`Error handling music button interaction: ${error.stack || error}`);
            
            try {
                if (interaction.deferred || interaction.replied) {
                    return interaction.followUp({
                        content: `❌ Error performing music action: ${error.message}`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                } else {
                    return interaction.reply({
                        content: `❌ Error performing music action: ${error.message}`,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }
            } catch (finalError) {
                Logger.error(`Failed to send final error message: ${finalError}`);
            }
        }
    }

    /**
     * Handle play modal button
     */
    async handlePlayButton(interaction) {
        try {
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    content: '❌ You need to be in a voice channel to play music.',
                    flags: MessageFlags.Ephemeral
                });
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
            
            await interaction.showModal(modal);
        } catch (error) {
            Logger.error(`Error showing play music modal: ${error.stack || error}`);
            if (!interaction.replied) {
                await interaction.reply({
                    content: `❌ Failed to open play dialog: ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }

    /**
     * Handle play/pause button
     */
    async handlePlayPauseButton(interaction, queue) {
        try {
            if (queue.node.isPaused()) {
                queue.node.resume();
                await interaction.followUp({
                    content: '▶️ Resumed playback.',
                    flags: MessageFlags.Ephemeral
                });
            } else {
                queue.node.pause();
                await interaction.followUp({
                    content: '⏸️ Paused playback.',
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (error) {
            Logger.error(`Error toggling playback: ${error.stack || error}`);
            await interaction.followUp({
                content: `❌ Failed to toggle playback: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    /**
     * Handle skip button
     */
    async handleSkipButton(interaction, queue) {
        try {
            if (!queue.isPlaying()) {
                return await interaction.followUp({
                    content: '❌ Nothing is currently playing.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const currentTrack = queue.currentTrack;
            
            await queue.node.skip();
            
            return await interaction.followUp({
                content: `⏭️ Skipped **${currentTrack?.title || 'current track'}**`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            Logger.error(`Error skipping track: ${error.stack || error}`);
            await interaction.followUp({
                content: `❌ Failed to skip track: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    /**
     * Handle previous button
     */
    async handlePreviousButton(interaction, queue) {
        try {
            if (!queue.isPlaying()) {
                return await interaction.followUp({
                    content: '❌ Nothing is currently playing.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (!queue.history || !queue.history.previousTrack) {
                return await interaction.followUp({
                    content: '❌ There is no previous track in the history.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const previousTrackTitle = queue.history.previousTrack?.title || 'previous track';
            
            await queue.history.back();
            
            return await interaction.followUp({
                content: `⏮️ Going back to **${previousTrackTitle}**`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            Logger.error(`Error going to previous track: ${error.stack || error}`);
            await interaction.followUp({
                content: `❌ Failed to go to previous track: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    /**
     * Handle stop button
     */
    async handleStopButton(interaction, queue) {
        try {
            const hasMoreTracks = queue.tracks.size > 0;
            
            const channel = interaction.channel;
            
            if (queue.metadata?.nowPlayingMessages?.length > 0 && channel) {
                try {
                    const messageId = queue.metadata.nowPlayingMessages[queue.metadata.nowPlayingMessages.length - 1];
                    const message = await channel.messages.fetch(messageId).catch(() => null);
                    
                    if (message && !hasMoreTracks) {
                        Logger.debug('Updating Now Playing canvas to show nothing playing');
                        
                        const emptyCanvas = await this.createEmptyNowPlayingCanvas();
                        
                        const tempDir = path.join(__dirname, '../temp');
                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir, { recursive: true });
                        }
                        const tempFile = path.join(tempDir, `np_empty_${Date.now()}.png`);
                        fs.writeFileSync(tempFile, emptyCanvas.toBuffer());
                        
                        const emptyEmbed = new EmbedBuilder()
                            .setColor(parseInt((this.config.EmbedColor || '#FF69B4').replace('#', ''), 16))
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
                        
                        setTimeout(() => {
                            try {
                                fs.unlinkSync(tempFile);
                            } catch (error) {
                            }
                        }, 5000);
                    }
                } catch (error) {
                    Logger.debug(`Could not update Now Playing message after stopping current track: ${error}`);
                }
            }
            
            queue.delete();

            await interaction.followUp({
                content: '⏹️ Stopped playback and cleared the queue.',
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            Logger.error(`Error stopping playback: ${error.stack || error}`);
            await interaction.followUp({
                content: `❌ Failed to stop playback: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    /**
     * Handle loop button
     */
    async handleLoopButton(interaction, queue) {
        try {
            const { QueueRepeatMode } = require('discord-player');
            const currentMode = queue.repeatMode;
            
            let newMode;
            let modeText;
            
            if (currentMode === QueueRepeatMode.OFF) {
                newMode = QueueRepeatMode.TRACK;
                modeText = 'Repeating current track';
            } else if (currentMode === QueueRepeatMode.TRACK) {
                newMode = QueueRepeatMode.QUEUE;
                modeText = 'Repeating entire queue';
            } else {
                newMode = QueueRepeatMode.OFF;
                modeText = 'Loop mode disabled';
            }

            queue.setRepeatMode(newMode);

            return await interaction.followUp({
                content: `🔄 ${modeText}`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            Logger.error(`Error setting loop mode: ${error.stack || error}`);
            await interaction.followUp({
                content: `❌ Failed to set loop mode: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleShuffleButton(interaction, queue) {
        try {
            if (queue.tracks.size === 0) {
                return await interaction.followUp({
                    content: '❌ There are no tracks in the queue to shuffle.',
                    flags: MessageFlags.Ephemeral
                });
            }

            queue.tracks.shuffle();
            
            return await interaction.followUp({
                content: `🔀 Shuffled the queue (${queue.tracks.size} tracks)`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            Logger.error(`Error shuffling queue: ${error.stack || error}`);
            await interaction.followUp({
                content: `❌ Failed to shuffle queue: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handlePlayModalSubmit(interaction) {
        try {
            const query = interaction.fields.getTextInputValue('song_query');
            Logger.debug(`Modal submitted with query: ${query}`);

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
                searchResult = await this.player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: 'youtube'
                });

                if (!searchResult?.tracks?.length) {
                    Logger.debug('No YouTube results, trying SoundCloud...');
                    searchResult = await this.player.search(query, {
                        requestedBy: interaction.user,
                        searchEngine: 'soundcloud'
                    });
                }

                if (!searchResult?.tracks?.length) {
                    Logger.debug('No SoundCloud results, trying generic search...');
                    searchResult = await this.player.search(query, {
                        requestedBy: interaction.user
                    });
                }

                if (!searchResult || !searchResult.tracks.length) {
                    return interaction.editReply(`❌ No results found for: ${query}!`);
                }

                Logger.debug(`Search results: ${searchResult?.tracks?.length || 0} tracks found`);
                const result = await this.play(memberVC, searchResult, interaction, true, { playTop: false, skipCurrent: false });
                
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
    }

    async handleQueueNavigation(interaction, queue, action) {
        try {
            await interaction.deferUpdate();

            let currentPage = 1;
            
            if (interaction.message.embeds[0] && interaction.message.embeds[0].footer) {
                const footerText = interaction.message.embeds[0].footer.text;
                const pageMatch = footerText.match(/Page (\d+)\/(\d+)/);
                
                if (pageMatch) {
                    currentPage = parseInt(pageMatch[1]);
                    const totalPages = parseInt(pageMatch[2]);
                    
                    if (action === 'prev') {
                        currentPage = Math.max(1, currentPage - 1);
                    } else if (action === 'next') {
                        currentPage = Math.min(totalPages, currentPage + 1);
                    }
                }
            }

            await this.displayQueuePage(interaction, queue, currentPage);
        } catch (error) {
            Logger.error(`Error in handleQueueNavigation: ${error.stack || error}`);
            await interaction.followUp({
                content: `❌ Failed to navigate queue: ${error.message}`,
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        }
    }

    async displayQueuePage(interaction, queue, page) {
        try {
            const tracksPerPage = 10;
            const tracks = queue.tracks.toArray();
            const totalPages = Math.max(Math.ceil(tracks.length / tracksPerPage), 1);

            const validPage = Math.min(Math.max(page, 1), totalPages);

            const startIndex = (validPage - 1) * tracksPerPage;
            const endIndex = Math.min(startIndex + tracksPerPage, tracks.length);

            const currentTrack = queue.currentTrack;
            let currentTrackInfo = '';
            
            if (currentTrack) {
                let progressBar = '';
                if (global.config.Music.ShowProgressBar) {
                    const timestamp = queue.node.getTimestamp();
                    if (timestamp) {
                        progressBar = this.createProgressBar(
                            timestamp.current.value,
                            timestamp.total.value,
                            global.config.Music.ProgressBarLength || 15,
                            global.config.Music.ProgressBarFilledChar || '▰',
                            global.config.Music.ProgressBarEmptyChar || '▱'
                        );
                        progressBar = `\n${progressBar} \`${timestamp.current.label}/${timestamp.total.label}\``;
                    }
                }
                
                const requestedBy = currentTrack.requestedBy?.id ? `<@${currentTrack.requestedBy.id}>` : 'Unknown';
                
                currentTrackInfo = [
                    `### Now Playing`,
                    `**[${currentTrack.title}](${currentTrack.url})**`,
                    `By: ${currentTrack.author} • Requested by: ${requestedBy}`,
                    progressBar
                ].join('\n');
            }

            let trackList;
            if (tracks.length === 0) {
                trackList = '*The queue is empty*';
            } else {
                trackList = tracks.slice(startIndex, endIndex).map((track, index) => {
                    const requestedBy = track.requestedBy?.id ? `<@${track.requestedBy.id}>` : 'Unknown';
                    return `**${startIndex + index + 1}.** [${track.title}](${track.url}) • \`${track.duration}\` • ${requestedBy}`;
                }).join('\n\n');
            }

            let totalDuration = 0;
            tracks.forEach(track => {
                if (track.durationMS) {
                    totalDuration += track.durationMS;
                }
            });

            const hours = Math.floor(totalDuration / 3600000);
            const minutes = Math.floor((totalDuration % 3600000) / 60000);
            const formattedTotalDuration = hours > 0 
                ? `${hours}h ${minutes}m` 
                : `${minutes}m`;

            const embed = new EmbedBuilder()
                .setTitle(`🎵 Music Queue - ${interaction.guild.name}`)
                .setColor(parseInt(global.config.Music.EmbedColor?.replace('#', '') || '5865F2', 16))
                .setDescription(`${currentTrackInfo}\n\n### Up Next ${tracks.length > 0 ? `(${tracks.length} tracks)` : ''}\n${trackList}`)
                .setFooter({ 
                    text: tracks.length > 0
                        ? `Page ${validPage}/${totalPages} • Total duration: ${formattedTotalDuration}`
                        : `No tracks in queue` 
                })
                .setTimestamp();

            const components = [];
            if (totalPages > 1) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('queue_prev')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(validPage === 1),
                    new ButtonBuilder()
                        .setCustomId('queue_next')
                        .setEmoji('➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(validPage === totalPages),
                    new ButtonBuilder()
                        .setCustomId('queue_refresh')
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Secondary)
                );
                components.push(row);
            }

            await interaction.editReply({
                embeds: [embed],
                components: components
            });
        } catch (error) {
            Logger.error(`Error in displayQueuePage: ${error}`);
            throw error;
        }
    }

    createProgressBar(current, total, length = 15, filledChar = '▰', emptyChar = '▱') {
        if (!total || total === 0) return emptyChar.repeat(length);
        
        const progress = Math.min(Math.max(current / total, 0), 1);
        const filledLength = Math.round(length * progress);
        const emptyLength = length - filledLength;
        
        return filledChar.repeat(filledLength) + emptyChar.repeat(emptyLength);
    }

    async handleVolumeUpButton(interaction, queue) {
        try {
            const currentVolume = queue.node.volume;

            const newVolume = Math.min(currentVolume + 10, 100);

            queue.node.setVolume(newVolume);
            
            return await interaction.followUp({
                content: `🔊 Volume increased to ${newVolume}%`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            Logger.error(`Error increasing volume: ${error.stack || error}`);
            try {
                await interaction.followUp({
                    content: `❌ Failed to increase volume: ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (followUpError) {
                Logger.error(`Failed to send follow-up message: ${followUpError}`);
            }
        }
    }

    async handleVolumeDownButton(interaction, queue) {
        try {
            const currentVolume = queue.node.volume;

            const newVolume = Math.max(currentVolume - 10, 0);

            queue.node.setVolume(newVolume);
            
            return await interaction.followUp({
                content: `🔉 Volume decreased to ${newVolume}%`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            Logger.error(`Error decreasing volume: ${error.stack || error}`);
            try {
                await interaction.followUp({
                    content: `❌ Failed to decrease volume: ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (followUpError) {
                Logger.error(`Failed to send follow-up message: ${followUpError}`);
            }
        }
    }

    cleanupEventListeners() {
        try {
            if (this._voiceStateUpdateHandlers && this._voiceStateUpdateHandlers.length > 0) {
                this._voiceStateUpdateHandlers.forEach(handler => {
                    if (this.client && handler) {
                        this.client.off('voiceStateUpdate', handler);
                    }
                });
                this._voiceStateUpdateHandlers = [];
            }
            
            if (this._patchedVoiceStateUpdateHandlers && this._patchedVoiceStateUpdateHandlers.length > 0) {
                this._patchedVoiceStateUpdateHandlers.forEach(handler => {
                    if (this.client && handler) {
                        this.client.off('voiceStateUpdate', handler);
                    }
                });
                this._patchedVoiceStateUpdateHandlers = [];
            }
        } catch (error) {
            console.error('Error cleaning up event listeners:', error);
        }
    }
}

function getMusicManager(client = null) {
    if (_instance) {
        return _instance;
    }

    if (client) {
        _instance = new MusicManager(client);
        return _instance;
        }

    return null;
}

module.exports = { MusicManager, getMusicManager }; 