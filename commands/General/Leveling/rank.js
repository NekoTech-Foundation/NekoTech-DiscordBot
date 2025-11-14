const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const Canvas = require('canvas');
const UserData = require('../../../models/UserData');
const fs = require('fs');
const path = require('path');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');

const config = getConfig();

const avatarCache = new Map();
const rankCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

function createGradient(ctx, x, y, width, height, colorStops) {
    const gradient = ctx.createLinearGradient(x, y, width, height);
    colorStops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    return gradient;
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

async function fetchAvatar(url, userId) {
    const cacheKey = `${userId}-${url}`;
    const cachedAvatar = avatarCache.get(cacheKey);

    if (cachedAvatar && Date.now() - cachedAvatar.timestamp < CACHE_DURATION) {
        return cachedAvatar.buffer;
    }

    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();

        avatarCache.set(cacheKey, {
            buffer: Buffer.from(buffer),
            timestamp: Date.now()
        });

        return Buffer.from(buffer);
    } catch (error) {
        console.error('Error fetching avatar:', error);
        throw error;
    }
}

async function getRank(userId, guildId) {
    const cacheKey = `${guildId}-${userId}`;
    const cachedRank = rankCache.get(cacheKey);

    if (cachedRank && Date.now() - cachedRank.timestamp < CACHE_DURATION) {
        return cachedRank.rank;
    }

    const rankData = await UserData.aggregate([
        { $match: { guildId: guildId } },
        {
            $addFields: {
                sortValue: {
                    $add: [{ $multiply: ['$level', 1000000] }, '$xp']
                }
            }
        },
        {
            $setWindowFields: {
                partitionBy: null,
                sortBy: { sortValue: -1 },
                output: {
                    rank: {
                        $rank: {}
                    }
                }
            }
        },
        { $match: { userId: userId } },
        { $project: { rank: 1 } }
    ]);

    const rank = rankData[0]?.rank || 0;

    rankCache.set(cacheKey, {
        rank,
        timestamp: Date.now()
    });

    return rank;
}

const PRESTIGE_TIERS = [
    { key: 'unranked', name: 'Chưa xếp hạng' },
    { key: 'iron', name: 'Sắt' },
    { key: 'bronze', name: 'Đồng' },
    { key: 'silver', name: 'Bạc' },
    { key: 'gold', name: 'Vàng' },
    { key: 'platinum', name: 'Bạch kim' },
    { key: 'diamond', name: 'Kim cương' },
    { key: 'ascendant', name: 'Thăng hoa' },
    { key: 'immortal', name: 'Bất tử' },
    { key: 'radiant', name: 'Rạng rỡ' }
];

function getPrestigeTier(prestige) {
    if (!prestige || prestige <= 0) return PRESTIGE_TIERS[0];
    if (prestige >= PRESTIGE_TIERS.length) return PRESTIGE_TIERS[PRESTIGE_TIERS.length - 1];
    return PRESTIGE_TIERS[prestige];
}

