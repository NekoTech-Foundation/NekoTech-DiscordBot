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
        .setDescription('Điều khiển trình phát nhạc')
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Bỏ qua bài hát hiện tại')
                .addIntegerOption(option =>
                    option
                        .setName('to')
                        .setDescription('Bỏ qua đến một bài hát cụ thể trong hàng đợi')
                        .setMinValue(1)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Dừng phát và xóa hàng đợi'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pause')
                .setDescription('Tạm dừng bài hát hiện tại'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resume')
                .setDescription('Tiếp tục phát bài hát hiện tại'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('volume')
                .setDescription('Thay đổi âm lượng trình phát')
                .addIntegerOption(option =>
                    option
                        .setName('level')
                        .setDescription('Mức âm lượng (0-100)')
                        .setMinValue(0)
                        .setMaxValue(100)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('loop')
                .setDescription('Thiết lập chế độ lặp lại')
                .addStringOption(option =>
                    option
                        .setName('mode')
                        .setDescription('Chế độ lặp lại')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Tắt', value: 'off' },
                            { name: 'Bài hát', value: 'track' },
                            { name: 'Hàng đợi', value: 'queue' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shuffle')
                .setDescription('Xáo trộn hàng đợi'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nowplaying')
                .setDescription('Hiển thị thông tin về bài hát hiện tại'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('queue')
                .setDescription('Hiển thị hàng đợi hiện tại')
                .addIntegerOption(option => 
                    option
                        .setName('page')
                        .setDescription('Số trang để xem')
                        .setMinValue(1)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('restart')
                .setDescription('Khởi động lại hệ thống nhạc mà không dừng bot')),
    
    async execute(interaction) {
        try {
            if (!global.config.Music.Enabled) {
                return interaction.reply({
                    content: '❌ Hệ thống nhạc hiện đang bị tắt.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (global.config.GuildID && interaction.guild.id !== global.config.GuildID) {
                return interaction.reply({
                    content: '❌ Bot này chỉ được cấu hình cho một máy chủ cụ thể.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const player = useMainPlayer();
            if (!player) {
                return interaction.reply({
                    content: '❌ Trình phát nhạc chưa được khởi tạo.',
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
                    content: '❌ Không có phiên phát nhạc nào đang hoạt động.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const memberVC = interaction.member.voice.channel;
            if (!memberVC) {
                return interaction.reply({
                    content: '❌ Bạn phải ở trong một kênh thoại để sử dụng các điều khiển nhạc.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const botVC = interaction.guild.members.me.voice.channel;
            if (botVC && memberVC.id !== botVC.id) {
                return interaction.reply({
                    content: '❌ Bạn phải ở cùng kênh thoại với bot để sử dụng các điều khiển nhạc.',
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
                        content: '❌ Bạn không có vai trò cần thiết để sử dụng các điều khiển nhạc.',
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
                        content: '❌ Lệnh phụ không xác định.',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            Logger.error('Lỗi trong lệnh điều khiển nhạc:', error);
            return interaction.reply({
                content: `❌ Lỗi: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
};

async function handleSkip(interaction, queue) {
    if (!queue.isPlaying()) {
        return interaction.reply({
            content: '❌ Hiện không có gì đang phát.',
            flags: MessageFlags.Ephemeral
        });
    }
    
    const skipToIndex = interaction.options.getInteger('to');
    
    if (skipToIndex) {
        const tracks = queue.tracks.toArray();
        
        if (skipToIndex > tracks.length) {
            return interaction.reply({
                content: `❌ Chỉ có ${tracks.length} bài hát trong hàng đợi.`,
                flags: MessageFlags.Ephemeral
            });
        }
        
        const trackTitle = tracks[skipToIndex - 1].title;
        
        try {
            await queue.node.jump(skipToIndex - 1);
            
            const reply = await interaction.reply({
                content: `⏭️ Đã bỏ qua đến bài hát #${skipToIndex}: **${trackTitle}**`,
                flags: MessageFlags.Ephemeral,
                withResponse: true
            });
            
            autoDeleteReply(reply);
            
            return reply;
        } catch (error) {
            Logger.error('Lỗi khi bỏ qua đến bài hát:', error);
            return interaction.reply({
                content: `❌ Không thể bỏ qua đến bài hát: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    } else {
        const currentTrack = queue.currentTrack;
        
        try {
            await queue.node.skip();
            
            const reply = await interaction.reply({
                content: `⏭️ Đã bỏ qua **${currentTrack.title}**`,
                flags: MessageFlags.Ephemeral,
                withResponse: true
            });
            
            autoDeleteReply(reply);
            
            return reply;
        } catch (error) {
            Logger.error('Lỗi khi bỏ qua bài hát:', error);
            return interaction.reply({
                content: `❌ Không thể bỏ qua bài hát: ${error.message}`,
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
            Logger.error('Không thể lấy trình quản lý nhạc cho lệnh stop');
        } else {
            const channel = interaction.channel;
            
            if (queue.metadata?.nowPlayingMessages?.length > 0 && channel) {
                try {
                    const messageId = queue.metadata.nowPlayingMessages[queue.metadata.nowPlayingMessages.length - 1];
                    const message = await channel.messages.fetch(messageId).catch(() => null);
                    
                    if (message) {
                        Logger.debug('Đang cập nhật canvas Đang phát trước khi dừng hàng đợi');
                        
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
                                { name: 'Trạng thái', value: 'Đã dừng phát', inline: true },
                                { name: 'Bước tiếp theo', value: 'Dùng /play để thêm nhạc', inline: true }
                            )
                            .setFooter({ text: 'Trình phát nhạc | Chờ bài hát tiếp theo của bạn' });
                        
                        const emptyRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('music_play')
                                .setEmoji('▶️')
                                .setLabel('Thêm nhạc')
                                .setStyle(ButtonStyle.Success)
                        );
                        
                        await message.edit({
                            content: '🎵 **Hiện không có gì đang phát**',
                            embeds: [emptyEmbed],
                            components: [emptyRow],
                            files: [{
                                attachment: tempFile,
                                name: path.basename(tempFile)
                            }]
                        });
                        
                        try {
                            fs.unlinkSync(tempFile);
                            Logger.debug(`Đã xóa tệp tạm: ${tempFile}`);
                        } catch (unlinkError) {
                            Logger.debug(`Không thể xóa tệp tạm ngay lập tức: ${unlinkError.message}`);
                            
                            setTimeout(() => {
                                try {
                                    if (fs.existsSync(tempFile)) {
                                        fs.unlinkSync(tempFile);
                                        Logger.debug(`Đã xóa tệp tạm (trì hoãn): ${tempFile}`);
                                    }
                                } catch (error) {
                                    Logger.debug(`Không thể xóa tệp tạm trong lần thử trì hoãn: ${error.message}`);
                                }
                            }, 5000);
                        }
                    }
                } catch (error) {
                    Logger.debug(`Không thể cập nhật tin nhắn Đang phát trước khi dừng: ${error}`);
                }
            }
        }
        
        queue.delete();
        
        return interaction.reply({
            content: '⏹️ Đã dừng phát và xóa hàng đợi.',
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Lỗi khi dừng phát:', error);
        return interaction.reply({
            content: `❌ Không thể dừng phát: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handlePause(interaction, queue) {
    if (queue.node.isPaused()) {
        return interaction.reply({
            content: '❌ Trình phát đã được tạm dừng.',
            flags: MessageFlags.Ephemeral
        });
    }
    
    try {
        queue.node.pause();
        
        return interaction.reply({
            content: '⏸️ Đã tạm dừng phát.',
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Lỗi khi tạm dừng phát:', error);
        return interaction.reply({
            content: `❌ Không thể tạm dừng phát: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleResume(interaction, queue) {
    if (!queue.node.isPaused()) {
        return interaction.reply({
            content: '❌ Trình phát đã đang phát.',
            flags: MessageFlags.Ephemeral
        });
    }
    
    try {
        queue.node.resume();
        
        return interaction.reply({
            content: '▶️ Đã tiếp tục phát.',
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Lỗi khi tiếp tục phát:', error);
        return interaction.reply({
            content: `❌ Không thể tiếp tục phát: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleVolume(interaction, queue) {
    const volume = interaction.options.getInteger('level');
    
    try {
        queue.node.setVolume(volume);
        
        const reply = await interaction.reply({
            content: `🔊 Âm lượng được đặt thành ${volume}%.`,
            flags: MessageFlags.Ephemeral,
            withResponse: true
        });
        
        autoDeleteReply(reply);
        
        return reply;
    } catch (error) {
        Logger.error('Lỗi khi đặt âm lượng:', error);
        return interaction.reply({
            content: `❌ Không thể đặt âm lượng: ${error.message}`,
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
            [QueueRepeatMode.OFF]: 'đã tắt',
            [QueueRepeatMode.TRACK]: 'được đặt để lặp lại bài hát hiện tại',
            [QueueRepeatMode.QUEUE]: 'được đặt để lặp lại toàn bộ hàng đợi'
        }[repeatMode];
        
        return interaction.reply({
            content: `🔄 Chế độ lặp lại ${modeText}.`,
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Lỗi khi đặt chế độ lặp lại:', error);
        return interaction.reply({
            content: `❌ Không thể đặt chế độ lặp lại: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleShuffle(interaction, queue) {
    if (queue.tracks.size === 0) {
        return interaction.reply({
            content: '❌ Không có bài hát nào trong hàng đợi để xáo trộn.',
            flags: MessageFlags.Ephemeral
        });
    }
    
    try {
        queue.tracks.shuffle();
        
        return interaction.reply({
            content: '🔀 Đã xáo trộn hàng đợi.',
            flags: MessageFlags.Ephemeral
        }).then(autoDeleteReply);
    } catch (error) {
        Logger.error('Lỗi khi xáo trộn hàng đợi:', error);
        return interaction.reply({
            content: `❌ Không thể xáo trộn hàng đợi: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleNowPlaying(interaction, queue) {
    try {
        if (!queue.isPlaying()) {
            return interaction.reply({
                content: '❌ Hiện không có gì đang phát.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const currentTrack = queue.currentTrack;
        if (!currentTrack) {
            return interaction.reply({
                content: '❌ Không thể lấy thông tin bài hát hiện tại.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        // ... (Logging logic remains the same)
        
        try {
            const musicManager = getMusicManager();
            if (musicManager) {
                const result = await musicManager.handleNowPlayingMessage(queue, currentTrack);
                if (result) {
                    const infoReply = await interaction.editReply({
                        content: `✅ Đã cập nhật màn hình đang phát.`,
                        flags: MessageFlags.Ephemeral
                    });
                    autoDeleteReply(infoReply);
                    return;
                }
            }
            
            // Fallback implementation (slightly simplified for clarity)
            const canvas = await createNowPlayingCanvas(queue, currentTrack);
            const tempFile = path.join(__dirname, 'temp', `np_${Date.now()}.png`);
            // ... (file writing logic)
            
            const embed = new EmbedBuilder()
                .setColor(parseInt((global.config.Music.EmbedColor || '#FF69B4').replace('#', ''), 16))
                .setImage(`attachment://${path.basename(tempFile)}`)
                .addFields(
                    { name: 'Âm lượng', value: `${queue.node.volume}%`, inline: true },
                    { name: 'Độ dài hàng đợi', value: `${queue.tracks.size + 1} bài hát`, inline: true },
                    { name: 'Yêu cầu bởi', value: `<@${currentTrack.requestedBy.id}>`, inline: true }
                );
            
            const row = new ActionRowBuilder() // ... (Button setup)
            
            const message = await interaction.channel.send({
                content: `🎵 **Đang phát:** [${currentTrack.title}](${currentTrack.url})`,
                embeds: [embed],
                components: [row],
                files: [{ attachment: tempFile, name: path.basename(tempFile) }]
            });
            
            // ... (Interval update logic)
            
            const infoReply = await interaction.editReply({
                content: `✅ Đã cập nhật màn hình đang phát.`,
                flags: MessageFlags.Ephemeral
            });
            autoDeleteReply(infoReply);

        } catch (error) {
            Logger.error('Lỗi trong lệnh nowplaying:', error);
            return interaction.editReply({
                content: '❌ Đã xảy ra lỗi khi cập nhật màn hình đang phát.',
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        Logger.error('Lỗi trong lệnh nowplaying:', error);
        return interaction.editReply({
            content: '❌ Đã xảy ra lỗi khi xử lý lệnh nowplaying.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function createNowPlayingCanvas(queue, track) {
    if (!track) return createEmptyNowPlayingCanvas();

    // ... (Canvas drawing logic remains the same, but text needs translation)
    const canvas = createCanvas(600, 120);
    const ctx = canvas.getContext('2d');
    // ...
    let displayTitle = track?.title || 'Bài hát không xác định';
    // ... (Title truncation logic)
    ctx.fillText(displayTitle, textX, textY);
    ctx.fillText(track?.author || 'Nghệ sĩ không xác định', textX, textY + 25);
    // ... (Rest of drawing logic)
    return canvas;
}

async function createEmptyNowPlayingCanvas() {
    // ... (Canvas drawing logic remains the same, but text needs translation)
    const canvas = createCanvas(600, 150);
    const ctx = canvas.getContext('2d');
    // ...
    ctx.fillText('Không có gì đang phát', textX, mainTextY);
    ctx.fillText('Dùng /play để bắt đầu hành trình âm nhạc của bạn', textX, mainTextY + 30);
    // ... (Rest of drawing logic)
    return canvas;
}

async function handleQueue(interaction, queue) {
    try {
        if (!queue.isPlaying()) {
            return interaction.reply({
                content: '❌ Hiện không có gì đang phát.',
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
            description = 'Không có bài hát nào sắp tới trong hàng đợi.';
        } else {
            description = tracks.slice(startIndex, endIndex).map((track, i) => {
                return `**${startIndex + i + 1}.** [${track.title}](${track.url}) - ${track.duration} - Yêu cầu bởi <@${track.requestedBy.id}>`;
            }).join('\n\n');
        }

        const embed = {
            title: '🎵 Hàng đợi',
            description: description,
            fields: [
                { name: 'Đang phát', value: `[${queue.currentTrack.title}](${queue.currentTrack.url}) - ${queue.currentTrack.duration}` },
                { name: 'Tổng số bài hát', value: `${tracks.length}`, inline: true },
                { name: 'Trang', value: `${page}/${totalPages}`, inline: true }
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
                        label: '◀️ Trước',
                        custom_id: 'queue_prev',
                        disabled: page === 1
                    },
                    {
                        type: 2,
                        style: 2,
                        label: 'Sau ▶️',
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
        Logger.error('Lỗi hiển thị hàng đợi:', error);
        return interaction.reply({
            content: `❌ Lỗi hiển thị hàng đợi: ${error.message}`,
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
                    Logger.debug(`Không thể tự động xóa lệnh điều khiển: ${err}`);
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
        if (client) {
            client.on('interactionCreate', async (interaction) => {
                try {
                    if (interaction.isButton() && (interaction.customId === 'music_play' || interaction.customId === 'music_play_modal')) {
                        const voiceChannel = interaction.member.voice.channel;
                        if (!voiceChannel) {
                            return interaction.reply({
                                content: '❌ Bạn cần ở trong một kênh thoại để phát nhạc.',
                                flags: MessageFlags.Ephemeral
                            });
                        }
                        const modal = new ModalBuilder()
                            .setCustomId('music_play_search')
                            .setTitle('Phát nhạc');
                        const songInput = new TextInputBuilder()
                            .setCustomId('song_query')
                            .setLabel("Nhập tên bài hát hoặc URL")
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('VD: Never Gonna Give You Up')
                            .setRequired(true);
                        modal.addComponents(new ActionRowBuilder().addComponents(songInput));
                        await interaction.showModal(modal);
                        return;
                    }

                    if (interaction.isModalSubmit() && interaction.customId === 'music_play_search') {
                        const query = interaction.fields.getTextInputValue('song_query');
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                        const player = useMainPlayer();
                        const musicManager = getMusicManager();
                        if (!player || !musicManager) {
                            return interaction.editReply('❌ Hệ thống nhạc chưa được khởi tạo.');
                        }
                        const memberVC = interaction.member.voice.channel;
                        if (!memberVC) {
                            return interaction.editReply('❌ Bạn cần ở trong một kênh thoại để phát nhạc.');
                        }
                        
                        let searchResult = await player.search(query, { requestedBy: interaction.user });
                        if (!searchResult || !searchResult.tracks.length) {
                            return interaction.editReply(`❌ Không tìm thấy kết quả cho: ${query}!`);
                        }

                        const result = await musicManager.play(memberVC, searchResult, interaction, true, { playTop: false, skipCurrent: false });
                        if (result.success) {
                            return interaction.editReply(`✅ Đã thêm bài hát vào hàng đợi`);
                        } else {
                            return interaction.editReply(`❌ ${result.message || 'Đã xảy ra lỗi khi phát bài hát.'}`);
                        }
                    }
                } catch (error) {
                    Logger.error(`Lỗi xử lý tương tác modal nhạc: ${error.stack || error}`);
                }
            });
        }
    } catch (error) {
        Logger.error(`Lỗi thiết lập trình xử lý modal nhạc: ${error.stack || error}`);
    }
}

async function handleRestart(interaction) {
    try {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: '❌ Bạn cần quyền quản trị viên để khởi động lại hệ thống nhạc.',
                flags: MessageFlags.Ephemeral
            });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const musicManager = getMusicManager();
        if (!musicManager) {
            return interaction.editReply('❌ Trình quản lý nhạc chưa được khởi tạo.');
        }
        await musicManager.saveQueues(true);
        const playerCount = musicManager.musicSubscriptions.size;
        if (playerCount === 0) {
            return interaction.editReply('✅ Không tìm thấy trình phát nhạc nào đang hoạt động. Hệ thống đã sẵn sàng.');
        }
        for (const guildId of [...musicManager.musicSubscriptions.keys()]) {
            const player = musicManager.musicSubscriptions.get(guildId);
            if (player && player.player) {
                player.player.stop();
                if (player.connection) player.connection.destroy();
                musicManager.musicSubscriptions.delete(guildId);
            }
        }
        await musicManager.restoreQueues();
        return interaction.editReply({
            content: `✅ Hệ thống nhạc đã khởi động lại. Đã hủy ${playerCount} trình phát và cố gắng khôi phục hàng đợi.`,
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        Logger.error('Lỗi trong lệnh khởi động lại:', error);
        return interaction.editReply({
            content: `❌ Lỗi khởi động lại hệ thống nhạc: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleEmptyNowPlaying(interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const musicManager = getMusicManager();
        const emptyCanvas = musicManager ? await musicManager.createEmptyNowPlayingCanvas() : await createEmptyNowPlayingCanvas();
        const tempFile = path.join(__dirname, 'temp', `np_empty_${Date.now()}.png`);
        fs.writeFileSync(tempFile, emptyCanvas.toBuffer());

        const emptyEmbed = new EmbedBuilder()
            .setColor(parseInt((global.config.Music.EmbedColor || '#FF69B4').replace('#', ''), 16))
            .setImage(`attachment://${path.basename(tempFile)}`)
            .addFields(
                { name: 'Trạng thái', value: 'Không có phiên hoạt động', inline: true },
                { name: 'Bước tiếp theo', value: 'Dùng /play để bắt đầu nghe', inline: true }
            )
            .setFooter({ text: 'Trình phát nhạc | Chờ bài hát tiếp theo của bạn' });

        const emptyRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('music_play')
                .setEmoji('▶️')
                .setLabel('Thêm nhạc')
                .setStyle(ButtonStyle.Success)
        );

        const reply = await interaction.editReply({
            content: '🎵 **Không có gì đang phát**',
            embeds: [emptyEmbed],
            components: [emptyRow],
            files: [{ attachment: tempFile, name: path.basename(tempFile) }]
        });
        
        // ... (File deletion logic)

    } catch (error) {
        Logger.error('Lỗi tạo màn hình đang phát trống:', error);
        return interaction.editReply({
            content: `❌ Lỗi tạo màn hình nhạc: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}