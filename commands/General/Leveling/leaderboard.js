const { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Canvas = require('canvas');
const fs = require('fs');
const yaml = require('js-yaml');
const moment = require('moment-timezone');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const UserData = require('../../../models/UserData.js');
const Invite = require('../../../models/inviteSchema.js');
const fishingSchema = require('../../../addons/Fishing/schemas/fishingSchema.js');

function formatNumber(num) {
    if (num === undefined || num === null) num = 0;
    const suffixes = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    const magnitude = Math.floor(Math.log10(Math.abs(num)) / 3);
    
    if (magnitude >= suffixes.length) {
        return '∞';
    }
    
    return magnitude !== 0
        ? (num / Math.pow(1000, magnitude)).toFixed(1).replace(/\.0$/, '') + suffixes[magnitude]
        : num.toString();
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
    let position = (page * pageSize) + 1;

    for (const user of users) {
        try {
            const member = await guild.members.fetch(user.userId || user._id);
            
            const cardGradient = ctx.createLinearGradient(30, yPosition, canvas.width - 30, yPosition + 100);
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
                1: { colors: ['#fbbf24', '#f59e0b'], icon: '★' },
                2: { colors: ['#e2e8f0', '#94a3b8'], icon: '☆' },
                3: { colors: ['#f97316', '#ea580c'], icon: '✧' },
                default: { colors: ['#3b82f6', '#1d4ed8'], icon: '•' }
            };

            const badge = badges[position] || badges.default;
            
            ctx.save();
            const rankGradient = ctx.createLinearGradient(50, yPosition + 25, 50, yPosition + 75);
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
                ctx.fillText(badge.icon, 75, yPosition + 75);
            }

            try {
                const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 128 }));
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(120, yPosition + 20, 60, 60, 12);
                ctx.clip();
                ctx.drawImage(avatar, 120, yPosition + 20, 60, 60);
                ctx.restore();
            } catch (error) {
                console.error('Error loading avatar:', error);
            }

            ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = '#f1f5f9';
            ctx.textAlign = 'left';
            ctx.fillText(member.user.username, 200, yPosition + 55);

            const stats = {
                balance: { color: '#22c55e', icon: '💰' },
                levels: { color: '#ec4899', icon: '✦' },
                messages: { color: '#3b82f6', icon: '◆' },
                invites: { color: '#8b5cf6', icon: '✉' },
                cauca: { color: '#0ea5e9', icon: '🎣' }
            };

            let statText = '';
            switch(subCmd) {
                case 'balance': statText = formatNumber(user.totalBalance || 0); break;
                case 'levels': statText = `Level ${user.level || 0}`; break;
                case 'messages': statText = formatNumber(user.totalMessages || 0); break;
                case 'invites': statText = formatNumber(user.invites || 0); break;
                case 'cauca': statText = formatNumber(user.totalFish || 0); break;
            }

            const stat = stats[subCmd];
            const statWidth = ctx.measureText(statText).width + 50;
            
            ctx.fillStyle = `${stat.color}20`;
            ctx.beginPath();
            ctx.roundRect(canvas.width - statWidth - 60, yPosition + 35, statWidth + 20, 30, 15);
            ctx.fill();

            ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = stat.color;
            ctx.textAlign = 'right';
            ctx.fillText(`${stat.icon} ${statText}`, canvas.width - 60, yPosition + 55);

            yPosition += 120;
            position++;
        } catch (error) {
            if (error.code !== 10007) console.error(error);
        }
    }

    ctx.fillStyle = '#475569';
    ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const timestamp = moment().tz(config.Timezone).format('HH:mm');
    ctx.fillText(
        `Last updated at ${timestamp}`,
        canvas.width / 2,
        canvas.height - 30
    );

    return canvas;
}

async function getLeaderboardData(guild, type, page, pageSize) {
    const fetchSize = pageSize * 2; // Fetch more to account for users who may have left
    const skip = page * pageSize;
    
    switch(type) {
        case 'balance':
            return await UserData.aggregate([
                { $match: { guildId: guild.id, $or: [{ balance: { $gt: 0 } }, { bank: { $gt: 0 } }] } },
                { $addFields: { totalBalance: { $add: [{ $ifNull: ['$balance', 0] }, { $ifNull: ['$bank', 0] }] } } },
                { $sort: { totalBalance: -1 } },
                { $skip: skip },
                { $limit: fetchSize }
            ]);

        case 'levels':
            return await UserData.aggregate([
                { $match: { guildId: guild.id, $or: [{ level: { $gt: 0 } }, { xp: { $gt: 0 } }] } },
                { $sort: { level: -1, xp: -1 } },
                { $group: { _id: "$userId", userId: { $first: "$userId" }, level: { $first: "$level" }, xp: { $first: "$xp" } } },
                { $sort: { level: -1, xp: -1 } },
                { $skip: skip },
                { $limit: fetchSize }
            ]);

        case 'messages':
            return await UserData.aggregate([
                { $match: { guildId: guild.id, totalMessages: { $gt: 0 } } },
                { $sort: { totalMessages: -1 } },
                { $group: { _id: "$userId", userId: { $first: "$userId" }, totalMessages: { $first: "$totalMessages" } } },
                { $sort: { totalMessages: -1 } },
                { $skip: skip },
                { $limit: fetchSize }
            ]);

        case 'invites':
            return await Invite.aggregate([
                { $match: { guildID: guild.id } },
                { $group: { _id: "$inviterID", userId: { $first: "$inviterID" }, invites: { $sum: "$uses" } } },
                { $match: { invites: { $gt: 0 } } },
                { $sort: { invites: -1 } },
                { $skip: skip },
                { $limit: fetchSize }
            ]);
        
        case 'cauca':
            return await fishingSchema.aggregate([
                { $unwind: "$inventory" },
                { $group: { _id: "$userId", userId: { $first: "$userId" }, totalFish: { $sum: "$inventory.quantity" } } },
                { $match: { totalFish: { $gt: 0 } } },
                { $sort: { totalFish: -1 } },
                { $skip: skip },
                { $limit: fetchSize }
            ]);
    }
}

