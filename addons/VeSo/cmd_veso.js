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
        ,

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
            
        }
    }
};

async function handleEnable(interaction, config) {
    const guildId = interaction.guild.id;
    
    let vesoData = await VeSo.findOne({ guildId });
    if (!vesoData) {
        vesoData = await VeSo.create({ guildId, enabled: true });
    } else {
        vesoData.enabled = true;
        await vesoData.save();
    }
    
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
        vesoData = await VeSo.create({ guildId, enabled: false });
    } else {
        vesoData.enabled = false;
        await vesoData.save();
    }
    
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
        vesoData = await VeSo.create({ guildId });
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




