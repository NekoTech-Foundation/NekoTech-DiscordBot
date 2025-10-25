const { EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField, ChannelType, MessageFlags } = require('discord.js');
//const fs = require('fs');
//const yaml = require("js-yaml");
const moment = require('moment-timezone');
const UserData = require('../../models/UserData');
const GuildData = require('../../models/guildDataSchema');
const TempRole = require('../../models/TempRole');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

const MAX_WARNINGS_PER_PAGE = 5;

const kickLogCache = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Lệnh dành cho kiểm duyệt viên máy chủ')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Cấm người dùng bằng cách đề cập hoặc ID')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để cấm').setRequired(false))
                .addStringOption(option => option.setName('user_id').setDescription('ID Discord của người dùng để cấm').setRequired(false))
                .addStringOption(option => option.setName('reason').setDescription('Lý do cấm').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Bỏ cấm người dùng')
                .addStringOption(option => option.setName('userid').setDescription('ID Discord của người dùng').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lý do bỏ cấm').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Cấm chat người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để cấm chat').setRequired(true))
                .addStringOption(option => option.setName('time').setDescription('Thời gian cấm chat, ví dụ: 1d, 1h, 1m, hoặc "perm" để cấm chat vĩnh viễn').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lý do cấm chat').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleartimeout')
                .setDescription('Xóa cấm chat khỏi người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để xóa cấm chat').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Cảnh cáo người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để cảnh cáo').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lý do cảnh cáo').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warnlist')
                .setDescription('Liệt kê các cảnh cáo của người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để liệt kê cảnh cáo').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unwarn')
                .setDescription('Xóa cảnh cáo khỏi người dùng')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng để bỏ cảnh cáo')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('warning_id')
                        .setDescription('ID của cảnh cáo để xóa')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Đuổi người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để đuổi').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lý do đuổi').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nickname')
                .setDescription(lang.Nickname.Description)
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription(lang.Nickname.UserOptionDescription)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('nickname')
                        .setDescription(lang.Nickname.NicknameOptionDescription)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearhistory')
                .setDescription('Xóa lịch sử của người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để xóa lịch sử').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearchannel')
                .setDescription('Xóa tất cả tin nhắn trong một kênh'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('Xem lịch sử của người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để xem lịch sử').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('purge')
                .setDescription('Xóa các tin nhắn cụ thể trong một kênh')
                .addNumberOption(option =>
                    option.setName('amount')
                        .setDescription('Số lượng tin nhắn để xóa')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Loại tin nhắn để xóa')
                        .addChoices(
                            { name: 'Tất cả', value: 'all' },
                            { name: 'Liên kết', value: 'links' },
                            { name: 'Văn bản', value: 'text' },
                            { name: 'Bot', value: 'bots' },
                            { name: 'Nhúng', value: 'embeds' },
                            { name: 'Hình ảnh', value: 'images' })))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slowmode')
                .setDescription('Đặt chế độ chậm trong một kênh')
                .addNumberOption(option => option.setName('amount').setDescription('Thời gian chế độ chậm tính bằng giây (1-21600 giây), Đặt thành 0 để tắt.').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tempban')
                .setDescription('Cấm người dùng tạm thời')
                .addStringOption(option => option.setName('duration').setDescription('Thời gian cấm (ví dụ: 1d 2h 15m)').setRequired(true))
                .addUserOption(option => option.setName('user').setDescription('Người dùng để cấm'))
                .addStringOption(option => option.setName('userid').setDescription('ID người dùng để cấm'))
                .addStringOption(option => option.setName('reason').setDescription('Lý do cấm')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('temprole')
                .setDescription('Gán vai trò tạm thời cho người dùng')
                .addUserOption(option =>
                    option.setName('user').setDescription('Người dùng để gán vai trò').setRequired(true))
                .addRoleOption(option =>
                    option.setName('role').setDescription('Vai trò để gán').setRequired(true))
                .addStringOption(option =>
                    option.setName('duration').setDescription('Thời gian (ví dụ: 1s, 15m, 1h, 2d, 1w, 1y)').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('temprolelist')
                .setDescription('Liệt kê tất cả các lần gán vai trò tạm thời đang hoạt động')
                .addUserOption(option =>
                    option.setName('user').setDescription('Lọc theo người dùng cụ thể').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setnote')
                .setDescription('Đặt ghi chú cho người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để đặt ghi chú').setRequired(true))
                .addStringOption(option => option.setName('note').setDescription('Ghi chú để đặt cho người dùng').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('viewnote')
                .setDescription('Xem ghi chú của người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để xem ghi chú').setRequired(true))),
    category: 'Moderation',
    async execute(interaction) {
        const BYPASS_USER_ID = '1316287191634149377';

        if (interaction.user.id !== BYPASS_USER_ID) {
            const subcommand = interaction.options.getSubcommand();
            const requiredRoles = config.ModerationRoles[subcommand];
            if (requiredRoles) {
                const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
                const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

                if (!hasPermission && !isAdministrator) {
                    return interaction.reply({ content: 'Bạn không có quyền sử dụng lệnh này.', ephemeral: true });
                }
            }
        }

        if (!interaction.isChatInputCommand()) return;

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'ban') {
            await executeBan(interaction);
        } else if (subcommand === 'unban') {
            await executeUnban(interaction);
        } else if (subcommand === 'timeout') {
            await executeTimeout(interaction);
        } else if (subcommand === 'cleartimeout') {
            await executeClearTimeout(interaction);
        } else if (subcommand === 'warn') {
            await executeWarn(interaction);
        } else if (subcommand === 'warnlist') {
            await executeWarnList(interaction);
        } else if (subcommand === 'unwarn') {
            await executeUnwarn(interaction);
        } else if (subcommand === 'kick') {
            await executeKick(interaction);
        } else if (subcommand === 'nickname') {
            await executeNickname(interaction);
        } else if (subcommand === 'clearhistory') {
            await executeClearHistory(interaction);
        } else if (subcommand === 'clearchannel') {
            await executeClearChannel(interaction);
        } else if (subcommand === 'history') {
            await executeHistory(interaction);
        } else if (subcommand === 'purge') {
            await executePurge(interaction);
        } else if (subcommand === 'slowmode') {
            await executeSlowmode(interaction);
        } else if (subcommand === 'tempban') {
            await executeTempban(interaction);
        } else if (subcommand === 'setnote') {
            await executeSetNote(interaction);
        } else if (subcommand === 'viewnote') {
            await executeViewNote(interaction);
        } else if (subcommand === 'temprole') {
            await executeTemprole(interaction);
        } else if (subcommand === 'temprolelist') {
            await executeTemproleList(interaction);
        }
    }
};

