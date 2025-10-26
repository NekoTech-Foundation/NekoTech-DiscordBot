const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const moment = require('moment-timezone');
const VeSo = require('./VesoSchema');
const UserData = require('../../models/UserData');
const { getConfig } = require('../../utils/configLoader');

module.exports.run = async (client) => {
    const configPath = path.join(__dirname, 'config.yml');
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    const mainConfig = getConfig();
    
    console.log('[VeSo] Vé số addon đã được khởi động');
    
    // Lên lịch sổ xố vào 6:00 PM giờ Việt Nam mỗi ngày
    cron.schedule('0 18 * * *', async () => {
        console.log('[VeSo] Bắt đầu sổ xố...');
        await drawLottery(client, config, mainConfig);
    }, {
        timezone: config.settings.timezone
    });
    
    // Kiểm tra nếu đã qua 6 giờ chiều hôm nay và chưa sổ
    checkMissedDraw(client, config, mainConfig);
    
    // Setup modal handler
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        if (!interaction.customId.startsWith('veso_choose_')) return;
        
        // Parse customId: veso_choose_{price}_{userId}
        const parts = interaction.customId.split('_');
        const price = parseInt(parts[2]);
        const expectedUserId = parts[3];
        
        // Verify user
        if (interaction.user.id !== expectedUserId) {
            return interaction.reply({
                content: '❌ Bạn không thể sử dụng modal này!',
                ephemeral: true
            });
        }
        
        const numbers = interaction.fields.getTextInputValue('veso_numbers');
        
        // Validate numbers (4 digits only)
        if (!/^\d{4}$/.test(numbers)) {
            return interaction.reply({
                content: '❌ Số vé phải là 4 chữ số từ 0000 đến 9999!',
                ephemeral: true
            });
        }
        
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Get user data
            let user = await UserData.findOne(
                { userId: interaction.user.id, guildId: interaction.guild.id },
                { balance: 1, transactionLogs: 1 }
            );

            if (!user) {
                user = new UserData({ 
                    userId: interaction.user.id, 
                    guildId: interaction.guild.id, 
                    balance: 0,
                    transactionLogs: []
                });
            }
            
            if (!user.transactionLogs) {
                user.transactionLogs = [];
            }

            // Check balance again
            if (user.balance < price) {
                return interaction.editReply({
                    content: '❌ Bạn không đủ tiền để mua vé số này!'
                });
            }
            
            // Check if ticket already purchased
            const vesoData = await VeSo.findOne({ guildId: interaction.guild.id });
            if (vesoData) {
                const existingTicket = vesoData.tickets.find(t => 
                    !t.drawn && 
                    t.price === price && 
                    t.numbers === numbers
                );
                
                if (existingTicket) {
                    return interaction.editReply({
                        content: `❌ Số **${numbers}** cho mệnh giá **${price}** đã được mua rồi! Vui lòng chọn số khác.`
                    });
                }
            }
            
            // Buy ticket with chosen numbers
            const ticketData = await module.exports.buyTicket(interaction.user.id, interaction.guild.id, price, numbers);
            
            // Deduct money
            user.balance -= price;
            user.transactionLogs.push({
                type: 'veso_purchase',
                amount: -price,
                timestamp: new Date()
            });
            await user.save();

            // Send success embed
            const currency = mainConfig.Currency || '💰';
            const vesoEmbed = new EmbedBuilder()
                .setColor(config.settings.colors.buy)
                .setTitle(config.messages.buy_success.title)
                .setDescription(
                    config.messages.buy_success.description
                        .replace(/{price}/g, price)
                        .replace(/{currency}/g, currency)
                        .replace(/{numbers}/g, numbers)
                        .replace(/{prize}/g, ticketData.prize)
                )
                .setFooter({ text: config.messages.buy_success.footer })
                .setTimestamp();

            await interaction.editReply({
                embeds: [vesoEmbed]
            });
            
        } catch (error) {
            console.error('[VeSo Modal] Error:', error);
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '❌ Có lỗi xảy ra khi mua vé số: ' + error.message
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: '❌ Có lỗi xảy ra khi mua vé số: ' + error.message,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    });
};

