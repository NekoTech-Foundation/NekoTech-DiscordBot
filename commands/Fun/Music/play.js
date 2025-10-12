const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useMainPlayer } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music in a voice channel')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The song you want to play')
                .setRequired(true))
        .addBooleanOption(option => 
            option.setName('playtop')
                .setDescription('Add the track at the top of the queue')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('skip')
                .setDescription('Skip the current track to the new one')
                .setRequired(false)),

    async execute(interaction) {
        try {

            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({ 
                    content: '❌ | You must be in a voice channel to play music!',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const botVC = interaction.guild.members.me.voice.channel;
            if (botVC) {
                if (voiceChannel.id !== botVC.id) {
                    return interaction.reply({ 
                        content: '❌ | You must be in the same voice channel as the bot to play music!',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
            
            await interaction.deferReply();
            
            const player = useMainPlayer();
            if (!player) {
                console.error('[PLAY COMMAND] Player is not initialized');
                return interaction.editReply({ content: '❌ | Music player is not initialized!' });
            }

            const query = interaction.options.getString('query');
            if (!query) {
                console.error('[PLAY COMMAND] Query is undefined');
                return interaction.editReply({ content: '❌ | Please provide a song to play!' });
            }
            

            const playTop = interaction.options.getBoolean('playtop') || false;
            const skip = interaction.options.getBoolean('skip') || false;

            if (global.config.GuildID && interaction.guild.id !== global.config.GuildID) {
                return interaction.editReply({ content: '❌ | This bot is configured for a specific server only.' });
            }

            let searchResult;
            try {

                searchResult = await searchTrack(query, interaction.user);
                
                if (!searchResult || !searchResult.tracks.length) {
                    return interaction.editReply({ content: `❌ | No results found for: ${query}!` });
                }
                
            } catch (error) {
                console.error(`[PLAY COMMAND] Search error: ${error}`);
                return interaction.editReply({ content: `❌ | Error searching for tracks: ${error.message}` });
            }

            const queue = player.nodes.create(interaction.guild, {
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild.members.me,
                    guild: interaction.guild,
                    requestedBy: interaction.user
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
            
            try {
                if (!queue.connection) {
                    await queue.connect(voiceChannel);
                }
                
                let embed;
                
                if (searchResult.playlist) {
                    
                    if (playTop) {
                        for (let i = searchResult.tracks.length - 1; i >= 0; i--) {
                            queue.addTrack(searchResult.tracks[i]);
                        }
                    } else {
                        queue.addTrack(searchResult.tracks);
                    }
                    
                    embed = {
                        title: '🎵 | Added Playlist to Queue',
                        description: `**[${searchResult.playlist.title}](${searchResult.playlist.url})** with ${searchResult.tracks.length} tracks has been added to the queue.`,
                        color: 0x3498db
                    };
                } else {
                    const track = searchResult.tracks[0];
                    
                    if (playTop) {
                        queue.addTrack(track);
                    } else {
                        queue.addTrack(track);
                    }
                    
                    embed = {
                        title: '🎵 | Added to Queue',
                        description: `**[${track.title}](${track.url})** - ${track.author}`,
                        thumbnail: { url: track.thumbnail },
                        fields: [
                            { name: 'Duration', value: track.duration, inline: true },
                            { name: 'Requested By', value: `<@${interaction.user.id}>`, inline: true }
                        ],
                        color: 0x3498db
                    };
                }
                
                if (!queue.isPlaying()) {
                    await queue.node.play();
                } else if (skip) {
                    await queue.node.skip();
                }

                const content = searchResult.playlist 
                    ? `Playlist Queued` 
                    : `Song Queued`;
                
                const reply = await interaction.editReply({ content });

                if (global.config.Music?.AutoDeleteCommands) {
                    const deleteDelay = global.config.Music?.CommandDeleteDelay || 5000;
                    setTimeout(() => {
                        if (reply.deletable) {
                            reply.delete().catch(err => {
                                console.error(`[PLAY COMMAND] Error auto-deleting reply: ${err}`);
                            });
                        }
                    }, deleteDelay);
                }
                
                return reply;
            } catch (error) {
                console.error(`[PLAY COMMAND] Error in play command: ${error}`);
                player.nodes.delete(interaction.guild.id);
                return interaction.editReply({ content: `❌ | Error: ${error.message}` });
            }
        } catch (error) {
            console.error(`[PLAY COMMAND] Error executing play command: ${error}`);
            return interaction.editReply({ content: `❌ | An error occurred while executing this command: ${error.message}` });
        }
    }
};

async function searchTrack(query, user) {
    const player = useMainPlayer();
    if (!player) {
        console.error('[PLAY COMMAND] Player not available for search');
        throw new Error('Music player is not initialized');
    }

    let searchResult = await player.search(query, {
        requestedBy: user,
        searchEngine: 'youtube'
    });

    if (!searchResult?.tracks?.length) {
        searchResult = await player.search(query, {
            requestedBy: user,
            searchEngine: 'soundcloud'
        });
    }

    if (!searchResult?.tracks?.length) {
        searchResult = await player.search(query, {
            requestedBy: user
        });
    }
    
    return searchResult;
} 