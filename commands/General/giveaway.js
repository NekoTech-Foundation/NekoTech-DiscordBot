/*
  _____                     _         ____          _   
 |  __ \                   | |       |  _ \        | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                              
                                              
  Cảm ơn bạn đã chọn Drako Bot!

  Nếu bạn gặp bất kỳ vấn đề nào, cần hỗ trợ, hoặc có đề xuất để cải thiện bot,
  chúng tôi mời bạn kết nối với chúng tôi trên máy chủ Discord và tạo một phiếu hỗ trợ: 

  http://discord.drakodevelopment.net
 
*/

const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const yaml = require("js-yaml");

const giveawayActions = require("../../events/Giveaways/giveawayActions.js");
const { getConfig } = require('../../utils/configLoader.js');
const config = getConfig();


function extractAndValidateRoleIds(input, guild) {
    if (!input) return { validRoles: [], invalidRoles: [] };

    const roleMentionRegex = /<@&(\d+)>|(\d+)/g;
    let match;
    const validRoles = [];
    const invalidRoles = [];

    while ((match = roleMentionRegex.exec(input)) !== null) {
        const roleId = match[1] || match[2];
        if (guild.roles.cache.has(roleId)) {
            validRoles.push(roleId);
        } else {
            invalidRoles.push(roleId);
        }
    }

    return { validRoles, invalidRoles };
}

function hasCommonElements(arr1, arr2) {
    return arr1.some((item) => arr2.includes(item));
}

function isValidDateFormat(dateString) {
    const regex = /^[a-zA-Z]+\s\d{1,2}\s\d{4}$/;
    return regex.test(dateString);
}

