const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const VeSo = require('./VesoSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('veso')
        .setDescription('Quản lý vé số')
        .addSubcommand(subcommand =>
            subcommand
                .setName('bat')
                .setDescription('Bật chức năng vé số (Admin)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tat')
                .setDescription('Tắt chức năng vé số (Admin)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Kiểm tra vé số đã mua'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('thongbao')
                .setDescription('Xem thông báo người thắng cuộc hôm nay'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup kênh thông báo (Admin)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Kênh để thông báo kết quả vé số')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tbketqua')
                .setDescription('Ép buộc quay xổ số ngay lập tức (Admin)')),

    async execute(interaction, client) {
        const configPath = path.join(__dirname, 'config.yml');
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        
        const subcommand = interaction.options.getSubcommand();
        
        // Các lệnh cần quyền admin
        if (['bat', 'tat', 'setup', 'tbketqua'].includes(subcommand)) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: config.errors.not_admin,
                    ephemeral: true
                });
            }
        }
        
        switch (subcommand) {
            case 'bat':
                await handleEnable(interaction, config);
                break;
            case 'tat':
                await handleDisable(interaction, config);
                break;
            case 'check':
                await handleCheck(interaction, config, client);
                break;
            case 'thongbao':
                await handleAnnouncement(interaction, config);
                break;
            case 'setup':
                await handleSetup(interaction, config);
                break;
            case 'tbketqua':
                await handleForceDraw(interaction, config, client);
                break;
        }
    }
};

async function handleEnable(interaction, config) {
    const guildId = interaction.guild.id;
    
    let vesoData = await VeSo.findOne({ guildId });
    if (!vesoData) {
        vesoData = new VeSo({ guildId, enabled: true });
    } else {
        vesoData.enabled = true;
    }
    await vesoData.save();
    
    const embed = new EmbedBuilder()
        .setColor(config.settings.colors.check)
        .setTitle(config.messages.feature_enabled.title)
        .setDescription(config.messages.feature_enabled.description)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleDisable(interaction, config) {
    const guildId = interaction.guild.id;
    
    let vesoData = await VeSo.findOne({ guildId });
    if (!vesoData) {
        vesoData = new VeSo({ guildId, enabled: false });
    } else {
        vesoData.enabled = false;
    }
    await vesoData.save();
    
    const embed = new EmbedBuilder()
        .setColor(config.settings.colors.check)
        .setTitle(config.messages.feature_disabled.title)
        .setDescription(config.messages.feature_disabled.description)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleCheck(interaction, config, client) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    const vesoData = await VeSo.findOne({ guildId });
    
    if (!vesoData || !vesoData.enabled) {
        return interaction.reply({
            content: config.errors.disabled,
            ephemeral: true
        });
    }
    
    const userTickets = vesoData.tickets.filter(t => t.userId === userId && !t.drawn);
    
    if (userTickets.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(config.settings.colors.check)
            .setTitle(config.messages.no_tickets.title)
            .setDescription(config.messages.no_tickets.description)
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    const ticketsList = userTickets.map(t => {
        return `${config.settings.ticket_emoji} **${t.price}** - Số: \`${t.numbers}\` - Thắng: **${t.price * config.settings.win_multiplier}**`;
    }).join('\n');
    
    const embed = new EmbedBuilder()
        .setColor(config.settings.colors.check)
        .setTitle(config.messages.check_tickets.title)
        .setDescription(
            config.messages.check_tickets.description
                .replace('{total}', userTickets.length)
                .replace('{tickets_list}', ticketsList)
        )
        .setFooter({ text: config.messages.check_tickets.footer })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAnnouncement(interaction, config) {
    const guildId = interaction.guild.id;
    
    const vesoData = await VeSo.findOne({ guildId });
    
    if (!vesoData || !vesoData.enabled) {
        return interaction.reply({
            content: config.errors.disabled,
            ephemeral: true
        });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayDraw = vesoData.drawHistory.find(d => {
        const drawDate = new Date(d.date);
        drawDate.setHours(0, 0, 0, 0);
        return drawDate.getTime() === today.getTime();
    });
    
    if (!todayDraw) {
        return interaction.reply({
            content: config.errors.no_draw_today,
            ephemeral: true
        });
    }
    
    let winnersText = '';
    if (todayDraw.winners.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(config.settings.colors.draw)
            .setTitle(config.messages.no_winners.title)
            .setDescription(config.messages.no_winners.description)
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
    
    for (const winner of todayDraw.winners) {
        const user = await interaction.client.users.fetch(winner.userId).catch(() => null);
        const username = user ? user.username : 'Unknown User';
        winnersText += `${config.settings.winner_emoji} **${username}** - Vé: \`${winner.numbers}\` - Thắng: **${winner.prize}**\n`;
    }
    
    const winningNumbersText = todayDraw.winningNumbers.map(wn => {
        return `💰 **Mệnh giá ${wn.price}:** \`${wn.numbers}\``;
    }).join('\n');
    
    const embed = new EmbedBuilder()
        .setColor(config.settings.colors.winner)
        .setTitle(config.messages.draw_result.title)
        .setDescription(
            config.messages.draw_result.description
                .replace('{date}', today.toLocaleDateString('vi-VN'))
                .replace('{winning_numbers}', winningNumbersText)
                .replace('{winners}', winnersText)
        )
        .setFooter({ text: config.messages.draw_result.footer })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleSetup(interaction, config) {
    const guildId = interaction.guild.id;
    const channel = interaction.options.getChannel('channel');
    
    let vesoData = await VeSo.findOne({ guildId });
    if (!vesoData) {
        vesoData = new VeSo({ guildId });
    }
    
    vesoData.notificationChannel = channel.id;
    await vesoData.save();
    
    const embed = new EmbedBuilder()
        .setColor(config.settings.colors.check)
        .setTitle('✅ Setup Thành Công')
        .setDescription(`Kênh thông báo vé số đã được đặt là ${channel}`)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleForceDraw(interaction, config, client) {
    const guildId = interaction.guild.id;
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Import hàm drawLottery từ veso.js
        const vesoModule = require('./veso.js');
        const { getConfig: getMainConfig } = require('../../utils/configLoader');
        const mainConfig = getMainConfig();
        
        // Gọi hàm sổ xố cho guild hiện tại
        const vesoData = await VeSo.findOne({ guildId });
        
        if (!vesoData || !vesoData.enabled) {
            return interaction.editReply({
                content: config.errors.disabled
            });
        }
        
        const undrawnTickets = vesoData.tickets.filter(t => !t.drawn);
        
        if (undrawnTickets.length === 0) {
            return interaction.editReply({
                content: '❌ Không có vé nào để sổ!'
            });
        }
        
        // Thực hiện sổ xố
        await performDraw(client, config, mainConfig, vesoData);
        
        await interaction.editReply({
            content: '✅ Đã thực hiện sổ xố thành công! Kiểm tra kết quả bằng `/veso thongbao`'
        });
        
    } catch (error) {
        console.error('[VeSo Force Draw] Error:', error);
        await interaction.editReply({
            content: '❌ Có lỗi xảy ra khi thực hiện sổ xố: ' + error.message
        });
    }
}

async function performDraw(client, config, mainConfig, guildData) {
    const UserData = require('../../models/UserData');
    
    // Lọc vé chưa được sổ
    const undrawnTickets = guildData.tickets.filter(t => !t.drawn);
    
    if (undrawnTickets.length === 0) {
        return;
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
