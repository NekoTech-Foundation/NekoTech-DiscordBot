const { getConfig } = require('../../../utils/configLoader');
const { seeds } = require('./farmUtils');

let interval = null;

function updateStock() {
    const config = getConfig();
    if (!config.Store) config.Store = {};
    if (!config.Store['Hạt Giống']) config.Store['Hạt Giống'] = {};

    const stockList = config.Store['Hạt Giống'];

    // Clear old stock to ensure refreshment or update existing to keep keys? 
    // We'll update properties to preserve structure if needed, but here we overwrite for dynamic values.
    
    for (const [key, seedData] of Object.entries(seeds)) {
        const price = seedData.price;
        let stock = 0;

        // Logic: Cheap = High Stock, Expensive = Low Stock/Rare
        if (price < 500) {
            stock = Math.floor(Math.random() * 51) + 50; // 50 - 100
        } else if (price < 2000) {
            stock = Math.floor(Math.random() * 31) + 20; // 20 - 50
        } else if (price < 10000) {
            stock = Math.floor(Math.random() * 10) + 1; // 1 - 10
        } else {
            // Very rare items
            if (Math.random() > 0.7) { // 30% chance to be in stock
                 stock = Math.floor(Math.random() * 3) + 1; // 1 - 3
            } else {
                stock = 0;
            }
        }

        // Construct the item object compatible with store.js
        stockList[key] = {
            Name: seedData.name,
            Key: key, // Important for ID reference
            Price: price,
            Description: `Trồng trong ${seedData.growthTime / 60000} phút.`,
            Type: 'Seed',
            Stock: stock,
            Emoji: seedData.emoji
        };
    }
    
    //console.log('[SeedShop] Stock updated!');
}

function startSeedShop(client) {
    updateStock(); // Initial stock
    if (interval) clearInterval(interval);
    
    interval = setInterval(() => {
        updateStock();
    }, 60 * 1000); // 60 seconds
    
    console.log('[SeedShop] Dynamic Seed Shop started.');
}

module.exports = { startSeedShop, updateStock };
