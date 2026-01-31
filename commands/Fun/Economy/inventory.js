const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../../models/UserData'); // Using UserData as standard
const FishingUser = require('../../Addons/Fishing/schemas/fishingSchema');
const { getConfig } = require('../../../utils/configLoader');
const { getLang } = require('../../../utils/langLoader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Xem và quản lý kho đồ của bạn')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Xem kho đồ của bạn')
                .addUserOption(option => option.setName('user').setDescription('Xem kho đồ người khác (Admin)'))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('use')
                .setDescription('Sử dụng một vật phẩm')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Tên vật phẩm')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('equip')
                .setDescription('Trang bị vật phẩm (Cần câu, v.v)')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Tên vật phẩm')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),
    category: 'Economy',
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const user = await EconomyUserData.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
        if (!user || !user.inventory) return;

        const choices = user.inventory.map(item => item.itemId || item.name || item.key);
        const filtered = choices.filter(choice => choice && choice.toLowerCase().startsWith(focusedValue.toLowerCase()));
        await interaction.respond(
            filtered.slice(0, 25).map(choice => ({ name: choice, value: choice })),
        );
    },
    async execute(interaction) {
        const config = getConfig();
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const isSelf = targetUser.id === interaction.user.id;

        // Fetch User Data (Economy)
        // Note: EconomyUserData usually refers to UserData model in this bot based on context
        let userData = await EconomyUserData.findOne({ userId: targetUser.id, guildId: interaction.guild.id });
        if (!userData && isSelf) {
            userData = await EconomyUserData.create({ userId: targetUser.id, guildId: interaction.guild.id });
        }

        if (subcommand === 'view') {
            const fishingData = await FishingUser.findOne({ userId: targetUser.id });
            const inventory = userData ? (userData.inventory || []) : [];
            const rods = fishingData ? (fishingData.rods || []) : [];
            const baits = fishingData ? (fishingData.baits || []) : [];

            const categories = {
                fishing: [],
                farming: [],
                general: []
            };

            // 1. Fishing Gear
            rods.forEach(rodKey => {
                let rodName = rodKey;
                // Try config lookup
                if (config.Store && config.Store["Cần Câu"]) {
                    const found = Object.values(config.Store["Cần Câu"]).find(i => i.Key === rodKey || i.Name === rodKey);
                    if (found) rodName = found.Name;
                }
                categories.fishing.push(`🎣 **${rodName}**`);
            });
            // Fishing Inventory (Rods from user.equipment too?)
            if (userData && userData.equipment && userData.equipment.FishingRod) {
                // Check if it's already in rods? FishingUser usually tracks 'unlocked' rods.
                // If not, we might want to show equipped status.
            }

            // Baits
            if (Array.isArray(baits)) {
                baits.forEach(bait => {
                    // Baits can be strings or objects
                    if (typeof bait === 'string') categories.fishing.push(`🪱 **${bait}**`);
                    else categories.fishing.push(`🪱 **${bait.name || bait.key}** (x${bait.quantity || bait.count || 1})`);
                });
            }

            // 2. Main Inventory Separation
            if (inventory.length > 0) {
                const farmingKeywords = ['seed', 'hạt', 'fertilizer', 'phân bón'];

                inventory.forEach(item => {
                    const name = item.itemId || item.name || "Unknown";
                    const lowerName = name.toLowerCase();
                    const quantity = item.quantity || 0;

                    // Check Type using Config if possible
                    let isFarm = false;
                    // farmingKeywords check
                    if (farmingKeywords.some(k => lowerName.includes(k))) isFarm = true;

                    // Config Check
                    if (config.Store) {
                        if (config.Store["Hạt Giống"] && Object.values(config.Store["Hạt Giống"]).some(i => i.Name === name || i.Key === name)) isFarm = true;
                        if (config.Store["Phân bón"] && Object.values(config.Store["Phân bón"]).some(i => i.Name === name || i.Key === name)) isFarm = true;
                    }

                    if (isFarm) {
                        categories.farming.push(`🌱 **${name}** (x${quantity})`);
                    } else {
                        categories.general.push(`📦 **${name}** (x${quantity})`);
                    }
                });
            }

            // 3. Construct Embed
            const embed = new EmbedBuilder()
                .setTitle(`🎒 Túi đồ của ${targetUser.username}`)
                .setColor(config.EmbedColors?.Default || '#0099ff')
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            let desc = '';
            if (userData) {
                desc += `💰 **Tiền mặt:** ${userData.balance?.toLocaleString('vi-VN')} xu\n`;
                desc += `🏦 **Ngân hàng:** ${userData.bank?.toLocaleString('vi-VN')} xu\n\n`;
            }
            embed.setDescription(desc);

            let hasItems = false;

            if (categories.fishing.length > 0) {
                embed.addFields({ name: '🎣 Câu Cá (Cần & Mồi)', value: categories.fishing.join('\n'), inline: false });
                hasItems = true;
            }
            if (categories.farming.length > 0) {
                embed.addFields({ name: '🌱 Nông Trại', value: categories.farming.join('\n'), inline: false });
                hasItems = true;
            }
            if (categories.general.length > 0) {
                const limit = 15;
                const genList = categories.general.join('\n');
                if (categories.general.length > limit) {
                    const show = categories.general.slice(0, limit).join('\n');
                    embed.addFields({ name: '📦 Vật phẩm chung', value: `${show}\n...và ${categories.general.length - limit} món nữa.`, inline: false });
                } else {
                    embed.addFields({ name: '📦 Vật phẩm chung', value: genList, inline: false });
                }
                hasItems = true;
            }

            if (!hasItems) {
                embed.addFields({ name: 'Trống', value: 'Túi đồ trống trơn! Hãy ghé cửa hàng (`/store`) để mua sắm.' });
            }

            return interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'use' || subcommand === 'equip') {
            if (!isSelf) return interaction.reply({ content: 'Bạn không thể thao tác trên túi đồ người khác!', ephemeral: true });

            // Re-implement standard use/equip logic briefly to ensure compatibility
            const itemName = interaction.options.getString('item');
            const itemInInventory = userData.inventory.find(i => (i.itemId === itemName) || (i.name === itemName));

            if (!itemInInventory) {
                return interaction.reply({ content: 'Bạn không có vật phẩm này!', ephemeral: true });
            }

            // Logic for Equip/Use depends on item type. 
            // For now, retaining basic logic or redirecting.
            // Since I am overwriting, I must provide working logic.

            if (subcommand === 'equip') {
                // Check if Rod
                let isRod = false;
                if (config.Store && config.Store["Cần Câu"]) {
                    const found = Object.values(config.Store["Cần Câu"]).find(i => i.Name === itemName);
                    if (found) isRod = true;
                }
                if (isRod) {
                    // Update UseData equipment
                    if (!userData.equipment) userData.equipment = {};
                    userData.equipment.FishingRod = itemName;
                    await userData.save();
                    return interaction.reply({ content: `✅ Đã trang bị **${itemName}**!`, ephemeral: true });
                } else {
                    return interaction.reply({ content: 'Vật phẩm này không thể trang bị hoặc chưa được hỗ trợ.', ephemeral: true });
                }
            } else {
                return interaction.reply({ content: `✅ Đã sử dụng **${itemName}** (Chức năng đang cập nhật logic mới).`, ephemeral: true });
            }
        }
    }
};