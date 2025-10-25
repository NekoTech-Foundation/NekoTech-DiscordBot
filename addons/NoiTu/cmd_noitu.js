const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noitu')
        .setDescription('Quản lý trò chơi nối từ(BETA)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('adminsetup')
                .setDescription('Setup trò chơi nối từ cho kênh (Chỉ Admin;BETA)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Dừng trò chơi nối từ trong kênh này (Chỉ Admin)')),

    async execute(interaction, client) {
        const configPath = path.join(__dirname, 'config.yml');
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

        // Kiểm tra quyền Admin
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: config.lang.errors.no_permission,
                ephemeral: true
            });
        }

        if (interaction.options.getSubcommand() === 'adminsetup') {
            await handleAdminSetup(interaction, config, client);
        } else if (interaction.options.getSubcommand() === 'stop') {
            await handleStop(interaction, config, client);
        }
    }
};

async function handleAdminSetup(interaction, config, client) {
    // Lấy hoặc tạo setup data cho guild
    if (!client.noiTuSetups) {
        client.noiTuSetups = new Map();
    }

    const guildId = interaction.guild.id;
    let setupData = client.noiTuSetups.get(guildId) || {
        channelId: null,
        timeout: config.settings.default_timeout
    };

    // Tạo embed setup
    const embed = new EmbedBuilder()
        .setColor(config.messages.setup_embed.color)
        .setTitle(config.messages.setup_embed.title)
        .setDescription(
            config.messages.setup_embed.description
                .replace('{timeout}', setupData.timeout)
                .replace('{channel}', setupData.channelId ? `<#${setupData.channelId}>` : 'Chưa chọn')
        )
        .setFooter({ text: config.messages.setup_embed.footer.text });

    // Tạo các nút
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('noitu_select_channel')
                .setLabel('📝 Chọn Kênh')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('noitu_set_timeout')
                .setLabel('⏱️ Đặt Thời Gian')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('noitu_confirm')
                .setLabel('✅ Xác Nhận Setup')
                .setStyle(ButtonStyle.Success)
                .setDisabled(!setupData.channelId),
            new ButtonBuilder()
                .setCustomId('noitu_cancel')
                .setLabel('❌ Hủy Bỏ')
                .setStyle(ButtonStyle.Danger)
        );

    const message = await interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true,
        fetchReply: true
    });

    // Collector cho buttons
    const collector = message.createMessageComponentCollector({
        time: 300000 // 5 phút
    });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: 'Bạn không thể sử dụng nút này!', ephemeral: true });
        }

        if (i.customId === 'noitu_select_channel') {
            // Tạo channel select menu
            const channelSelectRow = new ActionRowBuilder()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('noitu_channel_select')
                        .setPlaceholder('Chọn kênh để chơi nối từ')
                        .setChannelTypes(ChannelType.GuildText)
                );

            await i.update({
                content: 'Chọn kênh bên dưới:',
                components: [channelSelectRow],
                embeds: []
            });

            const channelCollector = message.createMessageComponentCollector({
                time: 60000
            });

            channelCollector.on('collect', async ci => {
                if (ci.customId === 'noitu_channel_select') {
                    setupData.channelId = ci.values[0];
                    client.noiTuSetups.set(guildId, setupData);

                    const updatedEmbed = new EmbedBuilder()
                        .setColor(config.messages.setup_embed.color)
                        .setTitle(config.messages.setup_embed.title)
                        .setDescription(
                            config.messages.setup_embed.description
                                .replace('{timeout}', setupData.timeout)
                                .replace('{channel}', `<#${setupData.channelId}>`)
                        )
                        .setFooter({ text: config.messages.setup_embed.footer.text });

                    row2.components[0].setDisabled(false);

                    await ci.update({
                        content: null,
                        embeds: [updatedEmbed],
                        components: [row1, row2]
                    });
                }
            });

        } else if (i.customId === 'noitu_set_timeout') {
            try {
                await i.reply({
                    content: `Nhập thời gian chờ (${config.settings.min_timeout}-${config.settings.max_timeout} giây):`,
                    ephemeral: true
                });
            } catch (error) {
                if (error.code !== 10062) {
                    console.error('Error replying to interaction:', error);
                }
                return;
            }

            const filter = m => m.author.id === interaction.user.id;
            const timeoutCollector = interaction.channel.createMessageCollector({
                filter,
                time: 30000,
                max: 1
            });

            timeoutCollector.on('collect', async m => {
                try {
                    const timeout = parseInt(m.content);
                    if (isNaN(timeout) || timeout < config.settings.min_timeout || timeout > config.settings.max_timeout) {
                        await m.reply({
                            content: config.lang.errors.invalid_timeout
                                .replace('{min}', config.settings.min_timeout)
                                .replace('{max}', config.settings.max_timeout),
                            ephemeral: true
                        }).catch(() => {});
                        return;
                    }

                    setupData.timeout = timeout;
                    client.noiTuSetups.set(guildId, setupData);

                    const updatedEmbed = new EmbedBuilder()
                        .setColor(config.messages.setup_embed.color)
                        .setTitle(config.messages.setup_embed.title)
                        .setDescription(
                            config.messages.setup_embed.description
                                .replace('{timeout}', setupData.timeout)
                                .replace('{channel}', setupData.channelId ? `<#${setupData.channelId}>` : 'Chưa chọn')
                        )
                        .setFooter({ text: config.messages.setup_embed.footer.text });

                    row2.components[0].setDisabled(!setupData.channelId);

                    try {
                        await message.edit({
                            embeds: [updatedEmbed],
                            components: [row1, row2]
                        });
                    } catch (error) {
                        if (error.code !== 10008) {
                            console.error('Error editing message:', error);
                        }
                    }

                    await m.delete().catch(() => {});
                    
                    try {
                        await i.followUp({
                            content: config.lang.success.timeout_updated.replace('{timeout}', timeout),
                            ephemeral: true
                        });
                    } catch (error) {
                        // Ignore all follow-up errors (interaction may have expired)
                    }
                } catch (error) {
                    console.error('Error in timeout collector:', error);
                }
            });

        } else if (i.customId === 'noitu_confirm') {
            // Lưu setup vào game sessions
            if (!client.noiTuGames) {
                client.noiTuGames = new Map();
            }

            client.noiTuGames.set(setupData.channelId, {
                guildId: guildId,
                channelId: setupData.channelId,
                timeout: setupData.timeout,
                currentWord: null,
                lastLetter: null,
                lastUserId: null,
                usedWords: new Set(),
                timeoutHandle: null
            });

            const confirmEmbed = new EmbedBuilder()
                .setColor(config.messages.setup_complete.color)
                .setTitle(config.messages.setup_complete.title)
                .setDescription(
                    config.messages.setup_complete.description
                        .replace('{channel}', `<#${setupData.channelId}>`)
                        .replace('{timeout}', setupData.timeout)
                )
                .setFooter({ text: config.messages.setup_complete.footer.text });

            await i.update({
                embeds: [confirmEmbed],
                components: []
            });

            collector.stop();

        } else if (i.customId === 'noitu_cancel') {
            const cancelEmbed = new EmbedBuilder()
                .setColor(config.messages.setup_cancelled.color)
                .setTitle(config.messages.setup_cancelled.title)
                .setDescription(config.messages.setup_cancelled.description);

            await i.update({
                embeds: [cancelEmbed],
                components: []
            });

            collector.stop();
        }
    });

    collector.on('end', () => {
        message.edit({ components: [] }).catch(() => {});
    });
}

async function handleStop(interaction, config, client) {
    if (!client.noiTuGames) {
        return interaction.reply({
            content: 'Không có trò chơi nào đang chạy!',
            ephemeral: true
        });
    }

    const channelId = interaction.channel.id;
    const game = client.noiTuGames.get(channelId);

    if (!game) {
        return interaction.reply({
            content: 'Kênh này không có trò chơi nối từ đang chạy!',
            ephemeral: true
        });
    }

    // Xóa timeout nếu có
    if (game.timeoutHandle) {
        clearTimeout(game.timeoutHandle);
    }

    // Xóa game
    client.noiTuGames.delete(channelId);

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🛑 Trò Chơi Đã Dừng')
        .setDescription(`Trò chơi nối từ trong kênh này đã được dừng bởi ${interaction.user}.`)
        .setFooter({ text: 'Sử dụng /noitu adminsetup để bắt đầu lại' });

    await interaction.reply({ embeds: [embed] });
}