async function generateRankCard(interaction, userData, targetUser) {
    const canvas = Canvas.createCanvas(1000, 300);
    const ctx = canvas.getContext('2d');

    let accentColor = config.RankCard?.AccentColor || '#1769FF';
    let secondaryColor = config.RankCard?.SecondaryColor || '#4785FF';
    let progressStartColor = config.RankCard?.ProgressBar?.StartColor || accentColor;
    let progressEndColor = config.RankCard?.ProgressBar?.EndColor || secondaryColor;
    let levelTextColor = config.RankCard?.TextColors?.LevelText || '#FFFFFF';
    let rankTextColor = config.RankCard?.TextColors?.RankText || '#FFFFFF';
    let numbersColor = config.RankCard?.TextColors?.Numbers || '#FFFFFF';
    let levelEmoji = config.RankCard?.Emojis?.Level || '✧';
    let topRankEmoji = config.RankCard?.Emojis?.TopRank || '👑';
    let normalRankEmoji = config.RankCard?.Emojis?.NormalRank || '⭐';

    const prestigeTier = getPrestigeTier(userData.prestige || 0);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const bgGradient = createGradient(ctx, 0, 0, canvas.width, canvas.height, [
        [0, '#0a0a0a'],
        [0.4, '#141414'],
        [0.6, '#141414'],
        [1, '#0a0a0a']
    ]);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < canvas.width + canvas.height; i += 45) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(i, 0);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = createGradient(
        ctx,
        canvas.width / 2,
        0,
        canvas.width / 2,
        canvas.height,
        [
            [0, '#0000'],
            [0.5, '#7289da30'],
            [1, '#0000']
        ]
    );
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const [avatarBuffer, rank] = await Promise.all([
        fetchAvatar(
            targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
            targetUser.id
        ),
        getRank(targetUser.id, interaction.guild.id)
    ]);

    ctx.save();
    const margin = 20;
    const cornerLength = 40;

    function drawCorner(x, y, rotations) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotations * 90 * Math.PI / 180);

        ctx.beginPath();
        ctx.lineWidth = 3;
        const gradient = ctx.createLinearGradient(0, 0, cornerLength, cornerLength);
        gradient.addColorStop(0, accentColor);
        gradient.addColorStop(1, `${accentColor}00`);
        ctx.strokeStyle = gradient;

        ctx.moveTo(0, cornerLength);
        ctx.lineTo(0, 0);
        ctx.lineTo(cornerLength, 0);

        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
    }

    drawCorner(margin, margin, 0);
    drawCorner(canvas.width - margin, margin, 1);
    drawCorner(margin, canvas.height - margin, 3);
    drawCorner(canvas.width - margin, canvas.height - margin, 2);

    ctx.restore();

    const avatarX = 120;
    const avatarY = 150;
    const avatarRadius = 80;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius + 10, 0, Math.PI * 2);
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 25;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const avatar = await Canvas.loadImage(avatarBuffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
        avatar,
        avatarX - avatarRadius,
        avatarY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
    );

    ctx.fillStyle = `${accentColor}15`;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    const username = targetUser.username.toUpperCase();
    const usernameWidth = ctx.measureText(username).width;
    ctx.fillText(username, 260, 100);

    if (targetUser.discriminator !== '0') {
        ctx.font = '24px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.shadowBlur = 0;
        ctx.fillText(`#${targetUser.discriminator}`, 260 + usernameWidth + 5, 100);
    }
    ctx.restore();

    ctx.save();
    const statsX = 260;
    ctx.font = 'bold 30px sans-serif';

    ctx.fillStyle = levelTextColor;
    ctx.fillText(`${levelEmoji} Level `, statsX, 150);
    ctx.fillStyle = numbersColor;
    ctx.fillText(
        userData.level,
        statsX + ctx.measureText(`${levelEmoji} Level `).width,
        150
    );

    const rankIcon = rank <= 3 ? topRankEmoji : normalRankEmoji;
    ctx.fillStyle = rankTextColor;
    ctx.fillText(`${rankIcon} Rank #`, statsX + 220, 150);
    ctx.fillStyle = numbersColor;
    ctx.fillText(
        rank,
        statsX + 220 + ctx.measureText(`${rankIcon} Rank #`).width,
        150
    );

    // Prestige line
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#e5e7eb';
    const prestigeText = `Hạng danh vọng: ${prestigeTier.name} (P${userData.prestige || 0})`;
    ctx.fillText(prestigeText, statsX, 185);
    ctx.restore();

    const barWidth = 650;
    const barHeight = 35;
    const barX = 260;
    const barY = 200;

    ctx.save();
    roundRect(ctx, barX, barY, barWidth, barHeight, 17.5);
    const glassGradient = createGradient(ctx, barX, barY, barX, barY + barHeight, [
        [0, '#ffffff15'],
        [0.5, '#ffffff10'],
        [1, '#ffffff05']
    ]);
    ctx.fillStyle = glassGradient;
    ctx.shadowColor = '#00000040';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();

    const xpNeeded = (userData.level + 1) * config.LevelingSystem.XPNeeded;
    const progress = Math.min(userData.xp / xpNeeded, 1);
    const progressGradient = createGradient(ctx, barX, barY, barX + barWidth, barY, [
        [0, progressStartColor],
        [0.5, progressEndColor],
        [1, progressStartColor]
    ]);

    ctx.save();
    roundRect(ctx, barX, barY, barWidth * progress, barHeight, 17.5);
    ctx.fillStyle = progressGradient;
    ctx.shadowColor = `${accentColor}60`;
    ctx.shadowBlur = 15;
    ctx.fill();

    const shineGradient = createGradient(ctx, barX, barY, barX, barY + barHeight, [
        [0, '#ffffff15'],
        [0.5, '#ffffff00'],
        [1, '#ffffff10']
    ]);
    ctx.fillStyle = shineGradient;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    const xpText = `${userData.xp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`;
    const xpTextWidth = ctx.measureText(xpText).width;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 7;
    ctx.fillText(xpText, barX + (barWidth - xpTextWidth) / 2, barY + 24);
    ctx.restore();

    return canvas.toBuffer();
}

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of avatarCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            avatarCache.delete(key);
        }
    }
    for (const [key, value] of rankCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            rankCache.delete(key);
        }
    }
}, CACHE_DURATION);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Xem profile level đẹp của bạn')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Chọn người dùng (để trống để xem bản thân)')
                .setRequired(false)
        ),
    category: 'General',
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userData = await UserData.findOne({
                userId: targetUser.id,
                guildId: 'global'
            })
                .select('userId level xp prestige')
                .lean();

            if (!userData) {
                return interaction.followUp({
                    content:
                        targetUser.id === interaction.user.id
                            ? 'Có vẻ như bạn chưa có dữ liệu cấp độ nào.'
                            : `Có vẻ như ${targetUser.username} chưa có dữ liệu cấp độ nào.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const buffer = await generateRankCard(interaction, userData, targetUser);
            const attachment = new AttachmentBuilder(buffer, { name: 'rank-card.png' });

            await interaction.followUp({ files: [attachment] });
        } catch (error) {
            console.error('Error generating rank card:', error);
            await interaction.followUp({
                content: 'Đã xảy ra lỗi khi tạo rank card. Vui lòng thử lại sau.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