function generateMixedId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function parseDuration(durationString) {
    const regex = /^(\d+)([mhdwy])$/;
    const match = durationString.match(regex);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000,
        'y': 365 * 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription(`🎉 Tổ chức giveaway`)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("create")
                .setDescription("Tạo một giveaway")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Kênh bạn muốn tạo giveaway")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("time")
                        .setDescription(
                            "Thời gian giveaway, ví dụ: 1m (phút), 1h (giờ), 1d (ngày), 1y (năm)"
                        )
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("winners")
                        .setDescription("Số lượng người có thể thắng giveaway?")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("prize")
                        .setDescription("Giải thưởng để thắng")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("hostedby")
                        .setDescription(
                            'Ai là người tổ chức giveaway? Dùng @ kèm theo Tên người dùng'
                        )
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("min_server_join_date")
                        .setDescription(
                            'Ngày tham gia máy chủ tối thiểu để tham gia (định dạng: "Tháng 1 2000") [Tùy chọn]'
                        )
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName("min_account_age")
                        .setDescription(
                            'Tuổi tài khoản tối thiểu để tham gia (định dạng: "Tháng 1 2000") [Tùy chọn]'
                        )
                        .setRequired(false)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("min_invites")
                        .setDescription("Số lượt mời tối thiểu cần có để tham gia [Tùy chọn]")
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('whitelist_roles')
                        .setDescription('Các vai trò được phép tham gia giveaway, dùng @ kèm theo Vai trò [Tùy chọn]')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('blacklist_roles')
                        .setDescription('Các vai trò không được phép tham gia giveaway, dùng @ kèm theo Vai trò [Tùy chọn]')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('notify')
                        .setDescription('Thông báo cho ai khi giveaway bắt đầu [Tùy chọn]')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Không ai cả', value: 'notify_nobody' },
                            { name: 'Vai trò trong danh sách trắng', value: 'notify_whitelist_roles' },
                            { name: 'Mọi người', value: 'notify_everyone' },
                        )
                )
                .addIntegerOption((option) =>
                    option
                        .setName("min_messages")
                        .setDescription("Số tin nhắn tối thiểu cần có để tham gia [Tùy chọn]")
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName("extra_entries")
                        .setDescription("Vai trò được cộng thêm lượt tham gia (Định dạng: @vai_tro:lượt @vai_tro2:lượt) [Tùy chọn]")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("reroll")
                .setDescription("Quay lại một giveaway")
                .addStringOption((option) =>
                    option
                        .setName("giveaway_id")
                        .setDescription("ID giveaway ở chân của embed giveaway")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("users")
                        .setDescription("Người dùng để quay lại, dùng @ kèm theo Tên người dùng")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("end")
                .setDescription("Kết thúc một giveaway")
                .addStringOption((option) =>
                    option
                        .setName("giveaway_id")
                        .setDescription("ID giveaway ở chân của embed giveaway")
                        .setRequired(true)
                )
        ),
    category: 'General',
    async execute(interaction, client) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const allowedRoles = config.Giveaways.AllowRoles;
            const userRoles = interaction.member.roles.cache.map((role) => role.id);
            const hasPermission = userRoles.some((role) =>
                allowedRoles.includes(role)
            ) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

            if (!hasPermission) {
                return interaction.editReply({
                    content: "Bạn không có quyền sử dụng lệnh giveaway.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const subCommand = interaction.options.getSubcommand();
            switch (subCommand) {
                case "create":
                    let gTime = parseDuration(interaction.options.getString("time"));
                    if (gTime === null) {
                        return interaction.editReply({
                            content: "Định dạng thời gian không hợp lệ. Vui lòng sử dụng một số theo sau là m, h, d, w, hoặc y (ví dụ: 1h cho 1 giờ).",
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                    let prize = interaction.options.getString("prize");
                    let channel = interaction.options.getChannel("channel");
                    let winnerCount = interaction.options.getInteger("winners");
                    let hostedBy = interaction.options.getString("hostedby");

                    let whitelistRolesInput = interaction.options.getString("whitelist_roles");
                    let blacklistRolesInput = interaction.options.getString("blacklist_roles");

                    const { validRoles: validWhitelistRoles, invalidRoles: invalidWhitelistRoles } = extractAndValidateRoleIds(whitelistRolesInput, interaction.guild);
                    const { validRoles: validBlacklistRoles, invalidRoles: invalidBlacklistRoles } = extractAndValidateRoleIds(blacklistRolesInput, interaction.guild);

                    if (invalidWhitelistRoles.length > 0 || invalidBlacklistRoles.length > 0) {
                        let errorMessage = "Các ID vai trò sau không hợp lệ:";
                        if (invalidWhitelistRoles.length > 0) {
                            errorMessage += `\nID vai trò danh sách trắng không hợp lệ: ${invalidWhitelistRoles.join(", ")}`;
                        }
                        if (invalidBlacklistRoles.length > 0) {
                            errorMessage += `\nID vai trò danh sách đen không hợp lệ: ${invalidBlacklistRoles.join(", ")}`;
                        }

                        return interaction.editReply({
                            content: errorMessage,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    if (hasCommonElements(validWhitelistRoles, validBlacklistRoles)) {
                        return interaction.editReply({
                            content: "Một vai trò không thể vừa nằm trong danh sách trắng vừa nằm trong danh sách đen.",
                            flags: MessageFlags.Ephemeral,
                        });
                    }

                    let minServerJoinDateInput = interaction.options.getString("min_server_join_date");
                    let minServerJoinDate = isValidDateFormat(minServerJoinDateInput) ? new Date(minServerJoinDateInput) : null;

                    let minAccountAgeInput = interaction.options.getString("min_account_age");
                    let minAccountAge = isValidDateFormat(minAccountAgeInput) ? new Date(minAccountAgeInput) : null;

                    if ((minServerJoinDateInput && !minServerJoinDate) || (minAccountAgeInput && !minAccountAge)) {
                        return interaction.editReply({
                            content: "Một hoặc nhiều ngày có định dạng không chính xác. Vui lòng sử dụng 'Tháng Ngày Năm' (ví dụ: Tháng 1 2000).",
                            flags: MessageFlags.Ephemeral,
                        });
                    }

                    const notifyOption = interaction.options.getString('notify');

                    let notifyFollowing;
                    switch (notifyOption) {
                        case 'notify_everyone':
                            notifyFollowing = "@everyone"
                            break;
                        case 'notify_whitelist_roles':
                            notifyFollowing = validWhitelistRoles
                            break;
                        case 'notify_nobody':
                            notifyFollowing = ""
                            break;
                    }

                    let minInvites = interaction.options.getInteger("min_invites") || 0;
                    let minMessages = interaction.options.getInteger("min_messages") || 0;
                    let extraEntriesInput = interaction.options.getString("extra_entries");

                    let extraEntries = [];
                    if (extraEntriesInput) {
                        const regex = /<@&(\d+)>:(\d+)/g;
                        let match;
                        while ((match = regex.exec(extraEntriesInput)) !== null) {
                            const roleId = match[1];
                            const entries = parseInt(match[2]);
                            if (entries > 0 && interaction.guild.roles.cache.has(roleId)) {
                                extraEntries.push({ roleId, entries });
                            }
                        }
                    }

                    const giveawayDetails = {
                        giveawayId: generateMixedId(8),
                        time: gTime,
                        prize: prize,
                        channel: channel,
                        winnerCount: winnerCount,
                        whitelistRoles: validWhitelistRoles,
                        blacklistRoles: validBlacklistRoles,
                        minServerJoinDate: minServerJoinDate,
                        minAccountAge: minAccountAge,
                        minInvites: minInvites,
                        minMessages: minMessages,
                        hostedBy: hostedBy,
                        notifyUsers: notifyFollowing,
                        extraEntries: extraEntries
                    };

                    await giveawayActions.startGiveaway(interaction, giveawayDetails);
                    break;
                case "reroll":
                    let rerollGiveawayId = interaction.options.getString("giveaway_id");
                    const usersToRerollInput = interaction.options.getString("users");

                    let userIdsToReroll = [];
                    if (usersToRerollInput) {
                        userIdsToReroll = usersToRerollInput.match(/<@!?(\d+)>/g)?.map(u => u.replace(/\D/g, '')) || [];
                    }

                    await giveawayActions.rerollGiveaway(interaction, rerollGiveawayId, userIdsToReroll);
                    break;
                case "end":
                    let giveawayId = interaction.options.getString("giveaway_id");
                    await giveawayActions.endGiveaway(giveawayId);
                    await interaction.editReply({
                        content: `Giveaway có ID ${giveawayId} đã được kết thúc.`,
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                default:
                    break;
            }

        } catch (error) {
            console.error(error);
            interaction.editReply({
                content: "Đã xảy ra lỗi khi thực thi lệnh giveaway.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};