async function drawLottery(client, config, mainConfig, guildId = null) {
    try {
        const query = { enabled: true };
        if (guildId) {
            query.guildId = guildId;
        }
        const guilds = await VeSo.find(query);
        
        for (const guildData of guilds) {
            // Lọc vé chưa được sổ
            const undrawnTickets = guildData.tickets.filter(t => !t.drawn);
            
            if (undrawnTickets.length === 0) {
                console.log(`[VeSo] Không có vé nào để sổ cho guild ${guildData.guildId}`);
                continue;
            }
            
            // Nhóm vé theo mệnh giá
            const ticketsByPrice = {};
            config.settings.ticket_prices.forEach(price => {
                ticketsByPrice[price] = undrawnTickets.filter(t => t.price === price);
            });
            
            // Tạo số trúng cho mỗi mệnh giá
            const winningNumbers = [];
            const winners = [];
            
            for (const price of config.settings.ticket_prices.sort((a, b) => a - b)) {
                if (ticketsByPrice[price].length === 0) continue;
                
                // Tạo số ngẫu nhiên 4 chữ số
                const winningNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                winningNumbers.push({ price, numbers: winningNumber });
                
                // Tìm người thắng
                const winningTickets = ticketsByPrice[price].filter(t => t.numbers === winningNumber);
                
                for (const ticket of winningTickets) {
                    const prize = Math.floor(ticket.price * config.settings.win_multiplier);
                    
                    // Cập nhật vé
                    const ticketIndex = guildData.tickets.findIndex(t => 
                        t.userId === ticket.userId && 
                        t.numbers === ticket.numbers && 
                        t.price === ticket.price && 
                        !t.drawn
                    );
                    
                    if (ticketIndex !== -1) {
                        guildData.tickets[ticketIndex].drawn = true;
                        guildData.tickets[ticketIndex].won = true;
                        guildData.tickets[ticketIndex].prize = prize;
                    }
                    
                    // Thêm tiền cho người thắng
                    try {
                        let userData = await UserData.findOne({ 
                            userId: ticket.userId, 
                            guildId: guildData.guildId 
                        });
                        
                        if (userData) {
                            userData.balance += prize;
                            await userData.save();
                        }
                    } catch (error) {
                        console.error(`[VeSo] Lỗi khi cập nhật tiền cho user ${ticket.userId}:`, error);
                    }
                    
                    winners.push({
                        userId: ticket.userId,
                        price: ticket.price,
                        numbers: ticket.numbers,
                        prize: prize
                    });
                    
                    // Gửi thông báo cho người thắng
                    try {
                        const user = await client.users.fetch(ticket.userId);
                        const winEmbed = new EmbedBuilder()
                            .setColor(config.settings.colors.winner)
                            .setTitle('🎉 Chúc Mừng! Bạn Đã Trúng Số!')
                            .setDescription(
                                `**Mệnh giá:** ${ticket.price} ${mainConfig.Currency}\n` +
                                `**Số trúng:** \`${ticket.numbers}\`\n` +
                                `**Tiền thắng:** ${prize} ${mainConfig.Currency}`
                            )
                            .setTimestamp();
                        
                        await user.send({ embeds: [winEmbed] }).catch(() => {});
                    } catch (error) {
                        console.error(`[VeSo] Không thể gửi DM cho user ${ticket.userId}`);
                    }
                }
            }
            
            // Đánh dấu tất cả vé chưa trúng là đã sổ
            for (let i = 0; i < guildData.tickets.length; i++) {
                if (!guildData.tickets[i].drawn) {
                    guildData.tickets[i].drawn = true;
                    guildData.tickets[i].won = false;
                }
            }
            
            // Lưu lịch sử
            guildData.drawHistory.push({
                date: new Date(),
                winningNumbers: winningNumbers,
                winners: winners
            });
            
            await guildData.save();
            
            // Gửi thông báo công khai
            if (guildData.notificationChannel) {
                try {
                    const channel = await client.channels.fetch(guildData.notificationChannel);
                    
                    let winnersText = '';
                    if (winners.length === 0) {
                        winnersText = 'Không có người thắng cuộc hôm nay.';
                    } else {
                        for (const winner of winners) {
                            const user = await client.users.fetch(winner.userId).catch(() => null);
                            const username = user ? user.username : 'Unknown User';
                            winnersText += `${config.settings.winner_emoji} **${username}** - Vé: \`${winner.numbers}\` (${winner.price}) - Thắng: **${winner.prize} ${mainConfig.Currency}**\n`;
                        }
                    }
                    
                    const winningNumbersText = winningNumbers.map(wn => {
                        return `💰 **Mệnh giá ${wn.price}:** \`${wn.numbers}\``;
                    }).join('\n');
                    
                    const announceEmbed = new EmbedBuilder()
                        .setColor(config.settings.colors.winner)
                        .setTitle(config.messages.draw_result.title)
                        .setDescription(
                            config.messages.draw_result.description
                                .replace('{date}', new Date().toLocaleDateString('vi-VN'))
                                .replace('{winning_numbers}', winningNumbersText)
                                .replace('{winners}', winnersText)
                        )
                        .setFooter({ text: config.messages.draw_result.footer })
                        .setTimestamp();
                    
                    await channel.send({ embeds: [announceEmbed] });
                } catch (error) {
                    console.error(`[VeSo] Không thể gửi thông báo đến kênh:`, error);
                }
            }
            
            console.log(`[VeSo] Đã sổ xố cho guild ${guildData.guildId} - ${winners.length} người thắng`);
        }
    } catch (error) {
        console.error('[VeSo] Lỗi khi sổ xố:', error);
    }
}
module.exports.drawLottery = drawLottery;

