const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const MCUser = require('./mcUsersModel.js');
const colors = require('ansi-colors');

const config = {
    Version: "2.0.0",
    Enable: true,
    EmbedColor: {
        Success: 0x2ECC71,  // Xanh lá
        Error: 0xE74C3C,    // Đỏ
        Info: 0x3498DB,     // Xanh dương
        Warning: 0xF39C12   // Vàng
    },
    Features: {
        LookupEnabled: true,
        LinkEnabled: true,
        UnlinkEnabled: true,
    },
    Messages: {
        Disabled: "❌ Minecraft Lookup đã bị vô hiệu hóa.",
        Enabled: "✅ Minecraft Lookup đã được kích hoạt.",
        NoLinkedAccount: "*Chưa liên kết*",
        UserNotFound: "❌ Không tìm thấy người chơi Minecraft này!",
        LinkedSuccessfully: "✅ Đã liên kết thành công username Minecraft với Discord của bạn!",
        AlreadyLinked: "⚠️ Bạn đã liên kết username Minecraft. Vui lòng hủy liên kết trước khi liên kết tài khoản mới.",
        UnlinkedSuccessfully: "✅ Đã hủy liên kết tài khoản Minecraft thành công!",
        NoAccountToUnlink: "❌ Bạn chưa liên kết tài khoản Minecraft nào!",
        ErrorOccurred: "❌ Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau!",
        LookupDisabled: "⚠️ Tính năng Lookup hiện đang bị vô hiệu hóa.",
        LinkDisabled: "⚠️ Tính năng Link hiện đang bị vô hiệu hóa.",
        UnlinkDisabled: "⚠️ Tính năng Unlink hiện đang bị vô hiệu hóa."
    },
    ApiUrls: {
        SearchUser: "https://laby.net/api/search/names/",
        FetchUser: "https://laby.net/api/user/"
    },
    Debug: true,
};

function debugLog(message, color = colors.cyan) {
    if (!config.Debug) return;
    console.log(`${colors.blue('[MCL]')} ${color(message)}`);
}

function normalLog(message, color = colors.white) {
    const prefix = config.Enable ? colors.green('[MCL]') : colors.gray('[MCL]');
    console.log(`${prefix} ${color(message)}`);
}

// Log khởi động
setTimeout(() => {
    if (!config.Enable) {
        normalLog(config.Messages.Disabled, colors.yellow);
    } else {
        normalLog(`${config.Messages.Enabled} v${config.Version}`, colors.green);
    }
}, 1000);