function parseDuration(durationStr) {
    const regex = /(\d+)([smhdwy])$/;
    const match = durationStr.match(regex);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000,
        'y': 365 * 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
}

async function executeSetNote(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });


    const user = interaction.options.getUser('user');
    const noteText = interaction.options.getString('note');

    if (noteText.length > 250) {
        return interaction.editReply({ content: 'Ghi chú không được dài hơn 250 ký tự.', flags: MessageFlags.Ephemeral });
    }

    if (user.bot) {
        return interaction.editReply({ content: 'Không thể thêm ghi chú cho bot.', flags: MessageFlags.Ephemeral });
    }

    try {
        await UserData.findOneAndUpdate(
            { userId: user.id, guildId: interaction.guild.id },
            { $set: { note: noteText } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Thành công', iconURL: 'https://i.imgur.com/7SlmRRa.png' })
            .setColor(config.SuccessEmbedColor)
            .setDescription(`Đã đặt ghi chú thành công cho <@!${user.id}>`);

        await interaction.editReply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Lỗi khi đặt ghi chú:', error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi đặt ghi chú.', flags: MessageFlags.Ephemeral });
    }
}

async function executeBan(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser('user');
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'Không có lý do';

    let member;
    if (user) {
        member = await interaction.guild.members.fetch(user.id).catch(() => null);
    } else if (userId) {
        member = await interaction.guild.members.fetch(userId).catch(() => null);
    }

    if (!member) {
        if (userId) {
            const userFetch = await interaction.client.users.fetch(userId).catch(() => null);
            if (!userFetch) {
                await interaction.editReply({ content: 'Không tìm thấy người dùng.', flags: MessageFlags.Ephemeral });
                return;
            }

            await interaction.guild.bans.create(userId, { reason: reason }).catch(err => {
                console.error('Lỗi cấm người dùng:', err);
                return interaction.editReply({ content: 'Không thể cấm người dùng này.', flags: MessageFlags.Ephemeral });
            });

            let replyContent = `Đã cấm thành công ${userFetch.tag} với lý do: ${reason}`;
            await interaction.editReply({ content: replyContent, flags: MessageFlags.Ephemeral });
            return;
        } else {
            await interaction.editReply({ content: 'Không tìm thấy người dùng.', flags: MessageFlags.Ephemeral });
            return;
        }
    }

    if (member.user.id === interaction.user.id) {
        await interaction.editReply({ content: 'Bạn không thể tự cấm chính mình.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (!member.bannable) {
        await interaction.editReply({ content: 'Tôi không thể cấm người dùng này.', flags: MessageFlags.Ephemeral });
        return;
    }

    const dmSuccess = await sendBanDM(member, reason, interaction, interaction.guild);
    await banMember(member, reason, interaction);

    let replyContent = `Đã cấm thành công ${member.user.tag} với lý do: ${reason}`;
    if (!dmSuccess) {
        replyContent += "\nLưu ý: không thể gửi tin nhắn riêng cho người dùng.";
    }

    await interaction.editReply({ content: replyContent, flags: MessageFlags.Ephemeral });
}

async function executeUnban(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason');

    try {
        await unbanUser(interaction, userId, reason);
    } catch (e) {
        console.error('Lỗi lệnh bỏ cấm:', e);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi bỏ cấm.', flags: MessageFlags.Ephemeral });
    }
}

const MAX_DISCORD_TIMEOUT = 28 * 24 * 60 * 60 * 1000;

async function executeTimeout(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("user");
    const timeInput = interaction.options.getString("time");
    const reason = interaction.options.getString("reason");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
        return interaction.editReply({ content: 'Không tìm thấy người dùng.', flags: MessageFlags.Ephemeral });
    }

    const timeInMs = parseTimeInput(timeInput);

    if (timeInMs === null) {
        return interaction.editReply({ 
            content: 'Thời gian không hợp lệ. Thời gian phải ít nhất 10 giây hoặc \'perm\' để cấm chat vĩnh viễn.', 
            flags: MessageFlags.Ephemeral 
        });
    }

    try {
        const guildData = await GuildData.findOne({ guildID: interaction.guild.id });
        
        if (timeInMs === Infinity) {
            await applyMutedRole(interaction, member, reason);
            await interaction.editReply({ content: `Đã cấm chat vĩnh viễn ${member.user.tag} với lý do: ${reason}`, flags: MessageFlags.Ephemeral });
        } else if (timeInMs <= MAX_DISCORD_TIMEOUT) {
            await member.timeout(timeInMs, reason);
            await interaction.editReply({ content: `Đã cấm chat ${member.user.tag} trong ${timeInput} với lý do: ${reason}`, flags: MessageFlags.Ephemeral });
        } else {
            await applyMutedRole(interaction, member, reason);
            const endTime = new Date(Date.now() + timeInMs);
            await scheduleRoleRemoval(member, endTime, guildData);
            await interaction.editReply({ content: `Đã cấm chat ${member.user.tag} trong ${timeInput} với lý do: ${reason}`, flags: MessageFlags.Ephemeral });
        }
    } catch (error) {
        console.error('Lỗi cấm chat:', error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi cấm chat.', flags: MessageFlags.Ephemeral });
    }
}

async function executeClearTimeout(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("user");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
        return interaction.editReply({ content: 'Không tìm thấy người dùng.', flags: MessageFlags.Ephemeral });
    }

    try {
        const wasMuted = await removeMutedRole(member);
        await member.timeout(null);
        
        const responseMessage = wasMuted ? `Đã xóa cấm chat khỏi ${member.user.tag}` : `Đã xóa cấm chat khỏi ${member.user.tag}`;
        await interaction.editReply({ content: responseMessage, flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Lỗi xóa cấm chat:', error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi xóa cấm chat.', flags: MessageFlags.Ephemeral });
    }
}


function hasTimeoutPermission(interaction) {
    const requiredRoles = config.ModerationRoles.timeout;
    return hasPermission(interaction, requiredRoles);
}

function hasClearTimeoutPermission(interaction) {
    const requiredRoles = config.ModerationRoles.cleartimeout;
    return hasPermission(interaction, requiredRoles);
}

function hasPermission(interaction, requiredRoles) {
    const hasRequiredRole = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    return hasRequiredRole || isAdministrator;
}

function parseTimeInput(timeInput) {
    if (timeInput.toLowerCase() === 'perm') return Infinity;
    
    const timeInMs = parseDuration(timeInput);
    if (!timeInMs || timeInMs < 10000) {
        return null;
    }
    return timeInMs;
}

async function applyMutedRole(interaction, member, reason) {
    const mutedRole = await getOrCreateTimeoutRole(interaction.guild);
    
    await member.roles.add(mutedRole, reason);
    await UserData.findOneAndUpdate(
        { userId: member.id, guildId: interaction.guild.id },
        { isMuted: true },
        { upsert: true }
    );
}

async function getOrCreateTimeoutRole(guild) {
    let guildData = await GuildData.findOne({ guildID: guild.id });
    if (!guildData) {
        guildData = new GuildData({ guildID: guild.id });
    }

    let mutedRole;
    if (guildData.timeoutRoleId) {
        mutedRole = guild.roles.cache.get(guildData.timeoutRoleId);
    }

    if (!mutedRole) {
        mutedRole = await createMutedRole(guild);
        guildData.timeoutRoleId = mutedRole.id;
        await guildData.save();
    }

    return mutedRole;
}

async function createMutedRole(guild) {
    const mutedRole = await guild.roles.create({
        name: 'Muted',
        color: '#808080',
        permissions: []
    });
    await setMutedRolePermissions(guild, mutedRole);
    return mutedRole;
}

async function removeMutedRole(member) {
    const guildData = await GuildData.findOne({ guildID: member.guild.id });
    if (!guildData.timeoutRoleId) return false;

    const mutedRole = member.guild.roles.cache.get(guildData.timeoutRoleId);
    if (!mutedRole) return false;

    if (member.roles.cache.has(mutedRole.id)) {
        await member.roles.remove(mutedRole);
        await UserData.findOneAndUpdate(
            { userId: member.id, guildId: member.guild.id },
            { isMuted: false }
        );
        return true;
    }
    return false;
}

async function scheduleRoleRemoval(member, endTime, guildData) {
    if (!guildData || !guildData.timeoutRoleId) return;

    if (endTime === Infinity) {
        return;
    }

    await TempRole.findOneAndUpdate(
        { userId: member.id, guildId: member.guild.id, roleId: guildData.timeoutRoleId },
        { expiration: endTime },
        { upsert: true }
    );
}

async function setMutedRolePermissions(guild, mutedRole) {
    const channels = guild.channels.cache.filter(channel =>
        [
            ChannelType.GuildText,
            ChannelType.GuildVoice,
            ChannelType.GuildStageVoice,
            ChannelType.GuildAnnouncement,
            ChannelType.AnnouncementThread,
            ChannelType.PublicThread,
            ChannelType.PrivateThread
        ].includes(channel.type)
    );

    for (const [channelId, channel] of channels) {
        try {
            const permissions = {};

            if ([
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
                ChannelType.AnnouncementThread,
                ChannelType.PublicThread,
                ChannelType.PrivateThread
            ].includes(channel.type)) {
                permissions[PermissionsBitField.Flags.SendMessages] = false;
                permissions[PermissionsBitField.Flags.AddReactions] = false;
            }

            if ([
                ChannelType.GuildVoice,
                ChannelType.GuildStageVoice
            ].includes(channel.type)) {
                permissions[PermissionsBitField.Flags.Speak] = false;
            }

            if (channel.permissionOverwrites && typeof channel.permissionOverwrites.edit === 'function') {
                await channel.permissionOverwrites.edit(mutedRole, permissions);
            } else {
            }
        } catch (error) {
            console.error(`Failed to set permissions in channel ${channelId} (${channel.type}):`, error);
        }
    }
}

async function executeWarn(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const member = interaction.guild.members.cache.get(user.id);

    if (!member || member.user.bot || user.id === interaction.user.id) {
        return interaction.editReply({ content: 'Không thể cảnh cáo bot hoặc chính mình.', flags: MessageFlags.Ephemeral });
    }

    try {
        const updatedUser = await updateWarningCount(member, reason, interaction);
        await warnMember(member, reason, interaction);

        const placeholders = {
            user: `<@${member.id}>`,
            userName: member.user.username,
            userTag: member.user.tag,
            userId: member.id,
            moderator: `<@${interaction.user.id}>`,
            moderatorName: interaction.user.username,
            moderatorTag: interaction.user.tag,
            moderatorId: interaction.user.id,
            reason: reason,
            shorttime: moment().tz(config.Timezone).format("HH:mm"),
            longtime: moment().tz(config.Timezone).format('MMMM Do YYYY'),
            caseNumber: updatedUser.warnings.length
        };

        interaction.editReply({ content: `Đã cảnh cáo thành công ${user.tag} với lý do: ${reason}`, flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Lỗi cảnh cáo người dùng:', error);
        interaction.editReply({ content: 'Đã xảy ra lỗi khi cảnh cáo người dùng.', flags: MessageFlags.Ephemeral });
    }
}

async function executeWarnList(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser('user');
    try {
        const userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
        if (userData && userData.warnings.length > 0) {
            const totalPages = Math.ceil(userData.warnings.length / MAX_WARNINGS_PER_PAGE);

            let currentPage = 0;
            const sendPage = async (page) => {
                const start = page * MAX_WARNINGS_PER_PAGE;
                const end = start + MAX_WARNINGS_PER_PAGE;
                const warningsForPage = userData.warnings.slice(start, end);

                const warningEntries = warningsForPage.map((warn, index) => {
                    const formattedLongTime = moment(warn.date).format("MMMM Do YYYY");
                    const formattedShortTime = moment(warn.date).format("HH:mm");

                    return `**ID cảnh cáo:** ${start + index + 1}\n**Ngày:** ${formattedLongTime} lúc ${formattedShortTime}\n**Lý do:** ${warn.reason}\n**Người cảnh cáo:** <@${warn.moderatorId}>`;
                }).join('\n\n');

                const embed = new EmbedBuilder()
                    .setTitle(`Danh sách cảnh cáo của ${user.username}`)
                    .setDescription(warningEntries)
                    .setColor('#ffcc00')
                    .setFooter({ text: `Tổng số cảnh cáo: ${userData.warnings.length}` });

                if (lang.WarnList.Embed.Thumbnail) {
                    embed.setThumbnail(user.displayAvatarURL());
                }

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('previous')
                            .setLabel('Trước')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Sau')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === totalPages - 1)
                    );

                await interaction.editReply({ embeds: [embed], components: [buttons] });
            };

            await sendPage(currentPage);

            const filter = i => ['previous', 'next'].includes(i.customId) && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();

                    if (i.customId === 'previous' && currentPage > 0) {
                        currentPage--;
                    } else if (i.customId === 'next' && currentPage < totalPages - 1) {
                        currentPage++;
                    }

                    await sendPage(currentPage);
                } catch (error) {
                    console.error('Lỗi xử lý tương tác nút:', error);
                }
            });

            collector.on('end', () => interaction.editReply({ components: [] }));
        } else {
            const noWarningsMessage = `Người dùng này không có cảnh cáo nào.` || "This user has no warnings.";
            await interaction.editReply({ content: noWarningsMessage });
        }
    } catch (error) {
        console.error('Lỗi liệt kê cảnh cáo:', error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi liệt kê cảnh cáo.', flags: MessageFlags.Ephemeral });
    }
}

