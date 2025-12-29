const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noitu')
        .setDescription('Quản lý trò chơi nối từ')
        .addSubcommand(sub => sub
            .setName('setup')
            .setDescription('Thiết lập trò chơi nối từ cho kênh (Admin)'))
        .addSubcommand(sub => sub
            .setName('stop')
            .setDescription('Dừng trò chơi trong kênh này (Admin)'))
        .addSubcommand(sub => sub
            .setName('reset')
            .setDescription('Reset trò chơi - xóa tất cả từ đã dùng (Admin)'))
        .addSubcommand(sub => sub
            .setName('stats')
            .setDescription('Xem thống kê người chơi'))
        .addSubcommand(sub => sub
            .setName('leaderboard')
            .setDescription('Xem bảng xếp hạng'))
        .addSubcommand(sub => sub
            .setName('hint')
            .setDescription('Gợi ý từ bắt đầu bằng chữ cái hiện tại'))
        .addSubcommand(sub => sub
            .setName('info')
            .setDescription('Thông tin về trò chơi hiện tại'))
        .addSubcommand(sub => sub
            .setName('history')
            .setDescription('Xem 10 từ gần nhất'))
        .addSubcommand(sub => sub
            .setName('test')
            .setDescription('Test API với một từ')
            .addStringOption(option =>
                option.setName('word')
                    .setDescription('Từ cần test')
                    .setRequired(true))),

    async execute(interaction, client) {
        const config = loadConfig();
        const subcommand = interaction.options.getSubcommand();

        // Admin commands
        if (['setup', 'stop', 'reset'].includes(subcommand)) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ Bạn cần quyền Administrator để sử dụng lệnh này!',
                    ephemeral: true
                });
            }
        }

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction, config, client);
                break;
            case 'stop':
                await handleStop(interaction, client);
                break;
            case 'reset':
                await handleReset(interaction, client);
                break;
            case 'stats':
                await handleStats(interaction, client);
                break;
            case 'leaderboard':
                await handleLeaderboard(interaction, client);
                break;
            case 'hint':
                await handleHint(interaction, client);
                break;
            case 'info':
                await handleInfo(interaction, client);
                break;
            case 'history':
                await handleHistory(interaction, client);
                break;
            case 'test':
                await handleTest(interaction, client);
                break;
        }
    }
};

function loadConfig() {
    const configPath = path.join(__dirname, 'config.yml');
    return yaml.load(fs.readFileSync(configPath, 'utf8'));
}

// Setup command
async function handleSetup(interaction, config, client) {
    if (!client.noiTuSetups) client.noiTuSetups = new Map();

    const guildId = interaction.guild.id;
    let setupData = client.noiTuSetups.get(guildId) || { channelId: null };

    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🎮 Thiết Lập Nối Từ')
        .setDescription(
            `**Kênh hiện tại:** ${setupData.channelId ? `<#${setupData.channelId}>` : 'Chưa chọn'}\n\n` +
            `Chọn kênh để chơi nối từ bằng menu bên dưới.`
        )
        .setFooter({ text: 'Sử dụng các nút để thiết lập' });

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('noitu_select_channel')
                .setLabel('📝 Chọn Kênh')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('noitu_confirm')
                .setLabel('✅ Xác Nhận')
                .setStyle(ButtonStyle.Success)
                .setDisabled(!setupData.channelId),
            new ButtonBuilder()
                .setCustomId('noitu_cancel')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Danger)
        );

    const message = await interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true,
        fetchReply: true
    });

    const collector = message.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: '❌ Chỉ người dùng lệnh mới có thể tương tác!', ephemeral: true });
        }

        if (i.customId === 'noitu_select_channel') {
            const selectRow = new ActionRowBuilder()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('noitu_channel_select')
                        .setPlaceholder('Chọn kênh để chơi')
                        .setChannelTypes(ChannelType.GuildText)
                );

            await i.update({
                content: '📝 Chọn kênh bên dưới:',
                components: [selectRow],
                embeds: []
            });

            const channelCollector = message.createMessageComponentCollector({ time: 60000 });
            channelCollector.on('collect', async ci => {
                if (ci.customId === 'noitu_channel_select') {
                    setupData.channelId = ci.values[0];
                    client.noiTuSetups.set(guildId, setupData);

                    const updatedEmbed = new EmbedBuilder()
                        .setColor('#3498db')
                        .setTitle('🎮 Thiết Lập Nối Từ')
                        .setDescription(`**Kênh đã chọn:** <#${setupData.channelId}>`)
                        .setFooter({ text: 'Nhấn Xác Nhận để hoàn tất' });

                    row2.components[0].setDisabled(false);
                    await ci.update({ content: null, embeds: [updatedEmbed], components: [row1, row2] });
                }
            });

        } else if (i.customId === 'noitu_confirm') {
            if (!client.noiTuGames) client.noiTuGames = new Map();

            client.noiTuGames.set(setupData.channelId, {
                guildId: guildId,
                channelId: setupData.channelId,
                currentWord: null,
                lastLetter: null,
                lastUserId: null,
                lastUsername: null,
                usedWords: new Set(),
                totalWords: 0,
                startedAt: Date.now()
            });

            const successEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('✅ Thiết Lập Thành Công!')
                .setDescription(
                    `**Kênh:** <#${setupData.channelId}>\n\n` +
                    `Người chơi có thể bắt đầu bằng cách gửi bất kỳ từ nào vào kênh!`
                )
                .setFooter({ text: 'Chúc chơi game vui vẻ!' });

            await i.update({ embeds: [successEmbed], components: [] });
            collector.stop();

        } else if (i.customId === 'noitu_cancel') {
            const cancelEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Đã Hủy')
                .setDescription('Thiết lập đã bị hủy bỏ.');

            await i.update({ embeds: [cancelEmbed], components: [] });
            collector.stop();
        }
    });

    collector.on('end', () => {
        message.edit({ components: [] }).catch(() => {});
    });
}