async function getTotalCount(guild, type) {
    switch(type) {
        case 'balance':
            return await UserData.countDocuments({ guildId: guild.id, $or: [{ balance: { $gt: 0 } }, { bank: { $gt: 0 } }] });

        case 'levels':
            return await UserData.countDocuments({ guildId: guild.id, $or: [{ level: { $gt: 0 } }, { xp: { $gt: 0 } }] });

        case 'messages':
            return await UserData.countDocuments({ guildId: guild.id, totalMessages: { $gt: 0 } });

        case 'invites':
            const inviteCount = await Invite.aggregate([
                { $match: { guildID: guild.id } },
                { $group: { _id: "$inviterID", invites: { $sum: "$uses" } } },
                { $match: { invites: { $gt: 0 } } },
                { $count: "total" }
            ]);
            return inviteCount[0]?.total || 0;
        case 'cauca':
            return await fishingSchema.countDocuments({ "inventory.0": { "$exists": true } });

    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Xem Bảng Xếp Hạng')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Xem những người dùng có số dư cao nhất')
                .addIntegerOption(option => option.setName('page').setDescription('Số trang cần xem').setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('levels')
                .setDescription('Xem BXH Levels')
                .addIntegerOption(option => option.setName('page').setDescription('Số trang cần xem').setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('messages')
                .setDescription('Xem Người dùng nhắn tin tại server nhiều nhất')
                .addIntegerOption(option => option.setName('page').setDescription('Số trang cần xem').setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invites')
                .setDescription('Xem những người dùng được mời nhiều nhất')
                .addIntegerOption(option => option.setName('page').setDescription('Số trang cần xem').setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cauca')
                .setDescription('Xem bảng xếp hạng những người câu cá hàng đầu')
                .addIntegerOption(option => option.setName('page').setDescription('Số trang cần xem').setMinValue(1))),
    category: 'General',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const subCmd = interaction.options.getSubcommand();
            let currentPage = (interaction.options.getInteger('page') || 1) - 1;
            const pageSize = 5;

            const totalUsers = await getTotalCount(interaction.guild, subCmd);
            const maxPages = Math.ceil(totalUsers / pageSize);
            
            if (currentPage >= maxPages) {
                currentPage = Math.max(0, maxPages - 1);
            }

            async function generateLeaderboardReply(pageNum) {
                const fetchSize = pageSize * 2;
                let users = await getLeaderboardData(interaction.guild, subCmd, pageNum, fetchSize);
                
                if (!users || users.length === 0) {
                    return {
                        content: 'Chưa lưu dữ liệu ( Không có data đã lưu trước đó ).',
                        flags: MessageFlags.Ephemeral
                    };
                }

                const validUsers = [];

                for (const user of users) {
                    if (validUsers.length >= pageSize) break;
                    
                    try {
                        const userId = user.userId || user._id;
                        const member = await interaction.guild.members.fetch(userId);
                        if (member) {
                            validUsers.push(user);
                        }
                    } catch (error) {
                        if (error.code !== 10007) console.error(error);
                        continue;
                    }
                }

                if (validUsers.length === 0) {
                    return {
                        content: 'No valid users found for this leaderboard.',
                        flags: MessageFlags.Ephemeral
                    };
                }

                const canvas = await createLeaderboardCanvas(validUsers, interaction.guild, subCmd, pageNum, config, pageSize);
                const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'leaderboard.png' });

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('≪ Trang đầu')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(pageNum === 0),
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('◀ Trang Trước')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(pageNum === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Trang Sau ▶')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(pageNum >= maxPages - 1),
                        new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('Trang cuối ≫')
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

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ 
                        content: 'You cannot use these buttons as you did not run the command.', 
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
                const disabledButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('≪ First')
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
                            .setLabel('Last ≫')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );

                await message.edit({ components: [disabledButtons] }).catch(() => {});
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: lang.Leaderboard.Error.replace(/{guild}/g, interaction.guild.name),
                flags: MessageFlags.Ephemeral
            });
        }
    }
};