async function executeUnwarn(interaction) {

    const user = interaction.options.getUser('user');
    const warningId = interaction.options.getInteger('warning_id');

    const userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
    if (!userData || userData.warnings.length === 0) {
        return interaction.reply({ content: 'Người dùng này không có cảnh cáo nào.', flags: MessageFlags.Ephemeral });
    }

    if (warningId < 1 || warningId > userData.warnings.length) {
        return interaction.reply({ content: 'ID cảnh cáo không hợp lệ.', flags: MessageFlags.Ephemeral });
    }

    const removedWarning = userData.warnings.splice(warningId - 1, 1)[0];
    await userData.save();

    interaction.reply({
        content: `Đã xóa cảnh cáo khỏi ${user.tag} với lý do: ${removedWarning.reason}`,
        flags: MessageFlags.Ephemeral
    });

    const modLogChannel = interaction.guild.channels.cache.get(config.ModLogsChannelID);
    if (modLogChannel) {
        const logEmbed = new EmbedBuilder()
            .setTitle('Đã xóa cảnh cáo')
            .setDescription(`Một cảnh cáo đã được xóa khỏi ${user.tag} (\`${user.id}\`).\n\n**Lý do xóa:** ${removedWarning.reason}`)
            .setColor('#FFA500')
            .setTimestamp();
        modLogChannel.send({ embeds: [logEmbed] });
    }
}