async function checkMissedDraw(client, config, mainConfig) {
    const now = moment().tz(config.settings.timezone);
    const drawTime = moment.tz(config.settings.draw_time, 'HH:mm', config.settings.timezone);
    
    // Nếu đã qua giờ sổ hôm nay
    if (now.isAfter(drawTime)) {
        console.log('[VeSo] Kiểm tra nếu đã bỏ lỡ sổ xố hôm nay...');
        
        // Kiểm tra xem đã sổ hôm nay chưa
        const guilds = await VeSo.find({ enabled: true });
        
        for (const guildData of guilds) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayDraw = guildData.drawHistory.find(d => {
                const drawDate = new Date(d.date);
                drawDate.setHours(0, 0, 0, 0);
                return drawDate.getTime() === today.getTime();
            });
            
            if (!todayDraw && guildData.tickets.some(t => !t.drawn)) {
                console.log(`[VeSo] Thực hiện sổ xố bù cho guild ${guildData.guildId}`);
                await drawLottery(client, config, mainConfig);
                break;
            }
        }
    }
}

// Export hàm mua vé để sử dụng trong store
module.exports.buyTicket = async function(userId, guildId, price, customNumbers = null) {
    const configPath = path.join(__dirname, 'config.yml');
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    
    if (!config.settings.ticket_prices.includes(price)) {
        throw new Error('INVALID_PRICE');
    }
    
    let vesoData = await VeSo.findOne({ guildId });
    if (!vesoData) {
        vesoData = new VeSo({ guildId });
    }
    
    if (!vesoData.enabled) {
        throw new Error('DISABLED');
    }
    
    // Tạo số (tùy chỉnh hoặc ngẫu nhiên)
    let numbers;
    if (customNumbers && /^\d{4}$/.test(customNumbers)) {
        numbers = customNumbers;
        
        // Kiểm tra số đã được mua chưa
        const existingTicket = vesoData.tickets.find(t => 
            !t.drawn && 
            t.price === price && 
            t.numbers === numbers
        );
        
        if (existingTicket) {
            throw new Error('NUMBER_TAKEN');
        }
    } else {
        // Tạo số ngẫu nhiên
        numbers = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    }
    
    // Thêm vé vào database
    vesoData.tickets.push({
        userId,
        price,
        numbers,
        purchaseDate: new Date(),
        drawn: false,
        won: false
    });
    
    await vesoData.save();
    
    return {
        numbers,
        prize: Math.floor(price * config.settings.win_multiplier)
    };
};
