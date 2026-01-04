const { AttachmentBuilder, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const EconomyUserData = require('../../../models/EconomyUserData');
//const fs = require('fs');
//const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const { replacePlaceholders } = require('./Utility/helpers');

const transactionCache = new Map();
const bgCanvasCache = new Map();

const MAX_CACHE_SIZE = 500;
const MAX_LOGS_DISPLAY = 100;

setInterval(() => {
    if (transactionCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(transactionCache.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        transactionCache.clear();
        entries.slice(0, MAX_CACHE_SIZE/2).forEach(([key, value]) => {
            transactionCache.set(key, value);
        });
    }
    
    if (bgCanvasCache.size > 10) {
        bgCanvasCache.clear();
    }
}, 30 * 60 * 1000);

const createBackgroundCanvas = (width, height) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#080A10');
    bgGradient.addColorStop(1, '#10121A');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 1.5
    );
    vignette.addColorStop(0, '#00000000');
    vignette.addColorStop(1, '#00000015');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const diagonalGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    diagonalGradient.addColorStop(0, '#ffffff03');
    diagonalGradient.addColorStop(0.5, '#ffffff01');
    diagonalGradient.addColorStop(1, '#ffffff03');
    ctx.fillStyle = diagonalGradient;
    
    for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 50 + i * 50);
        ctx.lineTo(canvas.width, canvas.height - 50 + i * 50);
        ctx.lineTo(canvas.width, canvas.height - 150 + i * 50);
        ctx.lineTo(0, 150 + i * 50);
        ctx.closePath();
        ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < canvas.width; i += 4) {
        for (let j = 0; j < canvas.height; j += 4) {
            if (Math.random() > 0.92) {
                ctx.globalAlpha = Math.random() * 0.006;
                const size = Math.random() * 1.5;
                ctx.fillRect(i, j, size, size);
            }
        }
    }
    ctx.globalAlpha = 1;

    const accentGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    accentGradient.addColorStop(0, '#FF657518');
    accentGradient.addColorStop(0.5, '#FF657535');
    accentGradient.addColorStop(1, '#FF657518');
    
    ctx.fillStyle = accentGradient;
    ctx.fillRect(0, 0, canvas.width, 3);
    ctx.fillStyle = '#ffffff08';
    ctx.fillRect(0, 5, canvas.width, 1);
    ctx.fillStyle = '#ffffff04';
    ctx.fillRect(0, 7, canvas.width, 1);

    const drawCornerAccent = (x, y, rotation) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation * Math.PI / 180);
        
        const glowGradient = ctx.createLinearGradient(0, 0, 45, 0);
        glowGradient.addColorStop(0, '#FF657515');
        glowGradient.addColorStop(1, '#FF657500');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(-2, -2, 44, 44);
        
        const cornerGradient = ctx.createLinearGradient(0, 0, 40, 0);
        cornerGradient.addColorStop(0, '#FF657530');
        cornerGradient.addColorStop(1, '#FF657500');
        
        ctx.fillStyle = cornerGradient;
        ctx.fillRect(0, 0, 40, 2);
        ctx.fillRect(0, 0, 2, 40);
        
        ctx.fillStyle = '#ffffff10';
        ctx.fillRect(4, 4, 30, 1);
        ctx.fillRect(4, 4, 1, 30);
        
        ctx.restore();
    };

    drawCornerAccent(0, 0, 0);
    drawCornerAccent(canvas.width, 0, 90);
    drawCornerAccent(canvas.width, canvas.height, 180);
    drawCornerAccent(0, canvas.height, 270);
    
    return canvas;
};

