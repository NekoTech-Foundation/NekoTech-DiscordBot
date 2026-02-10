const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();

const EconomyUserData = require('../../../models/EconomyUserData');
const parseDuration = require('./Utility/parseDuration');
const { replacePlaceholders } = require('./Utility/helpers');
const { getUserFishing, loadConfig: loadFishingConfig } = require('../../Addons/Fishing/fishingUtils.js');
const { getUserFarm, checkStoreRestock, seeds, fertilizers } = require('../../Addons/Farming/farmUtils.js');


// Import vé số addon nếu có
let vesoAddon = null;
let vesoConfig = null;
try {
    vesoAddon = require('../../Addons/VeSo/veso.js'); // Ensure this path is correct relative to store.js
    vesoConfig = yaml.load(fs.readFileSync(path.join(__dirname, '../../Addons/VeSo/config.yml'), 'utf8'));
} catch (error) {
    // Vé số addon không có hoặc chưa cài
    console.log('[Store] VeSo addon load warning:', error.message);
}

module.exports = {
    data: (() => {
        const builder = new SlashCommandBuilder()
            .setName('store')
            .setDescription('Mua hàng từ cửa hàng, uh... chất lắm!')
            .addStringOption(option => {
                option.setName('category')
                    .setDescription('Chọn Danh Mục Muốn Mua')
                    .setRequired(true);

                const categories = Object.keys(config.Store).filter(category =>
                    category !== 'Embed' && category !== 'Categories'
                );

                categories.forEach(category => {
                    option.addChoices({ name: category, value: category });
                });

                return option;
            });

        return builder;
    })(),
    category: 'Economy',

    async execute(interaction) {
        const lang = await getLang(interaction.guildId);
        try {
            const category = interaction.options.getString('category');

            // Validate category exists and has items
            if (!config.Store[category]) {
                await interaction.reply({
                    content: 'Invalid category selected.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            let items = [];
            if (category === 'Hạt Giống') {
                items = Object.entries(seeds)
                    .filter(([key, seed]) => seed.restockChance > 0)
                    .map(([key, seed]) => ({
                        Name: seed.name,
                        Price: seed.price,
                        Key: key,
                        Type: 'Seed',
                        Description: `Độ hiếm: ${seed.rarity}`,
                        GrowthTime: seed.growthTime,
                        Stock: undefined
                    }));
            } else if (category === 'Phân bón') {
                items = Object.entries(fertilizers).map(([key, f]) => ({
                    Name: f.name,
                    Price: f.price,
                    Key: key,
                    Type: 'Fertilizer',
                    Description: `${f.tierEmoji} ${f.tier.toUpperCase()} — ${f.description}`,
                    Stock: undefined
                }));
            } else {
                items = Object.values(config.Store[category] || {});
            }
            items.sort((a, b) => a.Price - b.Price);

            if (!items || items.length === 0) {
                await interaction.reply({
                    content: 'This category has no items available.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const itemsPerPage = 5;
            let page = 0;
            const totalPages = Math.ceil(items.length / itemsPerPage);

            // Build rarity filter data (only for seeds)
            const rarityOrder = [
                { key: 'Common', emoji: '🌱', label: 'C' },
                { key: 'Uncommon', emoji: '🔵', label: 'UC' },
                { key: 'Rare', emoji: '🟢', label: 'R' },
                { key: 'Legendary', emoji: '🟡', label: 'L' },
                { key: 'Mythical', emoji: '🟣', label: 'M' },
                { key: 'Divine', emoji: '🔴', label: 'D' },
                { key: 'Prismatic', emoji: '💎', label: 'P' }
            ];
            const rarityItemsMap = {}; // rarity -> filtered items with original indices
            if (category === 'Hạt Giống') {
                for (const r of rarityOrder) {
                    const filtered = items
                        .map((item, idx) => ({ ...item, _originalIdx: idx }))
                        .filter(i => i.Description && i.Description.includes(r.key));
                    if (filtered.length > 0) {
                        rarityItemsMap[r.key] = filtered;
                    }
                }
            }
            let activeRarityFilter = null; // null = normal paginated view

            const getItemList = (currentPage) => {
                const start = currentPage * itemsPerPage;
                const end = start + itemsPerPage;
                return items.slice(start, end).map((item, index) => {
                    // Safely handle missing description array
                    let descriptionTemplate = lang.Economy?.Other?.Store?.Embed?.Description;

                    if (!descriptionTemplate) {
                        console.log('[DEBUG Store] Missing description template, using fallback.');
                        descriptionTemplate = ['{itemCount}. {item} - {price}'];
                    }

                    if (!Array.isArray(descriptionTemplate)) {
                        console.log('[DEBUG Store] descriptionTemplate is not array, wrapping.');
                        descriptionTemplate = [descriptionTemplate];
                    }

                    let stockDisplay = '';
                    if (item.Stock !== undefined) {
                        if (item.Stock > 0) {
                            stockDisplay = `\n📦 Kho: **${item.Stock}**`;
                        } else {
                            stockDisplay = `\n🚫 **HẾT HÀNG**`;
                        }
                    }

                    const localizedItemName = lang.Economy?.Other?.Store?.Items?.[item.Key] || item.Name || 'Unknown Item';

                    let descriptionText = item.Description || 'No description';
                    if (item.Type === 'Seed' && item.GrowthTime) {
                        const template = lang.Economy?.Other?.Store?.SeedDescription;
                        if (template) {
                            descriptionText = replacePlaceholders(template, { time: item.GrowthTime / 60000 });
                        }
                    }

                    return descriptionTemplate.map(line => replacePlaceholders(line, {
                        itemCount: `${start + index + 1}`,
                        item: localizedItemName,
                        description: descriptionText + stockDisplay,
                        price: item.Price || 0
                    })).join('\n');
                }).join('\n\n');
            };

            const createEmbed = async (currentPage) => {
                const embedConfig = lang.Economy?.Other?.Store?.Embed || {};
                const embed = new EmbedBuilder().setColor(embedConfig.Color || '#0099ff');

                const localizedCategoryName = lang.Economy?.Other?.Store?.Categories?.[category] || category;

                if (embedConfig.Title) {
                    embed.setTitle(replacePlaceholders(embedConfig.Title, { shopName: localizedCategoryName }));
                }

                // Fetch user data for balance display
                let userData = await EconomyUserData.findOne({ userId: interaction.user.id });
                const userBalance = userData ? userData.balance : 0;

                // Fetch Global Restock State
                const globalState = await checkStoreRestock();
                const nextRestockTime = globalState.storeNextRestock;
                const now = Date.now();
                const timeRemaining = nextRestockTime - now;
                const minutes = Math.floor(timeRemaining / 60000);
                const seconds = Math.floor((timeRemaining % 60000) / 1000);
                const timeString = timeRemaining > 0 ? `${minutes}m ${seconds}s` : 'Đang Restock...';

                embed.setDescription(`💳 **Số dư của bạn:** ${userBalance.toLocaleString()} xu\n⏳ **Restock sau:** ${timeString}\n\nChào mừng đến với cửa hàng! Hãy chọn vật phẩm bạn muốn mua.`);

                const start = currentPage * itemsPerPage;
                const end = start + itemsPerPage;
                const currentItems = items.slice(start, end);

                // Fetch User Farm Data for Personal Stock
                const userFarm = await getUserFarm(interaction.user.id);
                // Synchronize cycle if needed (visual only, actual sync happens on purchase)
                if (userFarm.storeCycleId !== globalState.storeNextRestock) {
                    // For display purposes, we assume 0 bought if cycle mismatch
                }

                currentItems.forEach((item, index) => {
                    const globalIndex = start + index + 1;
                    const localizedItemName = lang.Economy?.Other?.Store?.Items?.[item.Key] || item.Name || 'Unknown Item';
                    let descriptionText = item.Description || 'No description';

                    if (item.Type === 'Seed' && item.GrowthTime) {
                        const template = lang.Economy?.Other?.Store?.SeedDescription;
                        if (template) {
                            descriptionText = replacePlaceholders(template, { time: item.GrowthTime / 60000 });
                        }
                    }

                    let stockInfo = "";
                    if (item.Type === 'Seed') {
                        // Find seed key
                        const seedEntries = Object.entries(seeds);
                        const seedEntry = seedEntries.find(([k, v]) => v.name === item.Name);

                        if (seedEntry) {
                            const seedKey = seedEntry[0];
                            const globalLimit = globalState.currentStockLimits[seedKey] || 0;

                            let userBought = 0;
                            if (userFarm.storeCycleId === globalState.storeNextRestock) {
                                userBought = userFarm.seedPurchases[seedKey] || 0;
                            }

                            const available = Math.max(0, globalLimit - userBought);
                            const maxLimit = seedEntries.find(([k]) => k === seedKey)[1].stockLimit;

                            if (globalLimit <= 0) {
                                stockInfo = `| 🚫 **Hết hàng (0/${maxLimit})**`;
                            } else if (available <= 0) {
                                stockInfo = `| 🚫 **Bạn đã mua hết (${userBought}/${globalLimit})**`;
                            } else {
                                stockInfo = `| 📦 Kho: **${available}/${maxLimit}**`;
                                // User requested "14/50" style where 14 is current available, 50 is max possible.
                                // Actually, if globalLimit is 14, and maxLimit is 50.
                                // Display: `${available}/${maxLimit}`.
                                // If I bought 1, available is 13. Display `13/50`.
                            }
                        } else {
                            stockInfo = `| ❓ Lỗi Data`;
                        }

                    } else if (item.Stock !== undefined) {
                        stockInfo = item.Stock > 0 ? `| 📦 Kho: ${item.Stock}` : `| 🚫 **HẾT HÀNG**`;
                    }

                    const priceDisplay = item.Price ? `${item.Price.toLocaleString()} xu` : 'Miễn phí';

                    // Add Sell Price display if available (for Seeds)
                    let sellPriceDisplay = "";
                    if (item.Type === 'Seed') {
                        // Find seed again (inefficient but safe)
                        const seedEntry = Object.entries(seeds).find(([k, v]) => v.name === item.Name);
                        if (seedEntry && seedEntry[1].sellPrice) {
                            sellPriceDisplay = `\n💰 Giá bán: **${seedEntry[1].sellPrice.toLocaleString()} xu**`;
                        }
                    }

                    embed.addFields({
                        name: `#${globalIndex} ${localizedItemName}`,
                        value: `💰 Giá mua: **${priceDisplay}**${sellPriceDisplay} ${stockInfo}\n📝 ${descriptionText}`,
                        inline: false
                    });
                });

                if (embedConfig.Footer?.Text) {
                    embed.setFooter({
                        text: replacePlaceholders(embedConfig.Footer.Text, {
                            pageCurrent: currentPage + 1,
                            pageMax: totalPages
                        }),
                        iconURL: embedConfig.Footer.Icon || undefined
                    });
                }

                if (embedConfig.Author?.Text) {
                    embed.setAuthor({
                        name: embedConfig.Author.Text,
                        iconURL: embedConfig.Author.Icon || undefined
                    });
                }

                if (embedConfig.Image) {
                    embed.setImage(embedConfig.Image);
                }

                if (embedConfig.Thumbnail) {
                    embed.setThumbnail(embedConfig.Thumbnail);
                }

                return embed;
            };

            const createComponents = (currentPage) => {
                const start = currentPage * itemsPerPage;
                const end = Math.min(start + itemsPerPage, items.length);
                const currentItems = items.slice(start, end);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('buy')
                    .setPlaceholder('Chọn vật phẩm để mua.')
                    .addOptions(currentItems.map((item, index) => ({
                        label: item.Name || `Item ${index + 1}`,
                        description: (item.Description || 'No description').substring(0, 100),
                        value: `${start + index}`
                    })));

                const navigationRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back')
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('forward')
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === totalPages - 1)
                    );

                const rows = [
                    new ActionRowBuilder().addComponents(selectMenu),
                    navigationRow
                ];

                // Add rarity filter buttons for seed stores (max 5 per row)
                if (Object.keys(rarityItemsMap).length > 0) {
                    const rarityButtons = rarityOrder
                        .filter(r => rarityItemsMap[r.key])
                        .map(r =>
                            new ButtonBuilder()
                                .setCustomId(`rarity_${r.key}`)
                                .setLabel(r.label)
                                .setEmoji(r.emoji)
                                .setStyle(ButtonStyle.Secondary)
                        );
                    for (let i = 0; i < rarityButtons.length; i += 5) {
                        if (rows.length < 5) {
                            rows.push(new ActionRowBuilder().addComponents(rarityButtons.slice(i, i + 5)));
                        }
                    }
                }

                return rows;
            };

            // === Rarity Filter View (plain text) ===
            const createRarityContent = async (rarity) => {
                const filteredItems = rarityItemsMap[rarity] || [];
                const rarityInfo = rarityOrder.find(r => r.key === rarity);
                const globalState = await checkStoreRestock();
                const userFarm = await getUserFarm(interaction.user.id);
                let userData = await EconomyUserData.findOne({ userId: interaction.user.id });
                const userBalance = userData ? userData.balance : 0;

                let text = `${rarityInfo.emoji} **─── ${rarity.toUpperCase()} ───** ${rarityInfo.emoji}\n`;
                text += `💳 Số dư: **${userBalance.toLocaleString()} xu**\n\n`;

                for (const item of filteredItems) {
                    const seedEntry = Object.entries(seeds).find(([k, v]) => v.name === item.Name);
                    let stockInfo = '';
                    if (seedEntry) {
                        const seedKey = seedEntry[0];
                        const globalLimit = globalState.currentStockLimits[seedKey] || 0;
                        let userBought = 0;
                        if (userFarm.storeCycleId === globalState.storeNextRestock) {
                            userBought = userFarm.seedPurchases[seedKey] || 0;
                        }
                        const available = Math.max(0, globalLimit - userBought);
                        const maxLimit = seedEntry[1].stockLimit;
                        if (globalLimit <= 0) stockInfo = '🚫 Hết hàng';
                        else if (available <= 0) stockInfo = `🚫 Đã mua hết (${userBought}/${globalLimit})`;
                        else stockInfo = `📦 ${available}/${maxLimit}`;
                    }

                    const sellPrice = seedEntry ? (seedEntry[1].sellPrice || 0) : 0;
                    const growthMin = item.GrowthTime ? Math.floor(item.GrowthTime / 60000) : '?';

                    text += `• **${item.Name}** — 💰 ${item.Price.toLocaleString()} xu | 💵 ${sellPrice.toLocaleString()} xu`;
                    text += ` | ${stockInfo} | ⏱️ ${growthMin} phút\n`;
                }

                return text;
            };

            const createRarityComponents = (rarity) => {
                const filteredItems = rarityItemsMap[rarity] || [];

                const rows = [];

                // Select menu for buying (if items exist)
                if (filteredItems.length > 0) {
                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('buy')
                        .setPlaceholder('Chọn hạt giống để mua')
                        .addOptions(filteredItems.map((item) => ({
                            label: item.Name,
                            description: `${item.Price.toLocaleString()} xu`,
                            value: `${item._originalIdx}`
                        })));
                    rows.push(new ActionRowBuilder().addComponents(selectMenu));
                }

                // Rarity buttons with active highlight + "All" back button
                const allButton = new ButtonBuilder()
                    .setCustomId('rarity_all')
                    .setLabel('Tất cả')
                    .setEmoji('📜')
                    .setStyle(ButtonStyle.Primary);

                const rarityButtons = rarityOrder
                    .filter(r => rarityItemsMap[r.key])
                    .map(r =>
                        new ButtonBuilder()
                            .setCustomId(`rarity_${r.key}`)
                            .setLabel(r.label)
                            .setEmoji(r.emoji)
                            .setStyle(r.key === rarity ? ButtonStyle.Success : ButtonStyle.Secondary)
                            .setDisabled(r.key === rarity)
                    );

                // Combine: [All] + rarity buttons, split into rows of 5
                const allBtns = [allButton, ...rarityButtons];
                for (let i = 0; i < allBtns.length; i += 5) {
                    if (rows.length < 5) {
                        rows.push(new ActionRowBuilder().addComponents(allBtns.slice(i, i + 5)));
                    }
                }

                return rows;
            };

            const updateMessage = async (i) => {
                try {
                    if (activeRarityFilter) {
                        // Rarity filter mode: plain text
                        await i.update({
                            content: await createRarityContent(activeRarityFilter),
                            embeds: [],
                            components: createRarityComponents(activeRarityFilter)
                        });
                    } else {
                        // Normal paginated embed mode
                        await i.update({
                            content: '',
                            embeds: [await createEmbed(page)],
                            components: createComponents(page)
                        });
                    }
                } catch (error) {
                    console.error('Error updating message:', error);
                }
            };

            const handlePurchase = async (i, itemIndex) => {
                try {
                    const item = items[itemIndex];

                    if (!item) {
                        await i.reply({
                            content: 'Invalid item selection.',
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    }

                    let user = await EconomyUserData.findOne({ userId: i.user.id });
                    if (!user) {
                        user = await EconomyUserData.create({ userId: i.user.id, balance: 0 });
                    }

                    const itemPrice = item.Price || 0;



                    if (user.balance < itemPrice) {

                        await i.reply({

                            content: lang.Economy?.Messages?.noMoney || 'You do not have enough money.',

                            flags: MessageFlags.Ephemeral

                        });

                        return;

                    }



                    // Handle Fishing Rod Purchase

                    if (category === 'Cần Câu') {

                        const userFishing = await getUserFishing(i.user.id);

                        const fishingConfig = loadFishingConfig();

                        const rodInfo = fishingConfig.rods[item.Key];



                        if (!rodInfo) {

                            return i.reply({ content: 'Lỗi: Không tìm thấy thông tin cần câu.', ephemeral: true });

                        }



                        user.balance -= itemPrice;



                        const existingRodIndex = userFishing.rods.findIndex(r => r.key === item.Key);

                        const newRod = { key: item.Key, name: rodInfo.name, durability: rodInfo.durability };



                        if (existingRodIndex > -1) {

                            userFishing.rods[existingRodIndex] = newRod;

                        } else {

                            userFishing.rods.push(newRod);

                        }



                        if (!userFishing.equippedRod) {

                            userFishing.equippedRod = item.Key;

                        }



                        await user.save();

                        await userFishing.save();



                        return i.reply({ content: `Bạn đã mua thành công ${item.Name}.\nSử dụng lệnh \`/cauca select\` để trang bị và sử dụng nó!`, ephemeral: true });

                    }



                    // Handle Fishing Bait Purchase

                    if (category === 'Mồi Câu') {

                        const userFishing = await getUserFishing(i.user.id);

                        const fishingConfig = loadFishingConfig();

                        const baitInfo = fishingConfig.baits[item.Key];

                        if (!baitInfo) {

                            return i.reply({ content: 'Lỗi: Không tìm thấy thông tin mồi câu.', ephemeral: true });

                        }



                        user.balance -= itemPrice;

                        const existingBait = userFishing.baits.find(b => b.name === baitInfo.name);

                        if (existingBait) {

                            existingBait.quantity += 1;

                        } else {

                            userFishing.baits.push({ name: baitInfo.name, quantity: 1 });

                        }



                        await user.save();

                        await userFishing.save();



                        return i.reply({ content: `Bạn đã mua thành công 1 ${item.Name}.`, ephemeral: true });

                    }

                    // Handle Fertilizer Purchase
                    if (category === 'Phân bón') {
                        const userFarm = await getUserFarm(i.user.id);
                        user.balance -= itemPrice;
                        const existingFertilizer = userFarm.items.find(it => it.name === item.Name && it.type === 'Fertilizer');
                        if (existingFertilizer) {
                            existingFertilizer.quantity += 1;
                        } else {
                            userFarm.items.push({ name: item.Name, quantity: 1, type: 'Fertilizer' });
                        }
                        await user.save();
                        await userFarm.save();
                        return i.reply({ content: `Bạn đã mua thành công ${item.Name}.`, ephemeral: true });
                    }


                    // Kiểm tra nếu là vé số
                    if (category === 'Vé Số' && vesoAddon && vesoConfig) {
                        const price = item.Price || 0;

                        let user = await EconomyUserData.findOne(
                            { userId: i.user.id },
                            { balance: 1, transactionLogs: 1 });

                        if (!user) {
                            user = await EconomyUserData.create({
                                userId: i.user.id,
                                balance: 0,
                                transactionLogs: []
                            });
                        }

                        // Đảm bảo transactionLogs tồn tại
                        if (!user.transactionLogs) {
                            user.transactionLogs = [];
                        }

                        if (user.balance < price) {
                            await i.reply({
                                content: lang.Economy?.Messages?.noMoney || 'You do not have enough money.',
                                flags: MessageFlags.Ephemeral
                            });
                            return;
                        }

                        // Hiển thị modal để chọn số
                        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalActionRow } = require('discord.js');

                        const modal = new ModalBuilder()
                            .setCustomId(`veso_choose_${price}_${i.user.id}`)
                            .setTitle('🎫 Chọn Số Vé Của Bạn');

                        const numberInput = new TextInputBuilder()
                            .setCustomId('veso_numbers')
                            .setLabel('Nhập số 4 chữ số (0000-9999)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Ví dụ: 1234')
                            .setRequired(true)
                            .setMinLength(4)
                            .setMaxLength(4);

                        const actionRow = new ModalActionRow().addComponents(numberInput);
                        modal.addComponents(actionRow);

                        await i.showModal(modal);
                        return;
                    }

                    if (!user.purchasedItems) user.purchasedItems = [];
                    if (!user.inventory) user.inventory = [];
                    if (!user.transactionLogs) user.transactionLogs = [];


                    const purchasedItemIndex = user.purchasedItems.findIndex(p => p.itemId === item.Name);
                    if (item.Limit && purchasedItemIndex >= 0) {
                        const currentQuantity = user.purchasedItems[purchasedItemIndex].quantity || 0;
                        const limit = parseInt(item.Limit, 10);
                        if (currentQuantity >= limit) {
                            await i.reply({
                                content: replacePlaceholders(
                                    lang.Economy?.Other?.Store?.purchaseLimit || 'You have reached the purchase limit for {item}.',
                                    { limit: item.Limit, item: item.Name }
                                ),
                                flags: MessageFlags.Ephemeral
                            });
                            return;
                        }
                    }

                    const currentInterestRate = user.interestRate ?? config.Economy?.defaultInterestRate ?? 0;

                    // Handle Interest type items
                    if (item.Type === 'Interest') {
                        const itemInterest = item.Interest || 0;
                        if (currentInterestRate >= itemInterest) {
                            await i.reply({
                                content: lang.Economy?.Other?.Store?.higherInterestRate || 'You already have a higher or equal interest rate.',
                                flags: MessageFlags.Ephemeral
                            });
                            return;
                        }
                        user.interestRate = itemInterest;
                    }

                    // Deduct balance and log transaction
                    user.balance -= itemPrice;
                    user.transactionLogs.push({
                        type: 'purchase',
                        amount: -itemPrice,
                        timestamp: new Date()
                    });

                    // Update purchased items
                    if (purchasedItemIndex >= 0) {
                        user.purchasedItems[purchasedItemIndex].quantity += 1;
                    } else {
                        user.purchasedItems.push({ itemId: item.Name, quantity: 1 });
                    }

                    // Handle Booster items
                    if (item.Type === 'Booster' || item.Booster) {
                        const inventoryItemIndex = user.inventory.findIndex(p => p.itemId === item.Name);
                        if (inventoryItemIndex >= 0) {
                            user.inventory[inventoryItemIndex].quantity += 1;
                        } else {
                            user.inventory.push({
                                itemId: item.Name,
                                quantity: 1,
                                isBooster: true,
                                isRank: false,
                                duration: parseDuration(item.Duration || '0'),
                                multiplier: parseFloat(item.Multiplier || '1'),
                                roleIds: item.RoleID || []
                            });
                        }
                    }
                    // Handle Rank items
                    else if (item.Type === 'Rank' || item.RoleID) {
                        const inventoryItemIndex = user.inventory.findIndex(p => p.itemId === item.Name);
                        if (inventoryItemIndex >= 0) {
                            user.inventory[inventoryItemIndex].quantity += 1;
                        } else {
                            user.inventory.push({
                                itemId: item.Name,
                                quantity: 1,
                                isBooster: false,
                                isRank: true,
                                duration: parseDuration(item.Duration || '0'),
                                multiplier: 1,
                                roleIds: item.RoleID || []
                            });
                        }
                        // Assign the role(s) to the user if RoleID(s) are present
                        if (item.RoleID && interaction.member) {
                            const roleIds = Array.isArray(item.RoleID) ? item.RoleID : [item.RoleID]; // Ensure roleIds is an array
                            for (const roleId of roleIds) {
                                try {
                                    const role = interaction.guild.roles.cache.get(roleId);
                                    if (role) {
                                        await interaction.member.roles.add(role);
                                        console.log(`Assigned role ${role.name} to ${interaction.user.tag}`);
                                    } else {
                                        console.warn(`Role with ID ${roleId} not found in guild ${interaction.guild.name}`);
                                    }
                                } catch (roleError) {
                                    console.error(`Error assigning role ${roleId} to ${interaction.user.tag}:`, roleError);
                                }
                            }
                        }
                    }
                    // Handle Equipment items
                    else if (category === 'Equipment') {
                        const inventoryItemIndex = user.inventory.findIndex(p => p.itemId === item.Name);
                        if (inventoryItemIndex >= 0) {
                            user.inventory[inventoryItemIndex].quantity += 1;
                        } else {
                            user.inventory.push({
                                itemId: item.Name,
                                quantity: 1,
                                isEquipment: true,
                                type: item.Type,
                                durability: item.Durability || 100,
                                catchBonus: item.CatchBonus || 0
                            });
                        }
                    }

                    await user.save();

                    await i.reply({
                        content: replacePlaceholders(
                            lang.Economy?.Other?.Store?.purchaseSuccess || 'Successfully purchased {item}! Balance: {balance}',
                            {
                                item: item.Name,
                                balance: user.balance
                            }
                        ),
                        flags: MessageFlags.Ephemeral
                    });
                } catch (error) {
                    console.error('Error handling purchase:', error);
                    if (!i.replied && !i.deferred) {
                        await i.reply({
                            content: 'There was an error processing your purchase.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
            };

            // Send initial message
            await interaction.reply({
                embeds: [await createEmbed(page)],
                components: createComponents(page)
            });

            // Fetch the reply message
            const message = await interaction.fetchReply();

            // Create collector
            const filter = i => i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({
                filter,
                time: 60000
            });

            collector.on('collect', async i => {
                try {
                    if (i.customId === 'back') {
                        page--;
                        activeRarityFilter = null;
                        await updateMessage(i);
                    } else if (i.customId === 'forward') {
                        page++;
                        activeRarityFilter = null;
                        await updateMessage(i);
                    } else if (i.customId === 'rarity_all') {
                        activeRarityFilter = null;
                        await updateMessage(i);
                    } else if (i.customId.startsWith('rarity_')) {
                        const rarity = i.customId.replace('rarity_', '');
                        if (rarityItemsMap[rarity]) {
                            activeRarityFilter = rarity;
                            await updateMessage(i);
                        }
                    } else if (i.customId === 'buy') {
                        const itemIndex = parseInt(i.values[0]);
                        const item = items[itemIndex];

                        if (category === 'Mồi Câu') {
                            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalActionRow } = require('discord.js');
                            const modal = new ModalBuilder()
                                .setCustomId(`bait_buy_${item.Key}`)
                                .setTitle(`Mua ${item.Name}`);

                            const quantityInput = new TextInputBuilder()
                                .setCustomId('quantity')
                                .setLabel('Nhập số lượng muốn mua')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('1-100')
                                .setRequired(true);

                            modal.addComponents(new ModalActionRow().addComponents(quantityInput));
                            await i.showModal(modal);

                            const filter = (modalInteraction) => modalInteraction.customId === `bait_buy_${item.Key}` && modalInteraction.user.id === i.user.id;
                            try {
                                const modalSubmission = await i.awaitModalSubmit({ filter, time: 60000 });

                                const quantity = parseInt(modalSubmission.fields.getTextInputValue('quantity'));
                                if (isNaN(quantity) || quantity <= 0) {
                                    return modalSubmission.reply({ content: 'Số lượng không hợp lệ.', ephemeral: true });
                                }

                                let user = await EconomyUserData.findOne({ userId: i.user.id });
                                if (!user) user = await EconomyUserData.create({ userId: i.user.id, balance: 0 });

                                const itemPrice = item.Price || 0;
                                const totalPrice = itemPrice * quantity;

                                if (user.balance < totalPrice) {
                                    return modalSubmission.reply({ content: lang.Economy?.Messages?.noMoney || 'Bạn không đủ tiền.', ephemeral: true });
                                }

                                const userFishing = await getUserFishing(i.user.id);
                                const fishingConfig = loadFishingConfig();
                                const baitInfo = fishingConfig.baits[item.Key];

                                user.balance -= totalPrice;
                                const existingBait = userFishing.baits.find(b => b.name === baitInfo.name);
                                if (existingBait) {
                                    existingBait.quantity += quantity;
                                } else {
                                    userFishing.baits.push({ name: baitInfo.name, quantity: quantity });
                                }

                                await user.save();
                                await userFishing.save();

                                await modalSubmission.reply({ content: `Bạn đã mua thành công ${quantity} ${item.Name}.`, ephemeral: true });

                            } catch (err) {
                                console.error('Bait purchase failed:', err);
                            }
                        } else if (item.Type === 'Seed') {
                            // Modal always available, validation logic is in farmStore.js


                            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalActionRow } = require('discord.js');

                            const modal = new ModalBuilder()
                                .setCustomId(`seed_buy_${item.Key}_${i.user.id}`)
                                .setTitle(`Mua ${item.Name}`);

                            const quantityInput = new TextInputBuilder()
                                .setCustomId('seed_quantity')
                                .setLabel(`Nhập số lượng`)
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder(`Nhập số lượng muốn mua`)
                                .setRequired(true);

                            const actionRow = new ModalActionRow().addComponents(quantityInput);
                            modal.addComponents(actionRow);

                            await i.showModal(modal);
                        } else {
                            await handlePurchase(i, itemIndex);
                        }
                    }
                } catch (error) {
                    console.error('Error in collector:', error);
                    if (!i.replied && !i.deferred) {
                        await i.reply({
                            content: 'There was an error while executing this action.',
                            flags: MessageFlags.Ephemeral
                        });
                    } else {
                        await i.followUp({
                            content: 'There was an error while executing this action.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
            });

            collector.on('end', async () => {
                try {
                    await interaction.editReply({ components: [] });
                } catch (error) {
                    if (error.code !== 10008) { // Ignore Unknown Message error
                        console.error('Error removing components:', error);
                    }
                }
            });

        } catch (error) {
            console.error('Error executing store command:', error);
            const errorMessage = {
                content: 'There was an error while executing this command.',
                flags: MessageFlags.Ephemeral
            };

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(errorMessage);
            } else {
                await interaction.followUp(errorMessage);
            }
        }
    }
};