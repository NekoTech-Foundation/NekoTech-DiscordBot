const { Events, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('./config');
const { getLang } = require('../../utils/configLoader');
const MusicPlayer = require('./MusicPlayer');

const PermissionManager = require('./PermissionManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        const client = interaction.client;
        const guild = interaction.guild;
        const member = interaction.member;

        // Special controls for search buttons
        if (interaction.customId.startsWith('search_')) {
            return await this.handleSearchInteraction(interaction, client);
        }

        // Language selection buttons
        if (interaction.customId.startsWith('language_')) {
            const languageCommand = require('../../commands/Music/language.js');
            return await languageCommand.handleLanguageButton(interaction);
        }

        // Help refresh button (doesn't require voice channel)
        if (interaction.customId === 'help_refresh') {
            return await this.handleHelpRefresh(interaction);
        }

        // Check if user is in a voice channel (for music controls)
        if (!member.voice.channel) {
            const lang = await getLang(guild?.id);
            return await interaction.reply({
                content: lang.Music.Errors.JoinError || "❌ You must be in a voice channel!",
                ephemeral: true
            });
        }

        // Get music player
        const player = client.players.get(guild.id);
        if (!player) {
            const lang = await getLang(guild?.id);
            return await interaction.reply({
                content: lang.Music.Errors.NoMusic || "❌ No music is playing!",
                ephemeral: true
            });
        }

        // Check if user is in the same voice channel as bot
        if (player.voiceChannel.id !== member.voice.channel.id) {
            const lang = await getLang(guild?.id);
            return await interaction.reply({
                content: lang.Music.Errors.JoinError || "❌ You must be in the same voice channel!",
                ephemeral: true
            });
        }

        try {
            // Parse custom ID for authorization and session validation
            const [buttonType, requesterId, sessionId] = interaction.customId.split(':');

            // Session validation
            if (sessionId && player.sessionId && sessionId !== player.sessionId) {
                return await interaction.reply({
                    content: "❌ Session expired or invalid.",
                    ephemeral: true
                });
            }

            // Handle public buttons first
            if (buttonType === 'music_queue') {
                return await this.handleQueue(interaction, player);
            }
            if (buttonType === 'music_lyrics') {
                return await this.handleLyrics(interaction, player);
            }

            // For all other buttons, check permissions
            const isAuthorized = await PermissionManager.check(interaction, player);
            if (!isAuthorized) {
                return; // PermissionManager already replied
            }

            // Defer update immediately for known music buttons to prevent 10062 timeout
            // BUT NOT for volume modal (needs showModal) or lyrics (needs deferReply)
            if (['music_pause', 'music_skip', 'music_stop', 'music_shuffle', 'music_loop', 'music_autoplay', 'music_queue', 'music_previous'].includes(buttonType)) {
                 if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferUpdate().catch(() => {});
                }
            }

            switch (buttonType) {
                case 'music_pause':
                    await this.handlePause(interaction, player, requesterId);
                    break;

                case 'music_skip':
                    await this.handleSkip(interaction, player, requesterId);
                    break;

                case 'music_stop':
                    await this.handleStop(interaction, player, client, requesterId);
                    break;

                case 'music_shuffle':
                    await this.handleShuffle(interaction, player, requesterId);
                    break;

                // Volume modal MUST NOT be deferred with deferUpdate, it needs showModal
                case 'music_volume':
                    await this.handleVolumeModal(interaction, player, requesterId);
                    break;

                case 'music_loop':
                    await this.handleLoop(interaction, player, requesterId);
                    break;

                case 'music_autoplay':
                    await this.handleAutoplay(interaction, player, requesterId);
                    break;

                default:
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.reply({
                            content: "Unknown button interaction",
                            ephemeral: true
                        });
                    }
            }
        } catch (error) {
            console.error('Button handler error:', error);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: "❌ An error occurred while processing the button.",
                        ephemeral: true
                    });
                } catch (replyError) {
                    // Ignore
                }
            }
        }
    },

    // Authorization control function
    isAuthorized(interaction, requesterId) {
        const member = interaction.member;


        // ManageGuild permission check (Sunucuyu Yönet)
        if (member.permissions.has('ManageGuild')) return true;

        const modRoleName = config.bot.modRoleName || 'Moderator';
        if (member.roles.cache.some(role => role.name.toLowerCase() === modRoleName.toLowerCase())) return true;

        // DJ role check (if exists)
        if (member.roles.cache.some(role => role.name.toLowerCase().includes('dj'))) return true;

        // Music starter check
        if (member.id === requesterId) return true;

        return false;
    },

    async handlePause(interaction, player) {
        // Defer handled in execute


        if (!player.currentTrack) {
             const lang = await getLang(interaction.guild?.id);
            return await interaction.followUp({
                content: lang.Music.Errors.NoMusic || "❌ No song playing",
                ephemeral: true
            });
        }

        let result;
        let message;
        let emoji;
        const lang = await getLang(interaction.guild?.id);

        if (player.paused) {
            result = player.resume();
            message = lang.Music.Control.Resumed;
            emoji = '▶️';
        } else {
            result = player.pause();
            message = lang.Music.Control.Paused;
            emoji = '⏸️';
        }

        if (result) {
            const embed = new EmbedBuilder()
                .setTitle(`${emoji} ${message}`)
                .setDescription(`**[${player.currentTrack.title}](${player.currentTrack.url})**`)
                .setColor(config.bot.embedColor)
                .setTimestamp()
                .addFields({
                    name: 'Action By',
                    value: `${interaction.member}`,
                    inline: true
                });

            if (player.currentTrack.thumbnail) {
                embed.setThumbnail(player.currentTrack.thumbnail);
            }

            await interaction.followUp({ embeds: [embed], ephemeral: true });

            // Ana embed'deki butonları güncelle (pause/resume değişimi)
            if (interaction.client.musicEmbedManager) {
                await interaction.client.musicEmbedManager.updateNowPlayingEmbed(player);
            }
        } else {
            await interaction.followUp({
                content: "❌ Operation failed.",
                ephemeral: true
            });
        }
    },

    async handleSkip(interaction, player) {
        // Defer handled in execute


        const lang = await getLang(interaction.guild?.id);

        if (!player.currentTrack) {
            return await interaction.followUp({
                content: lang.Music.Errors.NoMusic || "❌ No song playing",
                ephemeral: true
            });
        }

        // Sırada müzik yoksa atlanamaz
        if (player.queue.length === 0) {
            return await interaction.followUp({
                content: "❌ No more songs to skip to.",
                ephemeral: true
            });
        }

        const currentTrack = player.currentTrack;
        const skipped = player.skip();

        if (skipped) {
            const embed = new EmbedBuilder()
                .setTitle(lang.Music.Control.Skipped || "Skipped")
                .setDescription(`**[${currentTrack.title}](${currentTrack.url})** skipped!`)
                .setColor(config.bot.embedColor)
                .setTimestamp()
                .addFields({
                    name: 'Skipped By',
                    value: `${interaction.member}`,
                    inline: true
                });

            if (player.queue.length > 0) {
                embed.addFields({
                    name: 'Next Song',
                    value: `[${player.queue[0].title}](${player.queue[0].url})`,
                    inline: false
                });
                embed.setFooter({
                    text: `${player.queue.length} more songs in queue`
                });
            } else {
                embed.setFooter({
                    text: 'No more songs in queue'
                });
            }

            if (currentTrack.thumbnail) {
                embed.setThumbnail(currentTrack.thumbnail);
            }

            await interaction.followUp({ embeds: [embed], ephemeral: true });

            // Embed Manager ile ana embed'i güncelle
            if (interaction.client.musicEmbedManager && player.currentTrack) {
                await interaction.client.musicEmbedManager.updateNowPlayingEmbed(player);
            }
        } else {
            await interaction.followUp({
                content: "❌ Failed to skip song.",
                ephemeral: true
            });
        }
    },

    async handlePrevious(interaction, player) {
        // Defer handled in execute


        if (player.previousTracks.length === 0) {
            return await interaction.followUp({
                content: "❌ No previous song found.",
                ephemeral: true
            });
        }

        const result = player.previous();

        if (result) {
            await interaction.followUp({
                content: "⏮️ Moved to previous song.",
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: "❌ Failed to move to previous song.",
                ephemeral: true
            });
        }
    },

    async handleStop(interaction, player, client) {
        // Defer handled in execute


        const queueLength = player.queue.length;
        const currentTrack = player.currentTrack;

        player.stop();
        client.players.delete(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle("⏹️ Music Stopped")
            .setDescription(`${currentTrack ? `**[${currentTrack.title}](${currentTrack.url})**` : 'Music'} stopped!`)
            .setColor('#FF0000')
            .setTimestamp()
            .addFields({
                name: 'Stopped By',
                value: `${interaction.member}`,
                inline: true
            });

        if (queueLength > 0) {
            embed.setFooter({
                text: `${queueLength} songs cleared from queue`
            });
        }

        await interaction.followUp({ embeds: [embed], ephemeral: true });

        // Ana embed'deki butonları disable yap
        if (client.musicEmbedManager) {
            await client.musicEmbedManager.handlePlaybackEnd(player);
        }
    },

    async handleQueue(interaction, player) {
        // Defer handled in execute


        const queueInfo = player.getQueue();

        if (!queueInfo.current && queueInfo.queue.length === 0) {
            return await interaction.followUp({
                content: "❌ No songs in queue.",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("📋 Play Queue")
            .setColor(config.bot.embedColor)
            .setTimestamp();

        // Current track
        if (queueInfo.current) {
            const currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
            const progress = this.createProgressBar(currentTime, queueInfo.current.duration);

            embed.addFields({
                name: 'Now Playing',
                value: `**[${queueInfo.current.title}](${queueInfo.current.url})**\n${progress}`,
                inline: false
            });
        }

        // Queue tracks
        if (queueInfo.queue.length > 0) {
            let queueText = '';
            const tracks = queueInfo.queue.slice(0, 10); // Show first 10

            tracks.forEach((track, index) => {
                queueText += `\`${index + 1}.\` **[${track.title}](${track.url})**\n`;
            });

            if (queueInfo.queue.length > 10) {
                queueText += `\n*and ${queueInfo.queue.length - 10} more...*`;
            }

            embed.addFields({
                name: `Upcoming Songs (${queueInfo.queue.length})`,
                value: queueText,
                inline: false
            });
        }

        embed.setFooter({
            text: `Total Songs: ${queueInfo.queue.length + (queueInfo.current ? 1 : 0)}`
        });

        await interaction.followUp({ embeds: [embed], ephemeral: true });
    },

    async handleShuffle(interaction, player) {
         // Defer handled in execute

        
        const lang = await getLang(interaction.guild?.id);

        if (player.queue.length < 2) {
            return await interaction.followUp({
                content: lang.Music.Errors.NotEnoughSongs || "❌ Not enough songs to shuffle",
                ephemeral: true
            });
        }

        // Shuffle the queue
        player.shuffleQueue();

        const embed = new EmbedBuilder()
            .setTitle(lang.Music.Control.Shuffled || "Queue Shuffled")
            .setDescription(`Shuffled ${player.queue.length} songs!`)
            .setColor(config.bot.embedColor)
            .setTimestamp()
            .addFields({
                name: 'Shuffled By',
                value: `${interaction.member}`,
                inline: true
            });

        // Show first few shuffled tracks
        if (player.queue.length > 0) {
            const nextTracks = player.queue.slice(0, 3);
            let trackList = '';
            nextTracks.forEach((track, index) => {
                trackList += `${index + 1}. **[${track.title}](${track.url})**\n`;
            });

            embed.addFields({
                name: 'Next Songs',
                value: trackList,
                inline: false
            });
        }

        await interaction.followUp({ embeds: [embed], ephemeral: true });

        // Ana embed'i güncelle
        if (interaction.client.musicEmbedManager) {
            await interaction.client.musicEmbedManager.updateNowPlayingEmbed(player);
        }
    },

    async handleVolumeModal(interaction, player) {
        const lang = await getLang(interaction.guild?.id);

        const modal = new ModalBuilder()
            .setCustomId('volume_modal')
            .setTitle("Set Volume");

        const volumeInput = new TextInputBuilder()
            .setCustomId('volume_input')
            .setLabel("Volume (0-100)")
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(3)
            .setPlaceholder('50')
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(volumeInput);
        modal.addComponents(actionRow);

        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp({ 
                content: "❌ Cannot open volume modal because the interaction was already processed.", 
                ephemeral: true 
            });
        }
        
        try {
            await interaction.showModal(modal);
        } catch (error) {
            if (error.code !== 40060) { // Ignore "already acknowledged" errors if they still slip through
                throw error;
            }
        }
    },

    async handleLoop(interaction, player) {
         // Defer handled in execute


        const lang = await getLang(interaction.guild?.id);

        if (!player.currentTrack) {
            return await interaction.followUp({
                content: lang.Music.Errors.NoMusic || "❌ No song playing",
                ephemeral: true
            });
        }

        // Cycle through loop modes: false -> 'track' -> 'queue' -> false
        let newLoopMode;
        let modeMessage;
        let modeEmoji;

        if (player.loop === false || player.loop === 'off') {
            newLoopMode = 'track';
            modeMessage = "Looping currently playing track";
            modeEmoji = '🔂';
        } else if (player.loop === 'track') {
            newLoopMode = 'queue';
            modeMessage = "Looping entire queue";
            modeEmoji = '🔁';
        } else {
            newLoopMode = false;
            modeMessage = "Looping disabled";
            modeEmoji = '➡️';
        }

        // Update player loop mode
        player.loop = newLoopMode;

        const embed = new EmbedBuilder()
            .setTitle(`${modeEmoji} Loop Mode Changed`)
            .setDescription(modeMessage)
            .setColor(config.bot.embedColor)
            .setTimestamp()
            .addFields({
                name: 'Changed By',
                value: `${interaction.member}`,
                inline: true
            });

        if (player.currentTrack && player.currentTrack.thumbnail) {
            embed.setThumbnail(player.currentTrack.thumbnail);
        }

        await interaction.followUp({ embeds: [embed], ephemeral: true });

        // Update the main embed to reflect the new loop mode
        if (interaction.client.musicEmbedManager) {
            await interaction.client.musicEmbedManager.updateNowPlayingEmbed(player);
        }
    },

    async handleAutoplay(interaction, player) {
         // Defer handled in execute


        const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
        const lang = await getLang(interaction.guild?.id);

        // If autoplay is already enabled, turn it off
        if (player.autoplay) {
            player.autoplay = false;
            
            const embed = new EmbedBuilder()
                .setTitle(lang.Music.Autoplay.DisabledTitle || '🎲 Autoplay Disabled')
                .setDescription("Autoplay has been turned off.")
                .setColor(config.bot.embedColor)
                .setTimestamp();

            await interaction.followUp({ embeds: [embed], ephemeral: true });
            
            // Update the main embed
            if (interaction.client.musicEmbedManager) {
                await interaction.client.musicEmbedManager.updateNowPlayingEmbed(player);
            }
            return;
        }

        // Show genre selection menu
        const select = new StringSelectMenuBuilder()
            .setCustomId(`autoplay_genre:${interaction.user.id}:${player.sessionId}`) // Use interaction.user.id for requesterId
            .setPlaceholder("Select a genre for Autoplay")
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel("Pop").setValue('pop').setEmoji('🎤'),
                new StringSelectMenuOptionBuilder().setLabel("Rock").setValue('rock').setEmoji('🎸'),
                new StringSelectMenuOptionBuilder().setLabel("Hip-Hop").setValue('hiphop').setEmoji('🎧'),
                new StringSelectMenuOptionBuilder().setLabel("Electronic").setValue('electronic').setEmoji('🎛️'),
                new StringSelectMenuOptionBuilder().setLabel("Jazz").setValue('jazz').setEmoji('🎷'),
                new StringSelectMenuOptionBuilder().setLabel("Classical").setValue('classical').setEmoji('🎻'),
                new StringSelectMenuOptionBuilder().setLabel("Metal").setValue('metal').setEmoji('🤘'),
                new StringSelectMenuOptionBuilder().setLabel("Country").setValue('country').setEmoji('🤠'),
                new StringSelectMenuOptionBuilder().setLabel("R&B").setValue('rnb').setEmoji('💃'),
                new StringSelectMenuOptionBuilder().setLabel("Indie").setValue('indie').setEmoji('🌿'),
                new StringSelectMenuOptionBuilder().setLabel("Latin").setValue('latin').setEmoji('💃'),
                new StringSelectMenuOptionBuilder().setLabel("K-Pop").setValue('kpop').setEmoji('🇰🇷'),
                new StringSelectMenuOptionBuilder().setLabel("Anime").setValue('anime').setEmoji('🎌'),
                new StringSelectMenuOptionBuilder().setLabel("Lo-Fi").setValue('lofi').setEmoji('🌙'),
                new StringSelectMenuOptionBuilder().setLabel("Random").setValue('random').setEmoji('🎲')
            );

        const row = new ActionRowBuilder().addComponents(select);

        const embed = new EmbedBuilder()
            .setTitle('🎲 Select Autoplay Genre')
            .setDescription("To enable autoplay, please select a genre from the menu below.")
            .setColor(config.bot.embedColor);

        await interaction.followUp({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    },

    createProgressBar(current, total) {
        if (!total || total === 0) return '0:00 / 0:00';

        const currentSeconds = Math.floor(current / 1000);
        const totalSeconds = Math.floor(total);
        const progress = Math.floor((currentSeconds / totalSeconds) * 20);

        const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);

        return `${this.formatTime(currentSeconds)} [${'▓'.repeat(progress)}${'░'.repeat(20 - progress)}] ${this.formatTime(totalSeconds)}`;
    },

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    },

    async handleHelpRefresh(interaction) {
        try {
            // Defer the interaction to show loading state
            await interaction.deferUpdate();

            // Clear language cache to ensure fresh language data (optional with getLang, as it re-reads if needed or uses configLoader logic)
            // await LanguageManager.refreshServerLanguage(interaction.guild.id); // Removed

            // Get help command and recreate the embed with fresh data
            const guildId = interaction.guild.id;
            const client = interaction.client;
            
            const lang = await getLang(guildId);
            const t = lang.Help; // Using System Help keys

            const embed = new EmbedBuilder()
                .setTitle(t.UI.Title || "Help")
                .setDescription(t.UI.Desc.replace('{user}', interaction.user.username) || "Help")
                .setColor(config.bot.embedColor)
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp();

            // Statistics (Consolidate or simplified)
            let guilds, users, activeServers;

            if (client.shard) {
                // Sharding is enabled - fetch from all shards
                try {
                    const guildCounts = await client.shard.fetchClientValues('guilds.cache.size');
                    guilds = guildCounts.reduce((acc, count) => acc + count, 0);

                    const memberCounts = await client.shard.broadcastEval(c => 
                        c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
                    );
                    users = memberCounts.reduce((acc, count) => acc + count, 0);

                    const activePlayers = await client.shard.broadcastEval(c => c.players.size);
                    activeServers = activePlayers.reduce((acc, count) => acc + count, 0);
                } catch (error) {
                    console.error('Error fetching shard statistics:', error);
                    guilds = client.guilds.cache.size;
                    users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
                    activeServers = client.players.size;
                }
            } else {
                guilds = client.guilds.cache.size;
                users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
                activeServers = client.players.size;
            }

            const helpCommand = require('../commands/System/help.js'); // Updated path
            // Note: If keys are missing, we skip adding stats or use basic formatting
            
            // Add other fields if needed, simplifying for now to use main help structure if possible, 
            // but buttonHandler help refresh seems custom. 
            // We'll trust that the main help command handles the initial structure and this just refreshes stats/content?
            // Actually, if we just want to refresh the stats, we can just update the description/fields properly.
            
            // Re-using help command createEmbed logic would be better but for now let's just send a generic "Refreshed" or similar if complete logic is too complex to migrate inline.
            // But let's try to match the output.
            
            embed.addFields({
                name: "Statistics",
                value: `Servers: ${guilds}\nUsers: ${users}\nActive Players: ${activeServers}`,
                inline: true
            });

            embed.setFooter({
                text: `${client.user.username}`,
                iconURL: client.user.displayAvatarURL()
            });

            // Buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel("Website")
                        .setURL(config.bot.website)
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setLabel("Support")
                        .setURL(config.bot.supportServer)
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setCustomId('help_refresh')
                        .setLabel("Refresh")
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('Error refreshing help:', error);
            // Ignore reply errors
        }
    },

    async handleSearchInteraction(interaction, client) {
        const member = interaction.member;
        const guild = interaction.guild;
        const lang = await getLang(guild?.id);

        // Check if user is in a voice channel
        if (!member.voice.channel) {
            return await interaction.reply({
                content: lang.Music.Errors.JoinError || "❌ Join a voice channel first!",
                flags: [1 << 6]
            });
        }

        // Check search results
        if (!global.searchResults || !global.searchResults.has(interaction.user.id)) {
            return await interaction.reply({
                content: "❌ Search expired.",
                flags: [1 << 6]
            });
        }

        const userSearchData = global.searchResults.get(interaction.user.id);

        if (interaction.customId === 'search_cancel') {
            global.searchResults.delete(interaction.user.id);

            const embed = new EmbedBuilder()
                .setTitle("Search Cancelled")
                .setDescription("Search has been cancelled.")
                .setColor('#FF0000')
                .setTimestamp();

            return await interaction.update({
                embeds: [embed],
                components: []
            });
        }

        // Get selected song index
        const selectedIndex = parseInt(interaction.customId.replace('search_select_', ''));
        const selectedTrack = userSearchData.results[selectedIndex];

        if (!selectedTrack) {
            return await interaction.reply({
                content: "❌ Invalid selection.",
                flags: [1 << 6]
            });
        }


        // Işlem mesajı göster
        const processingEmbed = new EmbedBuilder()
            .setTitle('🔄 Processing...')
            .setDescription(`Adding **${selectedTrack.title}** to the queue...`)
            .setColor('#FFAA00')
            .setTimestamp();

        await interaction.editReply({
            embeds: [processingEmbed],
            components: []
        });

        try {
            // Embed Manager ile işle
            const MusicEmbedManager = require('./MusicEmbedManager');
            if (!client.musicEmbedManager) {
                client.musicEmbedManager = new MusicEmbedManager(client);
            }

            // Ensure music player exists and is configured
            if (!client.players) {
                client.players = new Map();
            }

            let player = client.players.get(guild.id);
            if (!player) {
                player = new MusicPlayer(guild, interaction.channel, member.voice.channel);
                client.players.set(guild.id, player);
            }

            player.voiceChannel = member.voice.channel;
            player.textChannel = interaction.channel;

            // Seçilen şarkıyı işle
            const result = await client.musicEmbedManager.handleMusicData(
                guild.id,
                {
                    isPlaylist: false,
                    tracks: [selectedTrack]
                },
                member,
                interaction
            );

            // Search results temizle
            global.searchResults.delete(interaction.user.id);

            if (!result.success) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Error')
                    .setDescription(result.message)
                    .setColor('#FF0000')
                    .setTimestamp();

                return await interaction.editReply({
                    embeds: [errorEmbed],
                    components: []
                });
            }

        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription("An error occurred while processing.")
                .setColor('#FF0000')
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
                components: []
            });
        }
    },

    async handleLyrics(interaction, player) {
        const LyricsManager = require('./LyricsManager');
        const guildId = interaction.guild?.id;
        const lang = await getLang(guildId);

        try {
            // Immediately defer reply to prevent "Unknown Interaction"
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }

             if (!player.currentTrack) {
                return await interaction.editReply({
                    content: lang.Music.Errors.NoMusic || "❌ No song playing"
                });
            }

            if (!player.hasLyrics || !player.hasLyrics()) {
                const noLyricsMsg = "No lyrics found for this song.";
                return await interaction.editReply({
                    content: `🎤 ${noLyricsMsg}`
                });
            }

            // Already deferred at start

            const lyricsData = player.currentLyrics;
            const pages = LyricsManager.formatFullLyrics(lyricsData, 4000);

            if (pages.length === 0) {
                return await interaction.editReply({
                    content: "Lyrics are unavailable."
                });
            }

            const lyricsTitle = "Song Lyrics";
            
            // If only one page, send directly
            if (pages.length === 1) {
                const embed = new EmbedBuilder()
                    .setTitle(`🎤 ${lyricsTitle}`)
                    .setDescription(`**${player.currentTrack.title}**\n${player.currentTrack.artist ? `*by ${player.currentTrack.artist}*\n` : ''}\n${pages[0]}`)
                    .setColor(config.bot.embedColor)
                    .setFooter({ text: `Source: ${lyricsData.source}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            // Multiple pages - send with pagination buttons
            let currentPage = 0;

            const createLyricsEmbed = (pageIndex) => {
                return new EmbedBuilder()
                    .setTitle(`🎤 ${lyricsTitle}`)
                    .setDescription(`**${player.currentTrack.title}**\n${player.currentTrack.artist ? `*by ${player.currentTrack.artist}*\n` : ''}\n${pages[pageIndex]}`)
                    .setColor(config.bot.embedColor)
                    .setFooter({ text: `Source: ${lyricsData.source} | Page ${pageIndex + 1}/${pages.length}` })
                    .setTimestamp();
            };

            const createPaginationButtons = (pageIndex) => {
                const prevButton = new ButtonBuilder()
                    .setCustomId('lyrics_prev')
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIndex === 0);

                const nextButton = new ButtonBuilder()
                    .setCustomId('lyrics_next')
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIndex === pages.length - 1);
                return new ActionRowBuilder().addComponents(prevButton, nextButton);
            };

            await interaction.editReply({
                embeds: [createLyricsEmbed(currentPage)],
                components: [createPaginationButtons(currentPage)]
            });

            // Fetch the reply message for the collector
            const message = await interaction.fetchReply();

            // Collector for pagination
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000 // 5 minutes
            });

            // ... (rest of collector logic unchanged as it doesn't use LanguageManager)
            // Wait, the collector logic IS inside this function and I'm replacing the whole function block
            // So I need to include the collector logic in the ReplacementContent
            
             collector.on('collect', async i => {
                try {
                    // Log to see what's happening
                    console.log('🔍 Button clicked:', i.customId, 'by', i.user.tag);
                    console.log('🔍 Current page:', currentPage, 'Total pages:', pages.length);

                    if (i.customId === 'lyrics_prev' && currentPage > 0) {
                        currentPage--;
                    } else if (i.customId === 'lyrics_next' && currentPage < pages.length - 1) {
                        currentPage++;
                    }

                    console.log('🔍 New page:', currentPage);

                    // Try deferUpdate first, then update
                    if (!i.deferred && !i.replied) {
                        await i.deferUpdate();
                    }

                    await message.edit({
                        embeds: [createLyricsEmbed(currentPage)],
                        components: [createPaginationButtons(currentPage)]
                    });

                } catch (error) {
                    console.error('❌ Pagination error details:', {
                        code: error.code,
                        message: error.message,
                        deferred: i.deferred,
                        replied: i.replied
                    });
                    
                    // Ignore interaction timeout/unknown interaction errors
                    if (error.code === 10062 || error.code === 10008 || error.code === 40060) {
                        console.log('ℹ️ Interaction expired or unknown, ignoring...');
                    }
                }
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('❌ Lyrics handler error:', error);
            const errorMsg = "Failed to load lyrics.";
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
        }
    }
};
