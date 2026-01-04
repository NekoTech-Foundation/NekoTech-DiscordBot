const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Verification = require('../../../models/verificationSchema');
const { getConfig } = require('../../../utils/configLoader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verification')
        .setDescription('Quản lý hệ thống xác minh')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Cấu hình hệ thống xác minh')
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('Vai trò sẽ trao sau khi xác minh')
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('Kênh gửi bảng xác minh')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('Chế độ xác minh')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Nút bấm (Đơn giản)', value: 'BUTTON' },
                            { name: 'Captcha (Hình ảnh)', value: 'CAPTCHA' }
                        ))
                .addRoleOption(option =>
                    option.setName('unverified_role')
                        .setDescription('Vai trò cho người chưa xác minh (sẽ bị xóa sau khi xác minh)')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Gửi/Cập nhật bảng xác minh trong kênh đã cấu hình')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Xem cài đặt xác minh hiện tại')
        ),
    
    async execute(interaction, lang) {
        const subcommand = interaction.options.getSubcommand();
        const config = getConfig();

        // Check Permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: lang.Global.Permissions || 'Bạn không có quyền sử dụng lệnh này.', flags: MessageFlags.Ephemeral });
        }

        let data = await Verification.findOne({ guildID: interaction.guildId });
        if (!data) {
            data = await Verification.create({ guildID: interaction.guildId });
        }

        if (subcommand === 'setup') {
            const role = interaction.options.getRole('role');
            const channel = interaction.options.getChannel('channel');
            const mode = interaction.options.getString('mode');
            const unverifiedRole = interaction.options.getRole('unverified_role');

            data.roleID = role.id;
            data.channelID = channel.id;
            data.mode = mode;
            if (unverifiedRole) data.unverifiedRoleID = unverifiedRole.id;
            
            await data.save();

            // Send success message
            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Success)
                .setTitle(lang.Verify?.SetupTitle || 'Cài đặt xác minh thành công')
                .setDescription(lang.Verify?.SetupDescription || 'Hệ thống xác minh đã được cập nhật.')
                .addFields(
                    { name: lang.Verify?.FieldChannel || 'Kênh', value: `${channel}`, inline: true },
                    { name: lang.Verify?.FieldRole || 'Vai trò xác minh', value: `${role}`, inline: true },
                    { name: lang.Verify?.FieldMode || 'Chế độ', value: mode === 'CAPTCHA' ? 'Captcha (Hình ảnh)' : 'Nút bấm', inline: true },
                    { name: lang.Verify?.FieldUnverifiedRole || 'Vai trò chưa xác minh', value: unverifiedRole ? `${unverifiedRole}` : (lang.Verify?.None || 'Không có'), inline: true }
                )
                .setFooter({ text: 'Sử dụng /verification panel để gửi bảng xác minh.' });
            
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'panel') {
            if (!data.channelID) {
                return interaction.reply({ content: lang.Verify?.SetupRequired || 'Vui lòng chạy `/verification setup` trước!', flags: MessageFlags.Ephemeral });
            }

            const channel = interaction.guild.channels.cache.get(data.channelID);
            if (!channel) {
                return interaction.reply({ content: lang.Verify?.ChannelNotFound || 'Không tìm thấy kênh cấu hình. Vui lòng chạy setup lại.', flags: MessageFlags.Ephemeral });
            }

            // Construct Panel
            const embed = new EmbedBuilder()
                .setTitle(config.VerificationSettings?.VerificationEmbed?.Title || lang.Verify?.PanelTitle || 'Xác minh máy chủ')
                .setDescription(config.VerificationSettings?.VerificationEmbed?.Description || lang.Verify?.PanelDescription || 'Nhấn vào nút bên dưới để xác minh và truy cập máy chủ.')
                .setColor(config.EmbedColors.Default);
            
            if (config.VerificationSettings?.VerificationEmbed?.Image) {
                embed.setImage(config.VerificationSettings.VerificationEmbed.Image);
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('verifyButton')
                        .setLabel(config.VerificationSettings?.VerificationButton?.Name || lang.Verify?.ButtonLabel || 'Xác minh')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji(config.VerificationSettings?.VerificationButton?.Emoji || '✅')
                );

            try {
                // Check if we can edit existing message
                if (data.msgID) {
                    const msg = await channel.messages.fetch(data.msgID).catch(() => null);
                    if (msg) {
                        await msg.edit({ embeds: [embed], components: [row] });
                        return interaction.reply({ content: lang.Verify?.PanelUpdated || `Đã cập nhật bảng xác minh tại ${channel}.`, flags: MessageFlags.Ephemeral });
                    }
                }

                const msg = await channel.send({ embeds: [embed], components: [row] });
                data.msgID = msg.id;
                await data.save();
                
                return interaction.reply({ content: lang.Verify?.PanelSent || `Đã gửi bảng xác minh đến ${channel}.`, flags: MessageFlags.Ephemeral });

            } catch (error) {
                console.error(error);
                return interaction.reply({ content: lang.Verify?.PanelError || 'Không thể gửi bảng xác minh. Vui lòng kiểm tra quyền bot.', flags: MessageFlags.Ephemeral });
            }
        }

        if (subcommand === 'info') {
             const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Default)
                .setTitle(lang.Verify?.SettingsTitle || 'Cài đặt xác minh')
                .addFields(
                    { name: lang.Verify?.FieldChannel || 'Kênh', value: data.channelID ? `<#${data.channelID}>` : 'Chưa thiết lập', inline: true },
                    { name: lang.Verify?.FieldRole || 'Vai trò xác minh', value: data.roleID ? `<@&${data.roleID}>` : 'Chưa thiết lập', inline: true },
                    { name: lang.Verify?.FieldMode || 'Chế độ', value: data.mode === 'CAPTCHA' ? 'Captcha' : (data.mode || 'Chưa thiết lập'), inline: true },
                    { name: lang.Verify?.FieldUnverifiedRole || 'Vai trò chưa xác minh', value: data.unverifiedRoleID ? `<@&${data.unverifiedRoleID}>` : (lang.Verify?.None || 'Không có'), inline: true },
                );
            return interaction.reply({ embeds: [embed] });
        }
    }
};
