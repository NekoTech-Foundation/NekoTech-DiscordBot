const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const MusicPlayer = require('../../utils/Music/MusicPlayer');
const MusicEmbedManager = require('../../utils/Music/MusicEmbedManager');
const { getLang, getConfig } = require('../../utils/configLoader');
const config = getConfig();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Music System')
        .setDescriptionLocalizations({
            'vi': 'Hệ thống âm nhạc',
            'ja': '音楽システム'
        })
        .addSubcommand(sub => 
            sub.setName('play')
                .setDescription('Play music from YouTube/Spotify/SoundCloud')
                .setDescriptionLocalizations({
                    'vi': 'Phát nhạc từ YouTube, Spotify, SoundCloud',
                    'ja': 'YouTube/Spotify/SoundCloudから音楽を再生'
                })
                .addStringOption(opt => 
                    opt.setName('query')
                        .setDescription('Song name, Artist, or URL')
                        .setDescriptionLocalizations({
                            'vi': 'Tên bài hát, Nghệ sĩ hoặc Link',
                            'ja': '曲名、アーティスト、またはURL'
                        })
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('search')
                .setDescription('Search and select music')
                .setDescriptionLocalizations({
                    'vi': 'Tìm kiếm và chọn nhạc',
                    'ja': '音楽を検索して選択'
                })
                .addStringOption(opt =>
                    opt.setName('query')
                        .setDescription('Search query')
                        .setDescriptionLocalizations({
                            'vi': 'Từ khóa tìm kiếm',
                            'ja': '検索クエリ'
                        })
                        .setRequired(true)
                )
        )
        .addSubcommand(sub => 
            sub.setName('skip')
                .setDescription('Skip current song')
                .setDescriptionLocalizations({
                    'vi': 'Bỏ qua bài hát hiện tại',
                    'ja': '現在の曲をスキップ'
                })
        )
        .addSubcommand(sub => 
            sub.setName('stop')
                .setDescription('Stop playing and clear queue')
                .setDescriptionLocalizations({
                    'vi': 'Dừng phát và xóa hàng đợi',
                    'ja': '再生を停止してキューをクリア'
                })
        )
        .addSubcommand(sub => 
            sub.setName('pause')
                .setDescription('Pause playback')
                .setDescriptionLocalizations({
                    'vi': 'Tạm dừng phát nhạc',
                    'ja': '一時停止'
                })
        )
        .addSubcommand(sub => 
            sub.setName('resume')
                .setDescription('Resume playback')
                .setDescriptionLocalizations({
                    'vi': 'Tiếp tục phát nhạc',
                    'ja': '再生を再開'
                })
        )
        .addSubcommand(sub => 
            sub.setName('queue')
                .setDescription('Show current queue')
                .setDescriptionLocalizations({
                    'vi': 'Hiển thị hàng đợi',
                    'ja': '現在のキューを表示'
                })
        )
        .addSubcommand(sub => 
            sub.setName('volume')
                .setDescription('Change volume')
                .setDescriptionLocalizations({
                    'vi': 'Điều chỉnh âm lượng',
                    'ja': '音量を変更'
                })
                .addIntegerOption(opt =>
                    opt.setName('amount')
                        .setDescription('Volume % (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
        )
        .addSubcommand(sub => 
            sub.setName('loop')
                .setDescription('Set loop mode')
                .setDescriptionLocalizations({
                    'vi': 'Chỉnh chế độ lặp',
                    'ja': 'ループモード設定'
                })
                .addStringOption(opt =>
                    opt.setName('mode')
                        .setDescription('Loop mode')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Off', value: 'off' },
                            { name: 'Track', value: 'track' },
                            { name: 'Queue', value: 'queue' }
                        )
                )
        )
        .addSubcommand(sub => 
            sub.setName('shuffle')
                .setDescription('Shuffle the queue')
                .setDescriptionLocalizations({
                    'vi': 'Trộn hàng đợi',
                    'ja': 'キューをシャッフル'
                })
        )
        .addSubcommand(sub => 
            sub.setName('nowplaying')
                .setDescription('Show current song info')
                .setDescriptionLocalizations({
                    'vi': 'Xem thông tin bài hát hiện tại',
                    'ja': '現在再生中の曲情報を表示'
                })
        )
        .addSubcommand(sub => 
            sub.setName('autoplay')
                .setDescription('Toggle autoplay')
                .setDescriptionLocalizations({
                    'vi': 'Bật/Tắt tự động phát',
                    'ja': '自動再生の切り替え'
                })
        )
        .addSubcommand(sub =>
            sub.setName('lyrics')
                .setDescription('Get song lyrics')
                .setDescriptionLocalizations({
                    'vi': 'Xem lời bài hát',
                    'ja': '歌詞を表示'
                })
                .addStringOption(opt =>
                    opt.setName('query')
                        .setDescription('Song name (optional)')
                )
        ),
    category: 'Music',

    async execute(interaction, lang) {
        // lang passed from handler
        const client = interaction.client;
        const lM = lang.Music;
        const subcommand = interaction.options.getSubcommand();
        const member = interaction.member;
        const guild = interaction.guild;
        const channel = interaction.channel;

        // Initialize MusicEmbedManager if needed
        if (!client.musicEmbedManager) {
            client.musicEmbedManager = new MusicEmbedManager(client);
        }

        // --- Common Validations ---
        if (!member.voice.channel) {
            return interaction.reply({ content: lM.Play.VoiceChannelRequired, ephemeral: true });
        }
        const permissions = member.voice.channel.permissionsFor(guild.members.me);
        if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
            return interaction.reply({ content: lM.Play.NoPermissions, ephemeral: true });
        }
        
        let player = client.players.get(guild.id);

        if (subcommand === 'play') {
            await interaction.deferReply();
            
            if (player && player.voiceChannel.id !== member.voice.channel.id) {
                return interaction.editReply({ content: lM.Play.SameChannelRequired });
            }

            if (!player) {
                player = new MusicPlayer(guild, channel, member.voice.channel);
                client.players.set(guild.id, player);
            }
            player.voiceChannel = member.voice.channel;
            player.textChannel = channel;

            const query = interaction.options.getString('query');
            
            // Send searching message
            const searchMsg = lM.Play.Search.replace('{query}', query);
            await interaction.editReply({ content: searchMsg });

            const trackData = await this.getTrackData(query, guild.id);
            if (!trackData.success) {
                return interaction.editReply({ content: lM.Play.Error + ` (${trackData.message || 'Unknown'})` });
            }

            await client.musicEmbedManager.handleMusicData(guild.id, trackData, member, interaction);

        } else if (subcommand === 'search') {
            await interaction.deferReply();
            if (player && player.voiceChannel.id !== member.voice.channel.id) return interaction.editReply({ content: lM.Play.SameChannelRequired });
            
            const query = interaction.options.getString('query');
            const YouTube = require('../../utils/Music/YouTube');
            const results = await YouTube.search(query, 10, guild.id); // Get 10 results

            if (!results || results.length === 0) {
                 return interaction.editReply({ content: lM.Play.Error });
            }

            const options = results.map((track, index) => ({
                label: `${index + 1}. ${track.title.substring(0, 90)}`,
                description: track.author.substring(0, 90),
                value: track.url
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('music_search_select')
                .setPlaceholder(lang.HelpCommand ? lang.HelpCommand.CategorySelectPlaceholder : 'Select a song...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            await interaction.editReply({
                content: lM.Play.Search.replace('{query}', query),
                components: [row]
            });

        } else {
            // Checks for commands requiring player
            if (!player) return interaction.reply({ content: lM.Errors.NoMusic, ephemeral: true });
            if (player.voiceChannel.id !== member.voice.channel.id) return interaction.reply({ content: lM.Play.SameChannelRequired, ephemeral: true });

            if (subcommand === 'skip') {
                player.stop(); // skip is effectively stopping current and manager handles next
                interaction.reply({ content: lM.Control.Skip });
            } else if (subcommand === 'stop') {
                player.queue = [];
                player.stop();
                client.players.delete(guild.id); // cleanup
                interaction.reply({ content: lM.Control.Stop });
            } else if (subcommand === 'pause') {
                player.pause();
                interaction.reply({ content: lM.Control.Pause });
            } else if (subcommand === 'resume') {
                player.resume();
                interaction.reply({ content: lM.Control.Resume });
            } else if (subcommand === 'queue') {
                // Delegate to EmbedManager or build simple queue embed
                if (!player.currentTrack && player.queue.length === 0) return interaction.reply({ content: lM.Queue.Empty });
                
                const qEmbed = new EmbedBuilder()
                    .setTitle(lM.Queue.Title)
                    .setColor(config.MusicBot?.Settings?.EmbedColor || '#FF0000')
                    .setDescription(
                        (player.currentTrack ? `**Now Playing:** [${player.currentTrack.title}](${player.currentTrack.url})\n\n` : '') +
                        player.queue.map((t, i) => `**${i + 1}.** [${t.title}](${t.url})`).join('\n').substring(0, 4000)
                    )
                    .setFooter({ text: lM.Queue.Footer.replace('{count}', player.queue.length).replace('{duration}', 'Calculate duration here') });
                interaction.reply({ embeds: [qEmbed] });

            } else if (subcommand === 'volume') {
                const amount = interaction.options.getInteger('amount');
                player.setVolume(amount);
                interaction.reply({ content: lM.Control.Volume.replace('{amount}', amount) });
            } else if (subcommand === 'loop') {
                const mode = interaction.options.getString('mode');
                // Assume player has setLoop(mode) or property
                player.loopMode = mode === 'off' ? 0 : mode === 'track' ? 1 : 2; 
                interaction.reply({ content: lM.Control.Loop.replace('{mode}', mode) });
            } else if (subcommand === 'shuffle') {
                // Fisher-Yates shuffle
                for (let i = player.queue.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [player.queue[i], player.queue[j]] = [player.queue[j], player.queue[i]];
                }
                interaction.reply({ content: lM.Control.Shuffle });
            } else if (subcommand === 'nowplaying') {
                 if (!player.currentTrack) return interaction.reply({ content: lM.Errors.NoMusic });
                 // Reuse EmbedManager's NowPlaying or build simple
                 const npEmbed = new EmbedBuilder()
                    .setTitle(lM.NowPlaying.Title)
                    .setDescription(`[${player.currentTrack.title}](${player.currentTrack.url})`)
                    .setThumbnail(player.currentTrack.thumbnail)
                    .addFields(
                        { name: 'Duration', value: player.currentTrack.duration, inline: true },
                        { name: 'Requested By', value: `<@${player.currentTrack.requestedBy}>`, inline: true }
                    );
                 interaction.reply({ embeds: [npEmbed] });

            } else if (subcommand === 'autoplay') {
                 player.autoplay = !player.autoplay;
                 interaction.reply({ content: lM.Control.Autoplay.replace('{status}', player.autoplay ? 'ON' : 'OFF') });
            }
        }
    },

    async getTrackData(query, guildId) {
        const YouTube = require('../../utils/Music/YouTube');
        const Spotify = require('../../utils/Music/Spotify');
        const SoundCloud = require('../../utils/Music/SoundCloud');
        const DirectLink = require('../../utils/Music/DirectLink');

        try {
            let tracks = [];
            let isPlaylist = false;
            let platform = 'youtube';

            if (query.includes('spotify.com')) platform = 'spotify';
            else if (query.includes('soundcloud.com')) platform = 'soundcloud';
            else if (query.startsWith('http') && (query.endsWith('.mp3') || query.endsWith('.wav'))) platform = 'direct';

            switch (platform) {
                case 'youtube':
                    if (YouTube.isPlaylist && YouTube.isPlaylist(query)) {
                        const playlistData = await YouTube.getPlaylist(query, guildId);
                        if (playlistData?.tracks?.length > 0) {
                            tracks = playlistData.tracks;
                            isPlaylist = true;
                        } else tracks = await YouTube.search(query, 1, guildId);
                    } else tracks = await YouTube.search(query, 1, guildId);
                    break;
                case 'spotify':
                    if (Spotify.isSpotifyURL(query)) {
                        const sData = await Spotify.getFromURL(query, guildId);
                        tracks = sData || [];
                        const { type } = Spotify.parseSpotifyURL(query);
                        isPlaylist = ['playlist', 'album', 'artist'].includes(type);
                    } else tracks = await Spotify.search(query, 1, 'track', guildId) || [];
                    break;
                case 'soundcloud':
                    tracks = await SoundCloud.search(query, 1, guildId) || [];
                    break;
                case 'direct':
                    tracks = await DirectLink.getInfo(query) || [];
                    break;
            }

            if (!tracks || tracks.length === 0) return { success: false, message: 'No results' };

            return { success: true, isPlaylist, tracks };

        } catch (error) {
            console.error(error);
            return { success: false, message: error.message };
        }
    }
};
