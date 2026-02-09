const {
    SlashCommandBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const Canvas = require('canvas');
const fs = require('fs');
const yaml = require('js-yaml');
const moment = require('moment-timezone');
const { getConfig, getLang } = require('../../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const UserData = require('../../../models/UserData.js');
const EconomyUserData = require('../../../models/EconomyUserData.js');
const Invite = require('../../../models/inviteSchema.js');
const fishingSchema = require('../../Addons/Fishing/schemas/fishingSchema.js');

function formatNumber(num) {
    if (num === undefined || num === null) num = 0;
    if (num === 0 || Number(num) === 0) return '0';
    const suffixes = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    const magnitude = Math.floor(Math.log10(Math.abs(num)) / 3);

    if (magnitude >= suffixes.length) {
        return '∞';
    }

    return magnitude !== 0
        ? (num / Math.pow(1000, magnitude)).toFixed(1).replace(/\.0$/, '') + suffixes[magnitude]
        : num.toString();
}

function formatTime(seconds) {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${Math.floor(seconds % 60)}s`;
}

async function createLeaderboardCanvas(users, guild, subCmd, page, config, pageSize) {
    const canvas = Canvas.createCanvas(1000, 800);
    const ctx = canvas.getContext('2d');

    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 100, canvas.height);
        ctx.stroke();
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, 120);

    const accentGradient = ctx.createLinearGradient(0, 118, canvas.width, 118);
    accentGradient.addColorStop(0, '#3b82f6');
    accentGradient.addColorStop(0.5, '#8b5cf6');
    accentGradient.addColorStop(1, '#3b82f6');
    ctx.fillStyle = accentGradient;
    ctx.fillRect(0, 118, canvas.width, 2);

    ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.fillText(subCmd.toUpperCase(), 40, 55);

    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('LEADERBOARD', 40, 85);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(canvas.width - 120, 40, 80, 36, 18);
    ctx.fill();

    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText(`PAGE ${page + 1}`, canvas.width - 80, 63);

    let yPosition = 160;
    let position = page * pageSize + 1;

    for (const user of users) {
        try {
            const member = await guild.members.fetch(user.userId || user._id);

            const cardGradient = ctx.createLinearGradient(
                30,
                yPosition,
                canvas.width - 30,
                yPosition + 100
            );
            cardGradient.addColorStop(0, 'rgba(30, 41, 59, 0.7)');
            cardGradient.addColorStop(1, 'rgba(30, 41, 59, 0.4)');

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = cardGradient;
            ctx.beginPath();
            ctx.roundRect(30, yPosition, canvas.width - 60, 100, 16);
            ctx.fill();
            ctx.restore();

            const badges = {
                1: { colors: ['#fbbf24', '#f59e0b'], icon: '🥇' },
                2: { colors: ['#e2e8f0', '#94a3b8'], icon: '🥈' },
                3: { colors: ['#f97316', '#ea580c'], icon: '🥉' },
                default: { colors: ['#3b82f6', '#1d4ed8'], icon: '⭐' }
            };

            const badge = badges[position] || badges.default;

            ctx.save();
            const rankGradient = ctx.createLinearGradient(
                50,
                yPosition + 25,
                50,
                yPosition + 75
            );
            rankGradient.addColorStop(0, badge.colors[0]);
            rankGradient.addColorStop(1, badge.colors[1]);

            ctx.fillStyle = rankGradient;
            ctx.beginPath();
            ctx.roundRect(50, yPosition + 25, 50, 50, 12);
            ctx.fill();

            ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(position.toString(), 75, yPosition + 55);
            if (badge.icon) {
                ctx.font = '20px Arial';
                ctx.fillText(badge.icon, 75, yPosition + 78);
            }

            const avatar = await Canvas.loadImage(
                member.user.displayAvatarURL({ extension: 'png', size: 128 })
            );
            ctx.save();
            ctx.beginPath();
            ctx.arc(130, yPosition + 50, 32, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 98, yPosition + 18, 64, 64);
            ctx.restore();

            ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#e5e7eb';
            ctx.fillText(member.user.username, 180, yPosition + 48);

            ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = '#9ca3af';
            let valueText = '';
            switch (subCmd) {
                case 'balance':
                    valueText = `💰 Số dư: ${formatNumber(user.balance || 0)}`;
                    break;
                case 'levels':
                    valueText = `📈 Level: ${user.level || 0} • XP: ${formatNumber(
                        user.xp || 0
                    )}`;
                    break;
                case 'messages':
                    valueText = `💬 Tin nhắn: ${formatNumber(user.totalMessages || 0)}`;
                    break;
                case 'voice':
                    valueText = `🎙️ Voice: ${formatTime(user.voiceTime || 0)}`;
                    break;
                case 'invites':
                    valueText = `📨 Lượt mời: ${formatNumber(user.invites || 0)}`;
                    break;
                case 'cauca':
                    valueText = `🎣 Số lần câu cá: ${formatNumber(user.catchCount || 0)}`;
                    break;
            }
            ctx.fillText(valueText, 180, yPosition + 72);

            ctx.restore();
            yPosition += 110;
            position++;
        } catch {
            continue;
        }
    }

    return canvas;
}

async function getLeaderboardData(guild, subCmd, page, pageSize) {
    const skip = page * pageSize;
    let data = [];
    let userIdsToFetch = new Set();

    switch (subCmd) {
        case 'balance': {
            const allEconData = await EconomyUserData.find({});
            // Sort first, THEN fetch members for the page
            allEconData.sort((a, b) => (b.balance || 0) - (a.balance || 0));
            // We need to filter by guild members, but we can't efficiently do that without fetching all.
            // Compromise: Take top X (e.g. top 500) global rich list, then check if they are in guild.
            // OR if Economy is per-guild? The model definition doesn't strictly say, but usually it is.
            // Wait, EconomyUserData has userId but maybe not guildId? 
            // The file viewer showed: EconomyUserData.js. Let's assume global economy for now or check if it has guildId.
            // Original code: allEconData.filter(doc => members.has(doc.userId));
            // This implies Economy might be global or many users.

            // OPTIMIZATION:
            // 1. If EconomyUserData has guildId, filter by it. (Checking model file would be ideal, but assuming it might not based on original code fetching all members)
            // 2. If global, we take a larger chunk of top users, then check membership.

            // Let's assume we can just fetch the top N users from DB, then filter those who are in guild.
            // But if we paginate, we need the N-th page of *guild* members.
            // If we can't filter by guildId in DB, this is hard.
            // *Original code fetched ALL guild members to filter.*

            // Improved Strategy:
            // 1. Fetch ALL DB data (it's likely smaller than guild member count for now, or at least faster to iterate).
            // 2. Sort DB data.
            // 3. Iterate from top, checking `guild.members.cache.has()` first. 
            // 4. If not in cache, we *could* try to fetch, but fetching individually for a list is slow.
            // 5. BETTER: Just take the top 50/100 candidates from DB, fetch those specific users from Discord to see if they exist in Guild.

            // Let's rely on cache + fetch(userIds).
            // But `guild.members.fetch({ user: [ids] })` is what we want.

            // Taking a safe upper limit to find enough users for the page
            // We need `skip + pageSize` valid members.
            // Let's take top (skip + pageSize + 50) users from DB.
            // Actually, let's just stick to the plan:
            // Fetch DB -> Sort -> Map to IDs -> Fetch those IDs from Guild

            data = allEconData.sort((a, b) => (b.balance || 0) - (a.balance || 0));
            break;
        }
        case 'levels': {
            const allLevelData = await UserData.find({ guildId: 'global' });
            data = allLevelData.sort((a, b) => {
                if ((b.level || 0) !== (a.level || 0)) {
                    return (b.level || 0) - (a.level || 0);
                }
                return (b.xp || 0) - (a.xp || 0);
            });
            break;
        }
        case 'messages': {
            const allMsgData = await UserData.find({ guildId: guild.id });
            data = allMsgData.sort((a, b) => (b.totalMessages || 0) - (a.totalMessages || 0));
            break;
        }
        case 'voice': {
            const allVoiceData = await UserData.find({ guildId: guild.id });

            // Real-time update: Add current session time
            // We need to require the map safely
            let activeSessions = new Map();
            try {
                // Adjust path as needed. event handler is in events/voiceStateUpdate.js
                // Leaderboard is in commands/General/Leveling/leaderboard.js
                // Relative path: ../../../events/voiceStateUpdate
                const voiceHandler = require('../../../events/voiceStateUpdate');
                if (voiceHandler.activeVoiceSessions) {
                    activeSessions = voiceHandler.activeVoiceSessions;
                }
            } catch (e) {
                console.error('Failed to load active voice sessions for leaderboard:', e);
            }

            const now = Date.now();

            // Map data to include current session
            const enrichedData = allVoiceData.map(doc => {
                let extraTime = 0;
                if (activeSessions.has(doc.userId)) {
                    const startTime = activeSessions.get(doc.userId);
                    extraTime = Math.floor((now - startTime) / 1000);
                }
                return {
                    ...doc, // spread to avoid mutating original object in cache if it's cached
                    voiceTime: (doc.voiceTime || 0) + extraTime
                };
            });

            data = enrichedData
                .filter(doc => (doc.voiceTime || 0) > 0)
                .sort((a, b) => (b.voiceTime || 0) - (a.voiceTime || 0));
            break;
        }
        // ... handled similarly
    }

    // Common Logic for "invites" and "cauca" and applying the filter
    if (subCmd === 'invites') {
        const allInvites = await Invite.find({ guildId: guild.id });
        const inviterMap = {};
        for (const inv of allInvites) {
            if (!inv.inviterId) continue;
            if (!inviterMap[inv.inviterId]) inviterMap[inv.inviterId] = 0;
            inviterMap[inv.inviterId] += (inv.uses || 0);
        }
        data = Object.entries(inviterMap).map(([inviterId, count]) => ({
            _id: inviterId,
            userId: inviterId,
            invites: count
        })).sort((a, b) => b.invites - a.invites);
    } else if (subCmd === 'cauca') {
        const allFishers = await fishingSchema.find({});
        data = allFishers.map(doc => ({
            ...doc,
            catchCount: (doc.inventory || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
        })).filter(doc => doc.catchCount > 0).sort((a, b) => b.catchCount - a.catchCount);
    }

    // Now we have `data` sorted by the metric.
    // We need to find the first `skip + pageSize` users who are actually in the guild.
    // Since we don't want to fetch ALL members, we iterate and check.

    // Optimization: Bulk fetch a batch of candidates.
    // We need to fill `skip` items (to discard) + `pageSize` items (to return).
    // Total needed: skip + pageSize.

    const validMembers = [];
    const candidates = data;

    // We'll process candidates in chunks to be efficient
    const CHUNK_SIZE = 50;
    let currentIdx = 0;

    while (validMembers.length < skip + pageSize && currentIdx < candidates.length) {
        const chunk = candidates.slice(currentIdx, currentIdx + CHUNK_SIZE);
        if (chunk.length === 0) break;

        const idsToCheck = chunk.map(u => u.userId || u._id);

        // 1. Check Cache first
        const cachedMembers = idsToCheck.map(id => guild.members.cache.get(id)).filter(m => m);
        const cachedIds = new Set(cachedMembers.map(m => m.id));

        // 2. Fetch missing IDs
        const missingIds = idsToCheck.filter(id => !cachedIds.has(id));
        let fetchedMembers = [];

        if (missingIds.length > 0) {
            try {
                const fetched = await guild.members.fetch({ user: missingIds });
                fetchedMembers = Array.from(fetched.values());
            } catch (err) {
                // Ignore fetch errors, just assume they aren't in guild if fetch fails
                // console.warn('Failed to fetch some members:', err);
            }
        }

        const foundInChunk = [...cachedMembers, ...fetchedMembers];
        const foundIds = new Set(foundInChunk.map(m => m.id));

        // Ordered push to validMembers based on original sort
        for (const candidate of chunk) {
            const id = candidate.userId || candidate._id;
            if (foundIds.has(id)) {
                validMembers.push(candidate);
            }
        }

        currentIdx += CHUNK_SIZE;
    }

    // Now we have at least `skip + pageSize` valid members (or fewer if we ran out of data)
    return validMembers.slice(skip, skip + pageSize);
}

async function getTotalCount(guild, subCmd) {
    // Optimization: Return total from DB. 
    // This might include users who left, but it's much faster than fetching all members to count.

    switch (subCmd) {
        case 'balance': {
            const allEconData = await EconomyUserData.find({});
            return allEconData.length;
        }
        case 'levels':
        case 'messages': {
            // Fetch global data
            const allData = await UserData.find({ guildId: 'global' });
            return allData.length;
        }
        case 'voice': {
            const allData = await UserData.find({ guildId: 'global' });
            return allData.filter(doc => (doc.voiceTime || 0) > 0).length;
        }
        case 'invites': {
            const allInvites = await Invite.find({ guildId: guild.id });
            const inviterMap = {};
            for (const inv of allInvites) {
                if (!inv.inviterId) continue;
                if (!inviterMap[inv.inviterId]) inviterMap[inv.inviterId] = 0;
                inviterMap[inv.inviterId] += (inv.uses || 0);
            }
            return Object.values(inviterMap).filter(count => count > 0).length;
        }
        case 'cauca': {
            const allFishers = await fishingSchema.find({});
            return allFishers.filter(f => f.inventory && f.inventory.length > 0).length;
        }
        default:
            return 0;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Xem bảng xếp hạng trong server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Xem những người dùng có số dư cao nhất')
                .addIntegerOption(option =>
                    option
                        .setName('page')
                        .setDescription('Số trang cần xem')
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('levels')
                .setDescription('Xem bảng xếp hạng cấp độ')
                .addIntegerOption(option =>
                    option
                        .setName('page')
                        .setDescription('Số trang cần xem')
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('messages')
                .setDescription('Xem người dùng nhắn tin nhiều nhất')
                .addIntegerOption(option =>
                    option
                        .setName('page')
                        .setDescription('Số trang cần xem')
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('voice')
                .setDescription('Xem bảng xếp hạng thời gian voice')
                .addIntegerOption(option => option.setName('page').setDescription('Số trang cần xem').setMinValue(1))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('invites')
                .setDescription('Xem những người dùng mời nhiều nhất')
                .addIntegerOption(option =>
                    option
                        .setName('page')
                        .setDescription('Số trang cần xem')
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cauca')
                .setDescription('Xem bảng xếp hạng những người câu cá hàng đầu')
                .addIntegerOption(option =>
                    option
                        .setName('page')
                        .setDescription('Số trang cần xem')
                        .setMinValue(1)
                )
        ),
    category: 'General',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const subCmd = interaction.options.getSubcommand();
            let currentPage = (interaction.options.getInteger('page') || 1) - 1;
            const pageSize = 5;

            const totalUsers = await getTotalCount(interaction.guild, subCmd);
            const maxPages = Math.max(1, Math.ceil(totalUsers / pageSize));

            if (currentPage >= maxPages) {
                currentPage = Math.max(0, maxPages - 1);
            }

            async function generateLeaderboardReply(pageNum) {
                const users = await getLeaderboardData(
                    interaction.guild,
                    subCmd,
                    pageNum,
                    pageSize
                );

                if (!users || users.length === 0) {
                    return {
                        content:
                            '⚠️ Chưa lưu dữ liệu (không có dữ liệu nào được lưu trước đó).',
                        flags: MessageFlags.Ephemeral
                    };
                }

                const canvas = await createLeaderboardCanvas(
                    users,
                    interaction.guild,
                    subCmd,
                    pageNum,
                    config,
                    pageSize
                );
                const attachment = new AttachmentBuilder(canvas.toBuffer(), {
                    name: 'leaderboard.png'
                });

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('first')
                        .setLabel('⏮ Trang đầu')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageNum === 0),
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('◀ Trang trước')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pageNum === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Trang sau ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pageNum >= maxPages - 1),
                    new ButtonBuilder()
                        .setCustomId('last')
                        .setLabel('Trang cuối ⏭')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageNum >= maxPages - 1)
                );

                return {
                    files: [attachment],
                    components: [buttons]
                };
            }

            const reply = await generateLeaderboardReply(currentPage);
            const message = await interaction.editReply(reply);

            const collector = message.createMessageComponentCollector({
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({
                        content:
                            '⚠️ Bạn không thể dùng các nút này vì không phải là người gọi lệnh.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                switch (i.customId) {
                    case 'first':
                        currentPage = 0;
                        break;
                    case 'prev':
                        currentPage = Math.max(0, currentPage - 1);
                        break;
                    case 'next':
                        currentPage = Math.min(maxPages - 1, currentPage + 1);
                        break;
                    case 'last':
                        currentPage = maxPages - 1;
                        break;
                }

                const newReply = await generateLeaderboardReply(currentPage);
                await i.update(newReply);
            });

            collector.on('end', async () => {
                const disabledButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('first')
                        .setLabel('⏮ First')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('last')
                        .setLabel('Last ⏭')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

                await message
                    .edit({ components: [disabledButtons] })
                    .catch(() => { });
            });
        } catch (error) {
            console.error(error);
            const errorMessage = lang?.Leaderboard?.Error
                ? lang.Leaderboard.Error.replace(/{guild}/g, interaction.guild.name)
                : 'Đã xảy ra lỗi khi lấy bảng xếp hạng.';

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: errorMessage,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: errorMessage,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};