// Stop command
async function handleStop(interaction, client) {
    const game = client.noiTuGames?.get(interaction.channel.id);
    if (!game) {
        return interaction.reply({
            content: '❌ Không có trò chơi nào đang chạy trong kênh này!',
            ephemeral: true
        });
    }

    client.noiTuGames.delete(interaction.channel.id);

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🛑 Trò Chơi Đã Dừng')
        .setDescription(
            `**Tổng số từ:** ${game.totalWords || 0}\n` +
            `**Từ cuối:** ${game.currentWord || 'Không có'}\n` +
            `**Người chơi cuối:** ${game.lastUsername || 'Không có'}`
        )
        .setFooter({ text: 'Sử dụng /noitu setup để bắt đầu lại' });

    await interaction.reply({ embeds: [embed] });
}

// Reset command
async function handleReset(interaction, client) {
    const game = client.noiTuGames?.get(interaction.channel.id);
    if (!game) {
        return interaction.reply({
            content: '❌ Không có trò chơi nào đang chạy trong kênh này!',
            ephemeral: true
        });
    }

    const oldCount = game.usedWords.size;
    game.usedWords.clear();
    game.currentWord = null;
    game.lastLetter = null;
    game.lastUserId = null;
    game.lastUsername = null;
    game.totalWords = 0;

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('🔄 Đã Reset Trò Chơi')
        .setDescription(
            `**Đã xóa:** ${oldCount} từ\n\n` +
            `Người chơi có thể bắt đầu lại bằng bất kỳ từ nào!`
        );

    await interaction.reply({ embeds: [embed] });
}

