const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const { seeds, addToFarm, checkStoreRestock, getUserFarm } = require('./farmUtils');
const { getConfig, getLang } = require('../../../utils/configLoader');

module.exports.run = async (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        if (!interaction.customId.startsWith('seed_buy_')) return;

        console.log(`[FarmStore] Received interaction: ${interaction.customId}`);
        const parts = interaction.customId.split('_');
        let seedKey = parts[2]; // Key directly (let for re-assignment)
        const expectedUserId = parts[3];

        console.log(`[FarmStore] Parsed seedKey: ${seedKey}, expectedUserId: ${expectedUserId}`);

        if (interaction.user.id !== expectedUserId) {
            return interaction.reply({
                content: '❌ Bạn không thể sử dụng modal này!',
                ephemeral: true
            });
        }

        const quantity = parseInt(interaction.fields.getTextInputValue('seed_quantity'));
        console.log(`[FarmStore] Quantity: ${quantity}`);

        if (isNaN(quantity) || quantity <= 0) {
            return interaction.reply({
                content: '❌ Số lượng phải là một số dương.',
                ephemeral: true
            });
        }

        // Initialize Global State (Restock Trigger)
        const globalState = await checkStoreRestock();

        // Verify item validity
        let seedData = seeds[seedKey];
        console.log(`[FarmStore] Initial seedData found: ${!!seedData}`);

        // Fallback: If not found by Key, try by Name (to support old buttons)
        if (!seedData) {
            console.log(`[FarmStore] Seed not found by key, attempting fallback...`);
            // Attempt to reverse name
            const seedNameFromId = seedKey.replace(/-/g, ' ');
            // e.g., "Việt-quất" -> "Việt quất"
            const foundEntry = Object.entries(seeds).find(([k, v]) => v.name === seedNameFromId);
            if (foundEntry) {
                seedKey = foundEntry[0]; // Update to correct Key
                seedData = foundEntry[1];
                console.log(`[FarmStore] Fallback successful. New key: ${seedKey}`);
            } else {
                console.log(`[FarmStore] Fallback failed for name: ${seedNameFromId}`);
            }
        }

        if (!seedData) {
            console.error(`[FarmStore] Seed key not found: ${seedKey}`);
            return interaction.reply({ content: '❌ Không tìm thấy thông tin hạt giống hệ thống.', ephemeral: true });
        }

        const itemName = seedData.name; // Correct display name
        const itemPrice = seedData.price;

        // Check Global Availability (Did the dice roll favor this seed?)
        const globalLimit = globalState.currentStockLimits[seedKey] || 0;
        if (globalLimit <= 0) {
            return interaction.reply({ content: '❌ Vật phẩm này đã Hết Hàng trong đợt này!', ephemeral: true });
        }

        // Check User Purchase History
        let userFarm = await getUserFarm(interaction.user.id);

        // Reset purchases if new restock cycle
        if (userFarm.storeCycleId !== globalState.storeNextRestock) {
            userFarm.storeCycleId = globalState.storeNextRestock;
            userFarm.seedPurchases = {};
        }

        // Defensive check: Ensure seedPurchases exists
        if (!userFarm.seedPurchases) userFarm.seedPurchases = {};
        console.log(`[FarmStore] User SeedPurchases:`, userFarm.seedPurchases);

        const currentBought = userFarm.seedPurchases[seedKey] || 0;
        const available = globalLimit - currentBought;

        if (quantity > available) {
            return interaction.reply({
                content: `❌ Bạn chỉ còn có thể mua ${available} ${itemName} trong đợt này.`,
                ephemeral: true
            });
        }

        let user = await EconomyUserData.findOne({ userId: interaction.user.id });
        if (!user) {
            user = await EconomyUserData.create({ userId: interaction.user.id, balance: 0 });
        }

        const totalCost = itemPrice * quantity;

        if (user.balance < totalCost) {
            return interaction.reply({
                content: `❌ Bạn không có đủ tiền. Cần ${totalCost.toLocaleString()} xu, bạn chỉ có ${user.balance.toLocaleString()} xu.`,
                ephemeral: true
            });
        }

        user.balance -= totalCost;

        // Update User Purchase Record
        if (!userFarm.seedPurchases) userFarm.seedPurchases = {};
        userFarm.seedPurchases[seedKey] = currentBought + quantity;

        // Save everything
        await user.save();
        // Save purchase history FIRST
        await userFarm.save();

        // Then add item (which fetches fresh data and saves again)
        await addToFarm(interaction.user.id, itemName, quantity, 'seed');

        await interaction.reply({
            content: `Bạn đã mua thành công ${quantity} ${itemName}.`,
            ephemeral: true
        });
    });
};