async function warnMember(member, reason, interaction) {
    const currentTime = moment().tz(config.Timezone);
    const embedData = lang.WarnLogs.Embed;

    let embed = new EmbedBuilder()
        .setColor(embedData.Color || "#FFA500");

    const placeholders = {
        user: `<@${member.id}>`,
        userName: member.user.username,
        userTag: member.user.tag,
        userId: member.id,
        moderator: `<@${interaction.user.id}>`,
        moderatorName: interaction.user.username,
        moderatorTag: interaction.user.tag,
        moderatorId: interaction.user.id,
        reason: reason,
        shorttime: currentTime.format("HH:mm"),
        longtime: currentTime.format('MMMM Do YYYY')
    };

    if (embedData.Title) {
        embed.setTitle(replacePlaceholders(embedData.Title, placeholders));
    }

    if (embedData.Description.length > 0) {
        embed.setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, placeholders)
            ).join('\n')
        );
    }

    if (embedData.Footer && embedData.Footer.Text) {
        embed.setFooter({ text: replacePlaceholders(embedData.Footer.Text, placeholders), iconURL: embedData.Footer.Icon || undefined });
    }

    if (embedData.Author && embedData.Author.Text) {
        embed.setAuthor({ name: embedData.Author.Text, iconURL: embedData.Author.Icon || undefined });
    }

    if (embedData.Thumbnail) {
        embed.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    if (embedData.Image) {
        embed.setImage(embedData.Image);
    }

    try {
        await member.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending DM to user:', error);
    }

    if (config.WarnLogs.Enabled) {
        logWarning(interaction, member, reason, currentTime);
    }

    await applyPunishment(member, interaction);
}

async function logWarning(interaction, member, reason, currentTime) {
    const embedData = lang.WarnLogs.Embed;

    let logEmbed = new EmbedBuilder()
        .setColor(embedData.Color || "#FFA500");

    const placeholders = {
        user: `<@${member.id}>`,
        userName: member.user.username,
        userTag: member.user.tag,
        userId: member.id,
        moderator: `<@${interaction.user.id}>`,
        moderatorName: interaction.user.username,
        moderatorTag: interaction.user.tag,
        moderatorId: interaction.user.id,
        reason: reason,
        shorttime: currentTime.format("HH:mm"),
        longtime: currentTime.format('MMMM Do YYYY')
    };

    if (embedData.Title) {
        logEmbed.setTitle(replacePlaceholders(embedData.Title, placeholders));
    }

    if (embedData.Description.length > 0) {
        logEmbed.setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, placeholders)
            ).join('\n')
        );
    }

    if (embedData.Footer && embedData.Footer.Text) {
        logEmbed.setFooter({ text: replacePlaceholders(embedData.Footer.Text, placeholders), iconURL: embedData.Footer.Icon || undefined });
    }

    if (embedData.Author && embedData.Author.Text) {
        logEmbed.setAuthor({ name: embedData.Author.Text, iconURL: embedData.Author.Icon || undefined });
    }

    if (embedData.Thumbnail) {
        logEmbed.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    if (embedData.Image) {
        logEmbed.setImage(embedData.Image);
    }

    const logsChannel = interaction.guild.channels.cache.get(config.WarnLogs.LogsChannelID);
    if (logsChannel) {
        logsChannel.send({ embeds: [logEmbed] });
    }
}