const getBackgroundCanvas = (width, height) => {
    const cacheKey = `${width}x${height}`;
    
    if (bgCanvasCache.has(cacheKey)) {
        const cachedCanvas = bgCanvasCache.get(cacheKey);
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cachedCanvas, 0, 0);
        return canvas;
    }
    
    const canvas = createBackgroundCanvas(width, height);
    bgCanvasCache.set(cacheKey, canvas);

    const clonedCanvas = createCanvas(width, height);
    const ctx = clonedCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    return clonedCanvas;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Kiểm tra số dư của người chơi khác')
        .addUserOption(option => option.setName('user').setDescription('Người dùng kiểm tra số dư của'))
        .addStringOption(option => option.setName('type').setDescription('Kiểm tra loại số dư').addChoices(
            { name: 'Log', value: 'log' }
        )),
    category: 'Economy',
    async execute(interaction, lang) {
        const userOption = interaction.options.getUser('user');
        const type = interaction.options.getString('type');
        const targetUser = userOption || interaction.user;

        const cacheKey = `${targetUser.id}`;
        const now = Date.now();
        
        const projection = { balance: 1, bank: 1 };
let user = await EconomyUserData.findOne(
            { userId: targetUser.id }, 
            projection
        );
        
        if (!user) {
            user = {
                balance: 0,
                bank: 0
            };
        }

        if (type === 'log') {
            let transactionLogs = [];
            
            if (transactionCache.has(cacheKey)) {
                transactionLogs = transactionCache.get(cacheKey).data;
            } else {
                const logData = await EconomyUserData.findOne(
                    { userId: targetUser.id },
                    { transactionLogs: { $slice: -MAX_LOGS_DISPLAY } }
                );
                
                if (logData && logData.transactionLogs) {
                    transactionLogs = logData.transactionLogs;
                    
                    transactionCache.set(cacheKey, {
                        data: transactionLogs,
                        timestamp: now
                    });
                }
            }
            
            user.transactionLogs = transactionLogs;
        }

        const formatNumber = (num) => {
            if (num === undefined || num === null) num = 0;

            if (num >= 1_000_000_000_000_000) {
                return (num / 1_000_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'Q';
            } else if (num >= 1_000_000_000_000) {
                return (num / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';
            } else if (num >= 1_000_000_000) {
                return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
            } else if (num >= 1_000_000) {
                return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
            } else if (num >= 1_000) {
                return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
            }
            return num.toString();
        };

        const capitalizeWords = (str) => {
            return str.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        };

        if (type === 'log') {
            const transactionLogs = user.transactionLogs || [];
            
            let totalGained = 0;
            let totalLost = 0;
            transactionLogs.forEach(log => {
                if (log.amount > 0) {
                    totalGained += log.amount;
                } else {
                    totalLost += Math.abs(log.amount);
                }
            });

            const categories = {
                games: ['blackjack_win', 'blackjack_draw', 'blackjack_lose', 'coinflip', 'roll', 'roulette', 'slot'],
                purchases: ['purchase'],
                interest: ['interest'],
                transfers: ['transfer_in', 'transfer_out'],
                other: ['beg', 'crime', 'daily', 'deposit', 'admin-give-balance', 'admin-give-bank', 'admin-take-balance', 'admin-take-bank', 'admin-set-balance', 'admin-set-bank', 'rob', 'robbed', 'work']
            };

            let selectedCategory = 'all';
            let page = 1;
            const itemsPerPage = 10;
            
            const totalGainedStr = formatNumber(totalGained);
            const totalLostStr = formatNumber(totalLost);

            const filterLogs = (category) => {
                if (category === 'all') return transactionLogs;
                return transactionLogs.filter(log => categories[category].includes(log.type));
            };

            const createEmbed = (filteredLogs) => {
                const paginatedLogs = filteredLogs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

                const transactionDescriptions = paginatedLogs
                    .map(log => {
                        let sign;
                        let amount = formatNumber(Math.abs(log.amount));
                        const type = capitalizeWords(log.type);
                        const emoji = '🪙';

                        if (log.type === 'blackjack_lose') {
                            sign = '-';
                        } else {
                            sign = log.amount > 0 ? '+' : '-';
                        }

                        const formattedAmount = `${sign}${amount}`;

                        if (formattedAmount === '-0.00' && log.type === 'interest') {
                            return null;
                        }

                        return `${formattedAmount} ${emoji} (${type})`;
                    })
                    .filter(description => description !== null)
                    .join('\n');

                const logDescription = transactionDescriptions
                    ? `\`\`\`diff\n${transactionDescriptions}\n\`\`\``
                    : `\`\`\`prolog\nNo Transactions Found\`\`\``;

                return new EmbedBuilder()
                    .setTitle(replacePlaceholders(lang.Economy.Messages.transactionLog, { user: targetUser.username }))
                    .setDescription(logDescription)
                    .addFields(
                        { name: lang.Economy.Messages.gained, value: `+${totalGainedStr} 🪙`, inline: true },
                        { name: lang.Economy.Messages.lost, value: `-${totalLostStr} 🪙`, inline: true }
                    )
                    .setColor('#00FF00');
            };

            const updateMessage = async () => {
                const filteredLogs = filterLogs(selectedCategory);
                const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

                const embed = createEmbed(filteredLogs);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('category_select')
                    .setPlaceholder('Select category')
                    .addOptions(
                        {
                            label: 'Tất cả',
                            value: 'all',
                            description: 'Xem tất cả nhật ký giao dịch',
                            emoji: '📜',
                        },
                        {
                            label: 'Games',
                            value: 'games',
                            description: 'Xem nhật ký từ các trò chơi như Xì Dách, roulette, etc.',
                            emoji: '🎮',
                        },
                        {
                            label: 'Mua Sắm',
                            value: 'purchases',
                            description: 'Xem tất cả nhật ký mua sắm',
                            emoji: '🛒',
                        },
                        {
                            label: 'Interest',
                            value: 'interest',
                            description: 'View logs of bank interest',
                            emoji: '💰',
                        },
                        {
                            label: 'Chuyển Tiền',
                            value: 'transfers',
                            description: 'Xem lịch sử chuyển/nhận tiền',
                            emoji: '💸',
                        },
                        {
                            label: 'Khác',
                            value: 'other',
                            description: 'Xem tất cả nhật ký giao dịch khác',
                            emoji: '✨',
                        },
                    );

                const row1 = new ActionRowBuilder().addComponents(selectMenu);

                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('previous')
                            .setLabel('Trước')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page <= 1),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Sau')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page >= totalPages)
                    );

                await interaction.editReply({ content: '', embeds: [embed], components: [row1, row2] });
            };

            await interaction.reply({ content: 'Loading...', fetchReply: true });

            updateMessage();

            const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                try {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({ content: 'You cannot interact with this menu.', flags: MessageFlags.Ephemeral });
                    }
                    
                    if (i.customId === 'category_select') {
                        await i.deferUpdate();
                        selectedCategory = i.values[0];
                        page = 1;
                        await updateMessage();
                    }

                    if (i.customId === 'previous') {
                        await i.deferUpdate();
                        page--;
                        await updateMessage();
                    }

                    if (i.customId === 'next') {
                        await i.deferUpdate();
                        page++;
                        await updateMessage();
                    }
                } catch (error) {
                    if (error.code === 10062 || error.code === 40060) return;
                    console.error('Collector Error:', error);
                }
            });

            collector.on('end', async () => {
                await interaction.editReply({ components: [] }).catch(() => {});
            });

        } else {
            const canvas = getBackgroundCanvas(1000, 320);
            const ctx = canvas.getContext('2d');

            try {
                const avatar = await loadImage(targetUser.displayAvatarURL({ extension: 'jpg', size: 256 }));
                
                const centerX = 140;
                const centerY = 160;
                const radius = 64;

                ctx.fillStyle = '#FF657510';
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius + 15, 0, Math.PI * 2);
                ctx.fill();

                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                
                ctx.drawImage(
                    avatar, 
                    centerX - radius, 
                    centerY - radius, 
                    radius * 2, 
                    radius * 2
                );
                ctx.restore();

                ctx.strokeStyle = '#ffffff20';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = '#FF657525';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
                ctx.stroke();

                for (let i = 0; i < 4; i++) {
                    const angle = i * Math.PI / 2;
                    const x = centerX + Math.cos(angle) * (radius + 12);
                    const y = centerY + Math.sin(angle) * (radius + 12);
                    
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fillStyle = '#FF657530';
                    ctx.fill();
                }

            } catch (error) {
                console.error('Error loading avatar:', error);
            }

            const displayName = targetUser.username.toUpperCase();
            ctx.font = 'bold 34px "Arial"';
            ctx.textAlign = 'left';
            
            ctx.fillStyle = '#00000050';
            ctx.fillText(displayName, 252, 102);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(displayName, 250, 100);

            if (targetUser.discriminator && targetUser.discriminator !== '0') {
                ctx.font = '24px "Arial"';
                ctx.fillStyle = '#ffffff30';
                ctx.fillText(`#${targetUser.discriminator}`, 250 + ctx.measureText(displayName).width + 8, 100);
            }

            const drawBalanceCard = (x, y, width, height, title, amount, color) => {
                ctx.save();
                
                ctx.fillStyle = '#ffffff08';
                ctx.beginPath();
                ctx.roundRect(x, y, width, height, 16);
                ctx.fill();

                ctx.strokeStyle = '#ffffff15';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = color + '30';
                ctx.fillRect(x, y, width, 3);

                [[x + 12, y + 12], [x + width - 12, y + 12], 
                 [x + 12, y + height - 12], [x + width - 12, y + height - 12]].forEach(([dx, dy]) => {
                    ctx.beginPath();
                    ctx.arc(dx, dy, 3, 0, Math.PI * 2);
                    ctx.fillStyle = color + '25';
                    ctx.fill();
                });

                ctx.font = 'bold 16px "Arial"';
                ctx.fillStyle = '#ffffff85';
                ctx.fillText(title.toUpperCase(), x + 24, y + 35);

                ctx.font = 'bold 36px "Arial"';
                const amountText = formatNumber(amount);
                
                ctx.fillStyle = '#00000040';
                ctx.fillText(amountText, x + 24, y + 82);
                
                ctx.fillStyle = color;
                ctx.fillText(amountText, x + 22, y + 80);

                ctx.restore();
            };

            // const shadeColor = (color, percent) => {
            //     const num = parseInt(color.replace('#', ''), 16);
            //     const amt = Math.round(2.55 * percent);
            //     const R = (num >> 16) + amt;
            //     const G = (num >> 8 & 0x00FF) + amt;
            //     const B = (num & 0x0000FF) + amt;
            //     return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            //         (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            //         (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
            // };

            drawBalanceCard(250, 130, 340, 100, 'Tiền Mặt Hiện Có', user.balance, '#FF7085');
            drawBalanceCard(610, 130, 340, 100, 'Số Dư TK Ngân Hàng', user.bank, '#5CD9FF');

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'balance.png' });
            return interaction.reply({ files: [attachment] });
        }
    },
};