async function fetchMinecraftUser(username) {
    try {
        const searchUrl = `${config.ApiUrls.SearchUser}${username}`;
        debugLog(`🔍 Đang tìm kiếm UUID cho username: ${username}`);
        
        const searchResponse = await axios.get(searchUrl);
        const userUUID = searchResponse.data.results?.[0]?.uuid;

        if (!userUUID) {
            debugLog(`❌ Không tìm thấy UUID cho username: ${username}`, colors.red);
            throw new Error(config.Messages.UserNotFound);
        }

        debugLog(`✅ Đã tìm thấy UUID: ${userUUID}`, colors.green);

        const userUrl = `${config.ApiUrls.FetchUser}${userUUID}/get-snippet`;
        const userResponse = await axios.get(userUrl);
        
        debugLog(`📦 Đã lấy dữ liệu user thành công`, colors.green);
        return userResponse.data;
    } catch (error) {
        debugLog(`⚠️ Lỗi khi fetch user: ${error.message}`, colors.red);
        throw error;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mcuser')
        .setDescription('🎮 Quản lý thông tin Minecraft')
        .addSubcommand(subcommand =>
            subcommand
                .setName('lookup')
                .setDescription('🔍 Tra cứu thông tin người chơi Minecraft')
                .addStringOption(option => 
                    option.setName('username')
                        .setDescription('Tên người chơi Minecraft')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('link')
                .setDescription('🔗 Liên kết tài khoản Minecraft với Discord')
                .addStringOption(option => 
                    option.setName('username')
                        .setDescription('Tên người chơi Minecraft của bạn')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlink')
                .setDescription('🔓 Hủy liên kết tài khoản Minecraft')),

    async execute(interaction) {
        // Kiểm tra nếu bot bị disabled
        if (!config.Enable) {
            return await interaction.reply({ 
                content: config.Messages.Disabled, 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const discordId = interaction.user.id;

        try {
            await interaction.deferReply({ ephemeral: true });

            // LOOKUP SUBCOMMAND
            if (subcommand === 'lookup') {
                if (!config.Features.LookupEnabled) {
                    return await interaction.editReply({ 
                        content: config.Messages.LookupDisabled 
                    });
                }

                const username = interaction.options.getString('username');
                debugLog(`🔍 Tra cứu: ${username} bởi ${interaction.user.tag}`);

                const userInfo = await fetchMinecraftUser(username);
                const linkedAccount = await MCUser.findOne({ minecraftUsername: username });
                
                // Format name history
                const nameHistory = userInfo.name_history
                    .reverse()
                    .slice(0, 10)
                    .map((history, index) => {
                        const changedAt = history.changed_at 
                            ? `<t:${Math.floor(new Date(history.changed_at).getTime() / 1000)}:R>` 
                            : `Tên ban đầu`;
                        return `\`${index + 1}.\` **${history.username}** - ${changedAt}`;
                    })
                    .join('\n');

                const linkedUser = linkedAccount 
                    ? `<@${linkedAccount.discordId}> (\`${linkedAccount.discordId}\`)` 
                    : config.Messages.NoLinkedAccount;

                const embed = new EmbedBuilder()
                    .setColor(config.EmbedColor.Info)
                    .setTitle(`🎮 Thông Tin Minecraft`)
                    .setDescription(`**Player:** \`${userInfo.user.username}\``)
                    .setThumbnail(`https://mc-heads.net/avatar/${userInfo.user.uuid}/128`)
                    .addFields(
                        { 
                            name: '👤 Username', 
                            value: `\`${userInfo.user.username}\``, 
                            inline: true 
                        },
                        { 
                            name: '🆔 UUID', 
                            value: `\`${userInfo.user.uuid}\``, 
                            inline: true 
                        },
                        { 
                            name: '\u200B', 
                            value: '\u200B', 
                            inline: true 
                        },
                        { 
                            name: '📜 Lịch Sử Tên', 
                            value: nameHistory || 'Không có lịch sử', 
                            inline: false 
                        },
                        { 
                            name: '🔗 Discord Liên Kết', 
                            value: linkedUser, 
                            inline: false 
                        }
                    )
                    .setImage(`https://mc-heads.net/body/${userInfo.user.uuid}/right`)
                    .setFooter({ 
                        text: `Yêu cầu bởi ${interaction.user.tag}`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                debugLog(`✅ Lookup thành công: ${username}`, colors.green);
            }

            // LINK SUBCOMMAND
            else if (subcommand === 'link') {
                if (!config.Features.LinkEnabled) {
                    return await interaction.editReply({ 
                        content: config.Messages.LinkDisabled 
                    });
                }

                const username = interaction.options.getString('username');
                debugLog(`🔗 Đang liên kết: ${username} với ${interaction.user.tag}`);

                const existingLink = await MCUser.findOne({ discordId });

                if (existingLink) {
                    const embed = new EmbedBuilder()
                        .setColor(config.EmbedColor.Warning)
                        .setTitle('⚠️ Đã Liên Kết Trước Đó')
                        .setDescription(`Bạn đã liên kết với: \`${existingLink.minecraftUsername}\`\n\nVui lòng dùng \`/mcuser unlink\` trước!`)
                        .setFooter({ text: 'Minecraft Lookup System' })
                        .setTimestamp();

                    return await interaction.editReply({ embeds: [embed] });
                }

                // Verify username exists
                await fetchMinecraftUser(username);

                await MCUser.findOneAndUpdate(
                    { discordId },
                    { minecraftUsername: username },
                    { upsert: true, new: true }
                );

                const embed = new EmbedBuilder()
                    .setColor(config.EmbedColor.Success)
                    .setTitle('✅ Liên Kết Thành Công!')
                    .setDescription(`**Minecraft:** \`${username}\`\n**Discord:** ${interaction.user}\n\n🎉 Tài khoản của bạn đã được liên kết!`)
                    .setThumbnail(`https://mc-heads.net/avatar/${username}/128`)
                    .setFooter({ text: 'Minecraft Lookup System' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                debugLog(`✅ Đã liên kết: ${username} với ${discordId}`, colors.green);
            }

            // UNLINK SUBCOMMAND
            else if (subcommand === 'unlink') {
                if (!config.Features.UnlinkEnabled) {
                    return await interaction.editReply({ 
                        content: config.Messages.UnlinkDisabled 
                    });
                }

                debugLog(`🔓 Đang hủy liên kết: ${interaction.user.tag}`);

                const existingLink = await MCUser.findOne({ discordId });

                if (!existingLink) {
                    const embed = new EmbedBuilder()
                        .setColor(config.EmbedColor.Error)
                        .setTitle('❌ Không Tìm Thấy Liên Kết')
                        .setDescription('Bạn chưa liên kết tài khoản Minecraft nào!')
                        .setFooter({ text: 'Minecraft Lookup System' })
                        .setTimestamp();

                    return await interaction.editReply({ embeds: [embed] });
                }

                const unlinkedUsername = existingLink.minecraftUsername;
                await MCUser.deleteOne({ discordId });

                const embed = new EmbedBuilder()
                    .setColor(config.EmbedColor.Success)
                    .setTitle('✅ Hủy Liên Kết Thành Công!')
                    .setDescription(`**Minecraft:** \`${unlinkedUsername}\`\n**Discord:** ${interaction.user}\n\n🔓 Tài khoản đã được hủy liên kết!`)
                    .setFooter({ text: 'Minecraft Lookup System' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                debugLog(`✅ Đã hủy liên kết: ${unlinkedUsername} khỏi ${discordId}`, colors.green);
            }

        } catch (error) {
            console.error('❌ Error:', error);
            debugLog(`⚠️ Lỗi xảy ra: ${error.message}`, colors.red);

            const errorEmbed = new EmbedBuilder()
                .setColor(config.EmbedColor.Error)
                .setTitle('❌ Có Lỗi Xảy Ra')
                .setDescription(error.message || config.Messages.ErrorOccurred)
                .setFooter({ text: 'Vui lòng thử lại sau' })
                .setTimestamp();

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};