// Stats command
async function handleStats(interaction, client) {
    const channelStats = client.noiTuStats?.get(interaction.channel.id);
    if (!channelStats || channelStats.size === 0) {
        return interaction.reply({
            content: '📊 Chưa có thống kê nào trong kênh này!',
            ephemeral: true
        });
    }

    const userId = interaction.user.id;
    const userStats = channelStats.get(userId);

    if (!userStats) {
        return interaction.reply({
            content: '📊 Bạn chưa chơi trong kênh này!',
            ephemeral: true
        });
    }

    const totalAttempts = userStats.correctWords + userStats.wrongWords;
    const accuracy = totalAttempts > 0 ? ((userStats.correctWords / totalAttempts) * 100).toFixed(1) : 0;

    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`📊 Thống Kê Của ${userStats.username}`)
        .addFields(
            { name: '✅ Từ đúng', value: `${userStats.correctWords}`, inline: true },
            { name: '❌ Từ sai', value: `${userStats.wrongWords}`, inline: true },
            { name: '🎯 Độ chính xác', value: `${accuracy}%`, inline: true },
            { name: '📝 Từ cuối', value: userStats.lastWord || 'Không có', inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Leaderboard command
async function handleLeaderboard(interaction, client) {
    const channelStats = client.noiTuStats?.get(interaction.channel.id);
    if (!channelStats || channelStats.size === 0) {
        return interaction.reply({
            content: '📊 Chưa có dữ liệu để xếp hạng!',
            ephemeral: true
        });
    }

    const rankings = Array.from(channelStats.entries())
        .map(([userId, stats]) => ({
            userId,
            username: stats.username,
            correctWords: stats.correctWords,
            wrongWords: stats.wrongWords,
            total: stats.correctWords + stats.wrongWords,
            accuracy: stats.correctWords + stats.wrongWords > 0 
                ? ((stats.correctWords / (stats.correctWords + stats.wrongWords)) * 100).toFixed(1)
                : 0
        }))
        .sort((a, b) => b.correctWords - a.correctWords)
        .slice(0, 10);

    const medals = ['🥇', '🥈', '🥉'];
    const leaderboardText = rankings
        .map((player, index) => {
            const medal = medals[index] || `${index + 1}.`;
            return `${medal} **${player.username}** - ${player.correctWords} từ đúng (${player.accuracy}%)`;
        })
        .join('\n');

    const embed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle('🏆 Bảng Xếp Hạng Nối Từ')
        .setDescription(leaderboardText || 'Chưa có dữ liệu')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// Hint command
async function handleHint(interaction, client) {
    const game = client.noiTuGames?.get(interaction.channel.id);
    if (!game) {
        return interaction.reply({
            content: '❌ Không có trò chơi nào đang chạy!',
            ephemeral: true
        });
    }

    if (!game.lastLetter) {
        return interaction.reply({
            content: '💡 Gợi ý: Bạn có thể bắt đầu bằng bất kỳ từ nào!',
            ephemeral: true
        });
    }

    const hints = {
        'a': ['áo', 'ăn', 'anh'],
        'b': ['bàn', 'bút', 'bánh'],
        'c': ['cá', 'cây', 'con'],
        'd': ['đá', 'đi', 'đường'],
        'e': ['em', 'ếch'],
        'g': ['gà', 'gió', 'gấu'],
        'h': ['hoa', 'học', 'hát'],
        'k': ['kẹo', 'khỉ', 'kim'],
        'l': ['lá', 'lớp', 'lửa'],
        'm': ['mây', 'mèo', 'mẹ'],
        'n': ['nước', 'núi', 'nhà'],
        'o': ['ô', 'ông'],
        'p': ['phố', 'pháo'],
        'q': ['quả', 'quần'],
        'r': ['rau', 'rừng'],
        's': ['sách', 'sông'],
        't': ['tay', 'trời', 'thú'],
        'u': ['uống', 'ướt'],
        'v': ['voi', 'vui', 'vàng'],
        'x': ['xe', 'xanh'],
        'y': ['yêu', 'ý']
    };

    const suggestions = hints[game.lastLetter] || [];
    const unusedHints = suggestions.filter(word => !game.usedWords.has(word.toLowerCase()));

    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('💡 Gợi Ý')
        .setDescription(
            `**Chữ cái bắt đầu:** ${game.lastLetter.toUpperCase()}\n\n` +
            (unusedHints.length > 0 
                ? `**Một số từ gợi ý:** ${unusedHints.slice(0, 3).join(', ')}`
                : `**Gợi ý:** Tìm từ bắt đầu bằng "${game.lastLetter.toUpperCase()}"`)
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Info command
async function handleInfo(interaction, client) {
    const game = client.noiTuGames?.get(interaction.channel.id);
    if (!game) {
        return interaction.reply({
            content: '❌ Không có trò chơi nào đang chạy trong kênh này!',
            ephemeral: true
        });
    }

    const duration = Math.floor((Date.now() - (game.startedAt || Date.now())) / 1000 / 60);

    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('ℹ️ Thông Tin Trò Chơi')
        .addFields(
            { name: '📝 Từ hiện tại', value: game.currentWord || 'Chưa bắt đầu', inline: true },
            { name: '🔤 Chữ tiếp theo', value: game.lastLetter ? game.lastLetter.toUpperCase() : 'Bất kỳ', inline: true },
            { name: '👤 Người chơi cuối', value: game.lastUsername || 'Không có', inline: true },
            { name: '📊 Tổng số từ', value: `${game.totalWords || 0}`, inline: true },
            { name: '📚 Từ đã dùng', value: `${game.usedWords.size}`, inline: true },
            { name: '⏱️ Thời gian', value: `${duration} phút`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// History command
async function handleHistory(interaction, client) {
    const game = client.noiTuGames?.get(interaction.channel.id);
    if (!game || game.usedWords.size === 0) {
        return interaction.reply({
            content: '📜 Chưa có lịch sử từ nào!',
            ephemeral: true
        });
    }

    const recentWords = Array.from(game.usedWords).slice(-10).reverse();

    const embed = new EmbedBuilder()
        .setColor('#95a5a6')
        .setTitle('📜 10 Từ Gần Nhất')
        .setDescription(recentWords.map((word, i) => `${i + 1}. ${word}`).join('\n'))
        .setFooter({ text: `Tổng: ${game.usedWords.size} từ` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