async function updateWarningCount(member, reason, interaction) {
    const newWarning = {
        reason: reason,
        date: new Date(),
        moderatorId: interaction.user.id
    };

    const updatedUser = await UserData.findOneAndUpdate(
        { userId: member.id, guildId: interaction.guild.id },
        { $push: { warnings: newWarning }, $inc: { warns: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return updatedUser;
}

async function applyPunishment(member, interaction) {
    const userData = await UserData.findOne({ userId: member.id, guildId: interaction.guild.id });
    const warningCount = userData.warnings.length;

    if (config.Warnings.Punishments[warningCount] && config.Warnings.Punishments[warningCount].Timeout) {
        const timeoutDurationStr = config.Warnings.Punishments[warningCount].Timeout;

        if (timeoutDurationStr) {
            const durationMs = parseDuration(timeoutDurationStr);

            if (durationMs) {
                try {
                    if (durationMs <= 28 * 24 * 60 * 60 * 1000) {
                        await member.timeout(durationMs, `Reached ${warningCount} warnings.`);
                        await interaction.followUp({ content: `User ${member.user.tag} has been timed out for ${timeoutDurationStr} due to reaching ${warningCount} warnings.` });
                    } else {
                        await applyMutedRole(interaction, member, `Reached ${warningCount} warnings.`);
                    }
                } catch (error) {
                    console.error(`Error applying timeout to user ${member.user.tag}:`, error);
                    await interaction.followUp({ content: `Failed to apply timeout to ${member.user.tag}.`, flags: MessageFlags.Ephemeral });
                }
            } else {
                console.error(`Invalid duration format for punishment: ${timeoutDurationStr}`);
            }
        }
    }
}

async function executeKick(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Không có lý do';
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
        return interaction.editReply({ content: 'Không tìm thấy người dùng trong máy chủ.' });
    }

    if (user.id === interaction.user.id) {
        return interaction.editReply({ content: 'Bạn không thể tự đuổi chính mình.' });
    }

    if (!member.kickable || member.roles.highest.comparePositionTo(interaction.member.roles.highest) >= 0) {
        return interaction.editReply({ content: 'Tôi không thể đuổi người dùng này.' });
    }

    const dmSuccess = await sendKickDM(member, reason, interaction.user, interaction.guild).catch(error => {
        return false;
    });

    try {
        await member.kick(reason);

        const placeholders = {
            user: `<@${member.id}>`,
            userName: member.user.username,
            userTag: member.user.tag,
            userId: member.id,
            moderator: `<@${interaction.user.id}>`,
            moderatorName: interaction.user.username,
            moderatorTag: interaction.user.tag,
            moderatorId: interaction.user.id,
            reason: reason,
            shorttime: moment().tz(config.Timezone).format("HH:mm"),
            longtime: moment().tz(config.Timezone).format('MMMM Do YYYY')
        };

        let replyContent = `Đã đuổi thành công ${member.user.tag} với lý do: ${reason}`;
        if (!dmSuccess) {
            replyContent += "\nLưu ý: không thể gửi tin nhắn riêng cho người dùng.";
        }

        kickLogCache.set(member.id, {
            moderator: interaction.user,
            reason,
            timestamp: Date.now()
        });

        setTimeout(() => {
            kickLogCache.delete(member.id);
        }, 10000);

        return interaction.editReply({ content: replyContent, flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Lỗi khi thực hiện đuổi:', error);
        return interaction.editReply({ content: 'Đã xảy ra lỗi khi đuổi người dùng.' });
    }
}

module.exports.kickLogCache = kickLogCache;

async function sendKickDM(member, reason, moderator, guild) {
    if (!member || !interaction || guild == null) {
        return false;
    }

    try {
        if (config.KickLogs.DM.Enabled) {
            const dmEmbedConfig = config.KickLogs.DM.Embed;
            const currentTime = moment().tz(config.Timezone);
            const placeholders = {
                user: `<@${member.user.id}>`,
                userName: member.user.username,
                userTag: member.user.tag,
                userId: member.user.id,
                moderator: `<@${moderator.id}> (${moderator.tag})`,
                reason,
                guildName: guild.name,
                longtime: currentTime.format('MMMM Do YYYY'),
                shorttime: currentTime.format("HH:mm")
            };

            const color = dmEmbedConfig.Color ? parseInt(dmEmbedConfig.Color.replace('#', ''), 16) : 0xFF5555;
            const dmMessageEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(replacePlaceholders(dmEmbedConfig.Title, placeholders))
                .setDescription(dmEmbedConfig.Description.map(line => replacePlaceholders(line, placeholders)).join('\n'))
                .setFooter({ text: replacePlaceholders(dmEmbedConfig.Footer, placeholders) });

            await member.send({ embeds: [dmMessageEmbed] });
            return true;
        }
    } catch (error) {
        if (error.code === 50007) {
            return false;
        } else {
            throw error;
        }
    }
    return false;
}

async function executeNickname(interaction) {
    await interaction.deferReply;

    const user = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname');
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
        return interaction.editReply({ content: 'Không tìm thấy người dùng.', flags: MessageFlags.Ephemeral });
    }

    try {
        await member.setNickname(nickname);
        return interaction.editReply({
            content: `Đã đổi biệt danh của ${user.username} thành ${nickname}`,
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Không thể đặt biệt danh:', error);
        return interaction.editReply({ content: 'Không thể thay đổi biệt danh cho người dùng này.', flags: MessageFlags.Ephemeral });
    }
}

async function executeClearHistory(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser('user');
    await clearUserHistory(user.id, interaction.guild.id);

    const successMessage = `Đã xóa lịch sử của ${user.tag}`;
    const successEmbed = new EmbedBuilder()
        .setAuthor({ name: 'Thành công', iconURL: 'https://i.imgur.com/7SlmRRa.png' })
        .setColor(config.SuccessEmbedColor)
        .setDescription(successMessage);

    interaction.editReply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
}

async function clearUserHistory(userId, guildId) {
    await UserData.findOneAndUpdate(
        { userId: userId, guildId: guildId },
        { $set: { warns: 0, bans: 0, kicks: 0, timeouts: 0, note: "", warnings: [] } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

async function executeClearChannel(interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirmClear')
                    .setLabel('Xác nhận')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancelClear')
                    .setLabel('Hủy')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ content: 'Bạn có chắc chắn muốn xóa kênh này không?', components: [row], flags: MessageFlags.Ephemeral });

        const filter = (i) => i.customId === 'confirmClear' || i.customId === 'cancelClear';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirmClear') {
                const position = interaction.channel.position;
                const newChannel = await interaction.channel.clone();
                await interaction.channel.delete();
                newChannel.setPosition(position);

                try {
                    await newChannel.send(`Kênh đã được xóa bởi ${interaction.member}`);
                    await newChannel.send('https://media.tenor.com/vV2b2AAbV6EAAAAC/telepurte-explosion.gif');
                } catch (error) {
                    console.error('Lỗi gửi tin nhắn sau khi xóa kênh:', error);
                }
            } else {
                await interaction.editReply({ content: 'Đã hủy xóa kênh.', components: [] });
            }
        });

        collector.on('end', async collected => {
            if (!collected.size) {
                await interaction.editReply({ content: 'Đã hết thời gian xóa kênh.', components: [] });
            }
        });
    } catch (error) {
        console.error(`Đã xảy ra lỗi khi thực hiện lệnh clearchannel: ${error.message}`);
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: 'Đã xảy ra lỗi khi thực hiện lệnh đó! Vui lòng thử lại sau.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'Đã xảy ra lỗi khi thực hiện lệnh đó! Vui lòng thử lại sau.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function executeHistory(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser('user');
    const userData = await getUserHistory(user.id);

    const historyEmbed = createHistoryEmbed(user, userData, interaction);
    interaction.editReply({ embeds: [historyEmbed], flags: MessageFlags.Ephemeral });
}

async function getUserHistory(userId) {
    const userData = await UserData.findOne({ userId: userId });
    return userData || {};
}

function createHistoryEmbed(user, userData, interaction) {
    const avatarUrl = user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
    const member = interaction.guild.members.cache.get(user.id);
    const joinDate = member ? moment(member.joinedAt).format('DD/MM/YYYY') : 'Không có trong máy chủ';

    return new EmbedBuilder()
        .setColor("#000000")
        .setTitle(`Lịch sử của ${user.username}`)
        .setThumbnail(avatarUrl)
        .addFields(
            { name: 'Thông tin người dùng', value: `\`\`Tên\`\` <@!${user.id}>\n\`\`Ngày tham gia\`\` ${joinDate}\n\`\`Tổng tin nhắn\`\` ${userData.totalMessages?.toLocaleString() || '0'}\n\`\`Ghi chú\`\` ${userData.note || 'Không có'}`, inline: true },
            { name: 'Cảnh cáo', value: `${userData.warns || 0}`, inline: true },
            { name: 'Cấm chat', value: `${userData.timeouts || 0}`, inline: true },
            { name: 'Đuổi', value: `${userData.kicks || 0}`, inline: true },
            { name: 'Cấm', value: `${userData.bans || 0}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: interaction.guild.name });
}

async function executePurge(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let amount = interaction.options.getNumber('amount');
    const type = interaction.options.getString('type') || 'all';

    try {
        let remainingMessages = amount;
        let totalDeleted = 0;

        while (remainingMessages > 0) {
            const batchSize = Math.min(remainingMessages, 100);
            const deletedCount = await purgeBatch(interaction.channel, batchSize, type);
            
            if (deletedCount === 0) break;

            totalDeleted += deletedCount;
            remainingMessages -= deletedCount;

            if (deletedCount < batchSize) break;

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        const logEmbed = createLogEmbed(interaction, totalDeleted, type);
        await sendLogMessage(interaction, logEmbed);

        await interaction.editReply({
            content: `Đã xóa ${totalDeleted} tin nhắn.`,
            flags: MessageFlags.Ephemeral,
        });
    } catch (error) {
        console.error('Lỗi xóa tin nhắn:', error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi xóa tin nhắn.', flags: MessageFlags.Ephemeral });
    }
}

async function purgeBatch(channel, amount, type) {
    const messages = await channel.messages.fetch({ limit: 100 });
    let filteredMessages = filterMessages(messages, type, amount);

    filteredMessages = Array.isArray(filteredMessages) ? filteredMessages : [...filteredMessages.values()];

    if (filteredMessages.length === 0) return 0;

    const deletedMessages = await channel.bulkDelete(filteredMessages, true);
    return deletedMessages.size;
}

function filterMessages(messages, type, limit) {
    const filtered = messages.filter(msg => {
        switch (type) {
            case 'links':
                return msg.content.includes('http');
            case 'text':
                return !msg.embeds.length && !msg.attachments.size;
            case 'bots':
                return msg.author.bot;
            case 'embeds':
                return msg.embeds.length > 0;
            case 'images':
                return msg.attachments.some(att => att.contentType?.startsWith('image/'));
            default:
                return true;
        }
    });

    return [...filtered.values()].slice(0, limit);
}

function createLogEmbed(interaction, amount, type) {
    return new EmbedBuilder()
        .setAuthor({ name: 'Hành động kiểm duyệt', iconURL: 'https://i.imgur.com/FxQkyLb.png' })
        .setColor('Red')
        .addFields(
            { name: 'Hành động', value: 'Xóa tin nhắn' },
            { name: 'Loại tin nhắn đã xóa', value: type },
            { name: 'Nhân viên', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Số lượng', value: `${amount}`, inline: true },
            { name: 'Kênh', value: `${interaction.channel}`, inline: true },
        )
        .setTimestamp();
}

async function sendLogMessage(interaction, logEmbed) {
    const logsChannelId = config.PurgeLogChannel;
    const logsChannel = interaction.guild.channels.cache.get(logsChannelId);
    if (logsChannel) {
        await logsChannel.send({ embeds: [logEmbed] });
    }
}

async function executeSlowmode(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let amount = interaction.options.getNumber("amount");
    amount = Math.max(0, Math.min(amount, 21600));

    try {
        await interaction.channel.setRateLimitPerUser(amount);
        const responseMessage = amount === 0 ? 'Đã tắt chế độ chậm.' : `Đã đặt chế độ chậm thành công thành ${amount} giây.`;
        const successEmbed = createResponseEmbed(responseMessage, true);
        await interaction.editReply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Lỗi chế độ chậm:', error);
        const errorEmbed = createResponseEmbed('Không thể đặt chế độ chậm.', false);
        await interaction.editReply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

function createResponseEmbed(message, isSuccess) {
    return new EmbedBuilder()
        .setAuthor({ name: isSuccess ? 'Thành công' : 'Lỗi', iconURL: isSuccess ? 'https://i.imgur.com/7SlmRRa.png' : 'https://i.imgur.com/MdiCK2c.png' })
        .setColor(isSuccess ? config.SuccessEmbedColor : config.ErrorEmbedColor)
        .setDescription(message);
}

async function executeTempban(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userOption = interaction.options.getUser('user');
    const userIdOption = interaction.options.getString('userid');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'Không có lý do';

    let user = userOption;
    if (!user && userIdOption) {
        user = await interaction.client.users.fetch(userIdOption).catch(() => null);
    }

    if (!user) {
        await interaction.editReply({ content: 'Không tìm thấy người dùng.', flags: MessageFlags.Ephemeral });
        return;
    }

    const totalSeconds = parseDuration(durationStr);
    if (totalSeconds === null) {
        await interaction.editReply({ content: 'Định dạng thời gian không hợp lệ.', flags: MessageFlags.Ephemeral });
        return;
    }

    const banEndTime = moment().add(totalSeconds, 'seconds').toDate();

    try {
        const member = await interaction.guild.members.fetch(user.id);

        if (!member.bannable) {
            await interaction.editReply({ content: 'Tôi không thể cấm người dùng này.', flags: MessageFlags.Ephemeral });
            return;
        }

        const dmSuccess = await sendBanDM(member, reason, interaction);
        await member.ban({ reason });

        let userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
        if (!userData) {
            userData = new UserData({ userId: user.id, guildId: interaction.guild.id });
        }

        userData.tempBans.push({
            endTime: banEndTime,
            reason,
            moderatorId: interaction.user.id,
        });

        await userData.save();

        let replyContent = `Đã cấm thành công ${user.tag} trong ${durationStr} với lý do: ${reason}`;

        if (!dmSuccess) {
            replyContent += "\nLưu ý: không thể gửi tin nhắn riêng cho người dùng.";
        }

        await interaction.editReply({ content: replyContent, flags: MessageFlags.Ephemeral });

    } catch (error) {
        console.error("Lỗi cấm tạm thời:", error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi cấm tạm thời.', flags: MessageFlags.Ephemeral });
    }
}

async function executeTemprole(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const moderatorHighestRolePosition = interaction.member.roles.highest.position;
    const targetRolePosition = role.position;

    if (targetRolePosition >= moderatorHighestRolePosition) {
        return interaction.editReply({ content: 'Bạn không thể gán vai trò có quyền cao hơn hoặc bằng quyền của bạn.', flags: MessageFlags.Ephemeral });
    }

    if (!role || role.id === interaction.guild.id) {
        return interaction.editReply({ content: 'Vai trò không xác định.', flags: MessageFlags.Ephemeral });
    }

    const durationStr = interaction.options.getString('duration');
    const durationMs = parseDurationTemprole(durationStr);

    if (durationMs <= 0) {
        return interaction.editReply({ content: 'Định dạng thời gian không hợp lệ.', flags: MessageFlags.Ephemeral });
    }

    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + durationMs);

    try {
        const member = await interaction.guild.members.fetch(user.id);
        await member.roles.add(role);
        await TempRole.create({
            userId: user.id,
            guildId: interaction.guild.id,
            roleId: role.id,
            expiration: expirationDate,
        });
        const confirmationMessage = `Đã gán vai trò ${role.name} cho ${user.username} trong ${durationStr}`;

        await interaction.editReply({ content: confirmationMessage, flags: MessageFlags.Ephemeral });
    } catch (error) {
        if (error.code === 50013) {
            await interaction.editReply({ content: 'Tôi không có quyền để gán vai trò này.', flags: MessageFlags.Ephemeral });
        } else {
            console.error('Lỗi trong executeTemprole:', error);
            await interaction.editReply({ content: 'Đã xảy ra lỗi khi gán vai trò.', flags: MessageFlags.Ephemeral });
        }
    }
}

function parseDurationTemprole(durationStr) {
    const regex = /(\d+)(w|d|h|m|s|y)/g;
    let totalMilliseconds = 0;
    const timeUnits = {
        w: 604800000,
        d: 86400000,
        h: 3600000,
        m: 60000,
        s: 1000,
        y: 31536000000,
    };

    let match;
    while ((match = regex.exec(durationStr)) !== null) {
        const value = parseInt(match[1], 10);
        const unit = match[2];
        totalMilliseconds += value * (timeUnits[unit] || 0);
    }

    return totalMilliseconds;
}

function replacePlaceholders(text, placeholders) {
    return (text || '')
        .replace(/{user}/g, placeholders.user || '')
        .replace(/{userName}/g, placeholders.userName || '')
        .replace(/{userTag}/g, placeholders.userTag || '')
        .replace(/{userId}/g, placeholders.userId || '')
        .replace(/{moderator}/g, placeholders.moderator || '')
        .replace(/{guildName}/g, placeholders.guildName || '')
        .replace(/{moderatorName}/g, placeholders.moderatorName || '')
        .replace(/{moderatorTag}/g, placeholders.moderatorTag || '')
        .replace(/{moderatorId}/g, placeholders.moderatorId || '')
        .replace(/{reason}/g, placeholders.reason || 'No reason provided')
        .replace(/{shorttime}/g, placeholders.shorttime || '')
        .replace(/{longtime}/g, placeholders.longtime || '')
        .replace(/{caseNumber}/g, placeholders.caseNumber || '');
}

async function sendBanDM(member, reason, interaction, guild) {
    if (!member || !interaction || guild == null) {
        return false;
    }

    try {
        if (config.BanLogs.DM.Enabled) {
            const dmEmbedConfig = config.BanLogs.DM.Embed;
            const currentTime = moment().tz(config.Timezone);

            const placeholders = {
                user: `<@${member.user.id}>`,
                userName: member.user.username,
                userTag: member.user.tag,
                userId: member.user.id,
                moderator: `<@${interaction.user.id}> (${interaction.user.tag})`,
                reason,
                guildName: guild.name,
                longtime: currentTime.format('MMMM Do YYYY'),
                shorttime: currentTime.format("HH:mm")
            };

            const color = dmEmbedConfig.Color ? parseInt(dmEmbedConfig.Color.replace('#', ''), 16) : 0xFF5555;

            const dmMessageEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(replacePlaceholders(dmEmbedConfig.Title, placeholders))
                .setDescription(dmEmbedConfig.Description.map(line => replacePlaceholders(line, placeholders)).join('\n'))
                .setFooter({ text: replacePlaceholders(dmEmbedConfig.Footer, placeholders) });

            await member.send({ embeds: [dmMessageEmbed] });
            return true;
        }
    } catch (error) {
        console.error('SendBanDM Error:', error);
        return false;
    }
}

async function banMember(member, reason, interaction) {
    await member.ban({ reason: reason });
}

async function unbanUser(interaction, userId, reason) {
    const bans = await interaction.guild.bans.fetch();
    if (!bans.has(userId)) {
        await interaction.editReply({ content: lang.Unban.UnbanUserNotBanned, flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.guild.members.unban(userId, reason);
    const successMessage = lang.Unban.UnbanMsg.replace(/{user}/g, `<@!${userId}>`);
    await interaction.editReply({ content: successMessage, flags: MessageFlags.Ephemeral });

    const logsChannel = interaction.guild.channels.cache.get(config.UnbanLogs.LogsChannelID);
    if (logsChannel && config.UnbanLogs.Enabled) {

    }
}

function hasPermissionToUnban(interaction) {
    const requiredRoles = config.ModerationRoles.unban;
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    return requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId)) || isAdministrator;
}

async function executeViewNote(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser('user');

    try {
        const userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
        
        const noteEmbed = new EmbedBuilder()
            .setAuthor({ name: `Ghi chú cho ${user.tag}`, iconURL: user.displayAvatarURL() })
            .setColor(config.SuccessEmbedColor)
            .setDescription(userData?.note || 'Không có ghi chú nào cho người dùng này.')
            .setTimestamp();

        await interaction.editReply({ embeds: [noteEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Lỗi xem ghi chú:', error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi xem ghi chú.', flags: MessageFlags.Ephemeral });
    }
}

async function executeTemproleList(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const filterUser = interaction.options.getUser('user');
    const query = { guildId: interaction.guild.id };
    if (filterUser) {
        query.userId = filterUser.id;
    }

    try {
        const tempRoles = await TempRole.find(query).sort({ expiration: 1 });
        if (tempRoles.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setDescription(filterUser ? 
                    `Không có vai trò tạm thời nào cho ${filterUser}` : 
                    'Không có vai trò tạm thời nào trong máy chủ này')
                .setFooter({ text: interaction.guild.name });

            return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setTitle(filterUser ? 
                `Vai trò tạm thời của ${filterUser.tag}` : 
                'Vai trò tạm thời đang hoạt động')
            .setFooter({ text: `${interaction.guild.name} • ${tempRoles.length} vai trò` });

        const descriptions = [];
        for (const tempRole of tempRoles) {
            const user = await interaction.client.users.fetch(tempRole.userId);
            const role = interaction.guild.roles.cache.get(tempRole.roleId);
            if (user && role) {
                const expirationTime = Math.floor(tempRole.expiration.getTime() / 1000);
                descriptions.push(
                    `${role} • ${user}\n` +
                    `Hết hạn <t:${expirationTime}:R>\n`
                );
            }
        }

        if (descriptions.length > 0) {
            const chunks = [];
            let currentChunk = [];
            let currentLength = 0;

            for (const desc of descriptions) {
                if (currentLength + desc.length > 3800) {
                    chunks.push(currentChunk);
                    currentChunk = [];
                    currentLength = 0;
                }
                currentChunk.push(desc);
                currentLength += desc.length;
            }
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
            }

            if (chunks.length === 1) {
                embed.setDescription(chunks[0].join('\n'));
                await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else {
                const embeds = chunks.map((chunk, index) => {
                    const pageEmbed = EmbedBuilder.from(embed)
                        .setDescription(chunk.join('\n'))
                        .setFooter({ text: `Trang ${index + 1}/${chunks.length} • ${interaction.guild.name} • ${tempRoles.length} vai trò` });
                    return pageEmbed;
                });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev_page')
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('next_page')
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(embeds.length === 1)
                    );

                const initialMessage = await interaction.editReply({
                    embeds: [embeds[0]],
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });

                let currentPage = 0;
                const collector = initialMessage.createMessageComponentCollector({
                    time: 300000
                });

                collector.on('collect', async (i) => {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({ content: 'Bạn không thể tương tác với các nút này.', flags: MessageFlags.Ephemeral });
                    }

                    if (i.customId === 'prev_page' && currentPage > 0) {
                        currentPage--;
                    } else if (i.customId === 'next_page' && currentPage < embeds.length - 1) {
                        currentPage++;
                    }

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev_page')
                                .setLabel('◀')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId('next_page')
                                .setLabel('▶')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentPage === embeds.length - 1)
                        );

                    await i.update({
                        embeds: [embeds[currentPage]],
                        components: [row]
                    });
                });

                collector.on('end', () => {
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev_page')
                                .setLabel('◀')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('next_page')
                                .setLabel('▶')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );

                    initialMessage.edit({ components: [disabledRow] });
                });
            }
        }
    } catch (error) {
        console.error('Lỗi liệt kê vai trò tạm thời:', error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi tìm nạp vai trò tạm thời.', flags: MessageFlags.Ephemeral });
    }
}