const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    SlashCommandBuilder,
    AttachmentBuilder
} = require('discord.js');
const { getLang, getConfig } = require('../../utils/configLoader');
const lang = getLang();
const config = getConfig();

// Import SQLite Models
const UserUmaModel = require('./schemas/useruma');
const UserSupportCard = require('./schemas/SupportCard');
const UmaMusume = require('./schemas/UmaMusume');
const UmaPlayer = require('./schemas/UmaPlayer');
const UmaCareer = require('./schemas/UmaCareer');

// Economy and util mappings
const EconomyUserData = require('../../models/EconomyUserData');
const UserCooldown = require('../../models/cooldown');

const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-US').format(amount);
};

// ... Helper functions would go here ...

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uma')
        .setDescription('Hệ thống Uma Musume - Training Derby')
        .addSubcommand(sub => 
            sub.setName('profile')
                .setDescription('Xem hồ sơ Uma Musume của bạn')
                .addUserOption(option => option.setName('user').setDescription('Người dùng khác').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('gacha')
                .setDescription('Quay Gacha Uma Musume')
                .addStringOption(option => 
                    option.setName('type')
                        .setDescription('Loại Gacha')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Character (150 Carrots)', value: 'char' },
                            { name: 'Support Card (150 Carrots)', value: 'card' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số lượng quay')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Single (1)', value: 1 },
                            { name: 'Multi (10)', value: 10 }
                        )))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Xem danh sách Uma Musume của bạn')
                .addUserOption(option => option.setName('user').setDescription('Người dùng khác').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('set_favorite')
                .setDescription('Đặt Uma Musume làm đại diện')) // Logic handled via select menu usually
        .addSubcommand(sub =>
            sub.setName('train')
                .setDescription('Huấn luyện Uma Musume'))
        .addSubcommand(sub =>
            sub.setName('retire')
                .setDescription('Cho nghỉ hưu Uma Musume'))
        .addSubcommand(sub =>
            sub.setName('daily')
                .setDescription('Nhận quà hàng ngày')),
    
    run: async (client, interaction) => {
        if (!interaction.guild) return interaction.reply({ content: 'Chỉ dùng trong server.', ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user') || interaction.user;

        if (subcommand === 'profile') {
            await handleProfile(client, interaction, user);
        } else if (subcommand === 'gacha') {
            await handleGacha(client, interaction);
        } else if (subcommand === 'list') {
            await handleList(client, interaction, user);
        } else if (subcommand === 'train') {
            await handleTrain(client, interaction);
        } else if (subcommand === 'daily') {
            await handleDaily(client, interaction);
        } else {
             await interaction.reply({ content: 'Tính năng đang được phát triển.', ephemeral: true });
        }
    },

    // Message command fallback if needed
    name: 'uma',
    description: 'Hệ thống Uma Musume',
    aliases: ['umamusume'],
    runMsg: async (client, message, args) => {
         message.reply('Vui lòng sử dụng slash command `/uma`.');
    }
};

async function handleProfile(client, interaction, user) {
    const player = await UmaPlayer.findOne({ userId: user.id }) || await UmaPlayer.create({ userId: user.id });
    const userUmas = await UserUmaModel.find({ userId: user.id });
    
    // Find favorite
    let favoriteUma = userUmas.find(u => u.isFavorite);
    if (!favoriteUma && userUmas.length > 0) favoriteUma = userUmas[0];

    const embed = new EmbedBuilder()
        .setTitle(`Hồ sơ HLV ${user.username}`)
        .setColor('#FF69B4')
        .addFields(
            { name: 'Tài chính', value: `🥕 ${formatMoney(player.carrots)} Carrots\n💰 ${formatMoney(player.coins)} Coins`, inline: true },
            { name: 'Bộ sưu tập', value: `${userUmas.length} Uma Musume`, inline: true },
            { name: 'Năng lượng', value: `${player.energy}/${player.maxEnergy}`, inline: true }
        );

    if (favoriteUma) {
        embed.setImage(favoriteUma.imageUrl || 'https://example.com/default_uma.png'); // Placeholder
        embed.addFields({ name: 'Đại diện', value: `${favoriteUma.name} (${favoriteUma.rarity}⭐)` });
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleGacha(client, interaction) {
    const type = interaction.options.getString('type');
    const amount = interaction.options.getInteger('amount');
    const cost = amount * 150;

    let player = await UmaPlayer.findOne({ userId: interaction.user.id });
    if (!player) player = await UmaPlayer.create({ userId: interaction.user.id });

    if (player.carrots < cost) {
        return interaction.reply({ content: `Bạn không đủ Carrots! Cần ${cost} 🥕.`, ephemeral: true });
    }

    player.carrots -= cost;
    await player.save();

    const results = [];
    for (let i = 0; i < amount; i++) {
        // Simple gacha logic
        const rarity = Math.random() < 0.03 ? 3 : (Math.random() < 0.2 ? 2 : 1);
        // ... Logic to pick specific uma/card would go here ...
        const newItem = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            userId: interaction.user.id,
            rarity: rarity,
            name: type === 'char' ? `Random Uma ${rarity}⭐` : `Random Card ${rarity}⭐`,
            type: type
        };
        
        if (type === 'char') {
            await UserUmaModel.create(newItem);
        } else {
            await UserSupportCard.create(newItem);
        }
        results.push(newItem);
    }

    const embed = new EmbedBuilder()
        .setTitle(`Kết quả Gacha ${amount}x`)
        .setDescription(results.map(r => `${r.rarity}⭐ ${r.name}`).join('\n'))
        .setColor('#FFD700');

    await interaction.reply({ embeds: [embed] });
}

async function handleList(client, interaction, user) {
    const umas = await UserUmaModel.find({ userId: user.id });
    if (umas.length === 0) return interaction.reply({ content: 'Bạn chưa có Uma Musume nào.', ephemeral: true });

    // Pagination logic using slice
    const pageSize = 10;
    const page = 1;
    const sliced = umas.slice(0, pageSize);
    
    const embed = new EmbedBuilder()
        .setTitle(`Danh sách Uma Musume của ${user.username}`)
        .setDescription(sliced.map(u => `**${u.name}** (${u.rarity}⭐) - Rank ${u.rank}`).join('\n'));

    await interaction.reply({ embeds: [embed] });
}

async function handleTrain(client, interaction) {
    // Placeholder handles
    await interaction.reply({ content: 'Chức năng huấn luyện đang được bảo trì để nâng cấp database.', ephemeral: true });
}

async function handleDaily(client, interaction) {
    const cooldown = await UserCooldown.findOne({ userId: interaction.user.id, type: 'uma_daily' });
    if (cooldown && cooldown.endTime > Date.now()) {
         return interaction.reply({ content: `Bạn đã nhận quà hôm nay rồi. Quay lại sau <t:${Math.floor(cooldown.endTime/1000)}:R>.`, ephemeral: true });
    }

    // Give rewards
    let player = await UmaPlayer.findOne({ userId: interaction.user.id });
    if (!player) player = await UmaPlayer.create({ userId: interaction.user.id });
    
    player.carrots += 50;
    await player.save();

    const next = Date.now() + 86400000;
    await UserCooldown.findOneAndUpdate({ userId: interaction.user.id, type: 'uma_daily' }, { endTime: next }, { upsert: true });

    await interaction.reply({ content: 'Bạn đã nhận 50 🥕 quà hàng ngày!' });
}

// ... more handlers ...
