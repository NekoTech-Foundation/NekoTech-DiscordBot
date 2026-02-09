const farmSchema = require('./schemas/farmSchema');
const farmGlobalSchema = require('./schemas/farmGlobalSchema');

const seeds = {
    // --- COMMON (100% chance, Limit 100) - Buy: 300-600, Sell: 50% ---
    carrot: { name: 'Cà rốt', emoji: '🥕', growthTime: 1800000, price: 300, sellPrice: 150, rarity: 'Common', restockChance: 1.0, stockLimit: 100 },
    strawberry: { name: 'Dâu tây', emoji: '🍓', growthTime: 1800000, price: 400, sellPrice: 200, rarity: 'Common', restockChance: 1.0, stockLimit: 100 },
    spring_onion: { name: 'Hành lá', emoji: '🧅', growthTime: 1800000, price: 350, sellPrice: 175, rarity: 'Common', restockChance: 1.0, stockLimit: 100 },
    turnip: { name: 'Củ cải trắng', emoji: '🥔', growthTime: 1800000, price: 500, sellPrice: 250, rarity: 'Common', restockChance: 1.0, stockLimit: 100 },

    // --- UNCOMMON (80% chance, Limit 50) - Buy: 1,200-2,000, Sell: 55% ---
    blueberry: { name: 'Việt quất', emoji: '🫐', growthTime: 7200000, price: 1500, sellPrice: 825, rarity: 'Uncommon', restockChance: 0.8, stockLimit: 50 },
    rose: { name: 'Hoa hồng', emoji: '🌹', growthTime: 7200000, price: 1800, sellPrice: 990, rarity: 'Uncommon', restockChance: 0.8, stockLimit: 50 },
    orange_tulip: { name: 'Tulip cam', emoji: '🌷', growthTime: 7200000, price: 1400, sellPrice: 770, rarity: 'Uncommon', restockChance: 0.8, stockLimit: 50 },
    buttercup: { name: 'Hoa mao lương', emoji: '🌼', growthTime: 7200000, price: 1300, sellPrice: 715, rarity: 'Uncommon', restockChance: 0.8, stockLimit: 50 },
    saffron: { name: 'Hoa nghệ tây', emoji: '🏵️', growthTime: 7200000, price: 2000, sellPrice: 1100, rarity: 'Uncommon', restockChance: 0.8, stockLimit: 50 },
    lavender: { name: 'Hoa oải hương', emoji: '🪻', growthTime: 7200000, price: 1600, sellPrice: 880, rarity: 'Uncommon', restockChance: 0.8, stockLimit: 50 },
    parsley: { name: 'Ngò tây', emoji: '🌿', growthTime: 7200000, price: 1200, sellPrice: 660, rarity: 'Uncommon', restockChance: 0.8, stockLimit: 50 },

    // --- RARE (50% chance, Limit 30) - Buy: 4,500-7,000, Sell: 60% ---
    tomato: { name: 'Cà chua', emoji: '🍅', growthTime: 14400000, price: 5000, sellPrice: 3000, rarity: 'Rare', restockChance: 0.5, stockLimit: 30 },
    daffodil: { name: 'Thủy tiên vàng', emoji: '🌼', growthTime: 14400000, price: 5500, sellPrice: 3300, rarity: 'Rare', restockChance: 0.5, stockLimit: 30 },
    cauliflower: { name: 'Súp lơ trắng', emoji: '🥦', growthTime: 14400000, price: 4500, sellPrice: 2700, rarity: 'Rare', restockChance: 0.5, stockLimit: 30 },
    raspberry: { name: 'Mâm xôi', emoji: '🍇', growthTime: 14400000, price: 6000, sellPrice: 3600, rarity: 'Rare', restockChance: 0.5, stockLimit: 30 },
    peace_lily: { name: 'Lan ý', emoji: '🪴', growthTime: 14400000, price: 6500, sellPrice: 3900, rarity: 'Rare', restockChance: 0.5, stockLimit: 30 },
    mint: { name: 'Bạc hà', emoji: '🍃', growthTime: 14400000, price: 4800, sellPrice: 2880, rarity: 'Rare', restockChance: 0.5, stockLimit: 30 },
    dandelion: { name: 'Bồ công anh', emoji: '🌬️', growthTime: 14400000, price: 5200, sellPrice: 3120, rarity: 'Rare', restockChance: 0.5, stockLimit: 30 },
    pear: { name: 'Lê', emoji: '🍐', growthTime: 14400000, price: 7000, sellPrice: 4200, rarity: 'Rare', restockChance: 0.5, stockLimit: 30 },
    delphinium: { name: 'Hoa phi yến', emoji: '🌾', growthTime: 14400000, price: 5800, sellPrice: 3480, rarity: 'Rare', restockChance: 0.5, stockLimit: 30 },

    // --- LEGENDARY (25% chance, Limit 10) - Buy: 18,000-25,000, Sell: 65% ---
    watermelon: { name: 'Dưa hấu', emoji: '🍉', growthTime: 28800000, price: 22000, sellPrice: 14300, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    pumpkin: { name: 'Bí ngô', emoji: '🎃', growthTime: 28800000, price: 20000, sellPrice: 13000, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    avocado: { name: 'Bơ', emoji: '🥑', growthTime: 28800000, price: 25000, sellPrice: 16250, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    green_apple: { name: 'Táo xanh', emoji: '🍏', growthTime: 28800000, price: 18000, sellPrice: 11700, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    red_apple: { name: 'Táo đỏ', emoji: '🍎', growthTime: 28800000, price: 18500, sellPrice: 12025, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    banana: { name: 'Chuối', emoji: '🍌', growthTime: 28800000, price: 19000, sellPrice: 12350, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    lilac: { name: 'Tử đinh hương', emoji: '🌸', growthTime: 28800000, price: 23000, sellPrice: 14950, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    bamboo: { name: 'Tre', emoji: '🎍', growthTime: 28800000, price: 21000, sellPrice: 13650, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    durian: { name: 'Sầu riêng', emoji: '🤢', growthTime: 28800000, price: 24000, sellPrice: 15600, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    papaya: { name: 'Đu đủ', emoji: '🥭', growthTime: 28800000, price: 19500, sellPrice: 12675, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    starfruit: { name: 'Khế', emoji: '⭐', growthTime: 28800000, price: 23500, sellPrice: 15275, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    cantaloupe: { name: 'Dưa lưới', emoji: '🍈', growthTime: 28800000, price: 20500, sellPrice: 13325, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    aloe_vera: { name: 'Nha đam', emoji: '🧴', growthTime: 28800000, price: 18800, sellPrice: 12220, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },
    white_mulberry: { name: 'Dâu tằm trắng', emoji: '🍇', growthTime: 28800000, price: 21500, sellPrice: 13975, rarity: 'Legendary', restockChance: 0.25, stockLimit: 10 },

    // --- MYTHICAL (10% chance, Limit 5) - Buy: 50,000-75,000, Sell: 68% ---
    peach: { name: 'Đào', emoji: '🍑', growthTime: 43200000, price: 55000, sellPrice: 37400, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    pineapple: { name: 'Dứa', emoji: '🍍', growthTime: 43200000, price: 60000, sellPrice: 40800, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    amber_spine: { name: 'Gai hổ phách', emoji: '🔸', growthTime: 43200000, price: 75000, sellPrice: 51000, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    coconut: { name: 'Dừa', emoji: '🥥', growthTime: 43200000, price: 52000, sellPrice: 35360, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    cactus: { name: 'Xương rồng', emoji: '🌵', growthTime: 43200000, price: 58000, sellPrice: 39440, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    dragon_fruit: { name: 'Thanh long', emoji: '🐉', growthTime: 43200000, price: 70000, sellPrice: 47600, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    mango: { name: 'Xoài', emoji: '🥭', growthTime: 43200000, price: 50000, sellPrice: 34000, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    kiwi: { name: 'Kiwi', emoji: '🥝', growthTime: 43200000, price: 54000, sellPrice: 36720, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    bell_pepper: { name: 'Ớt chuông', emoji: '🫑', growthTime: 43200000, price: 56000, sellPrice: 38080, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    eggplant: { name: 'Cà tím', emoji: '🍆', growthTime: 43200000, price: 53000, sellPrice: 36040, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    passionfruit: { name: 'Chanh leo', emoji: '🟣', growthTime: 43200000, price: 62000, sellPrice: 42160, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    lemon: { name: 'Chanh vàng', emoji: '🍋', growthTime: 43200000, price: 51000, sellPrice: 34680, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    soursop: { name: 'Mãng cầu xiêm', emoji: '🍈', growthTime: 43200000, price: 65000, sellPrice: 44200, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    nectarine: { name: 'Đào trơn', emoji: '🍑', growthTime: 43200000, price: 57000, sellPrice: 38760, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },
    lily_valley: { name: 'Linh lan', emoji: '🌿', growthTime: 43200000, price: 68000, sellPrice: 46240, rarity: 'Mythical', restockChance: 0.10, stockLimit: 5 },

    // --- DIVINE (2% chance, Limit 2) - Buy: 180,000-250,000, Sell: 70% ---
    grapes: { name: 'Nho', emoji: '🍇', growthTime: 86400000, price: 200000, sellPrice: 140000, rarity: 'Divine', restockChance: 0.02, stockLimit: 2 },
    mushroom: { name: 'Nấm', emoji: '🍄', growthTime: 86400000, price: 180000, sellPrice: 126000, rarity: 'Divine', restockChance: 0.02, stockLimit: 2 },
    black_pepper: { name: 'Tiêu', emoji: '🧂', growthTime: 86400000, price: 220000, sellPrice: 154000, rarity: 'Divine', restockChance: 0.02, stockLimit: 2 },
    chili: { name: 'Ớt', emoji: '🌶️', growthTime: 86400000, price: 190000, sellPrice: 133000, rarity: 'Divine', restockChance: 0.02, stockLimit: 2 },
    cacao: { name: 'Ca cao', emoji: '🍫', growthTime: 86400000, price: 250000, sellPrice: 175000, rarity: 'Divine', restockChance: 0.02, stockLimit: 2 },
    pitcher_plant: { name: 'Cây nắp ấm', emoji: '🏺', growthTime: 86400000, price: 230000, sellPrice: 161000, rarity: 'Divine', restockChance: 0.02, stockLimit: 2 },
    cherry_blossom: { name: 'Cây anh đào', emoji: '🌸', growthTime: 86400000, price: 240000, sellPrice: 168000, rarity: 'Divine', restockChance: 0.02, stockLimit: 2 },
    lotus: { name: 'Sen', emoji: '🪷', growthTime: 86400000, price: 210000, sellPrice: 147000, rarity: 'Divine', restockChance: 0.02, stockLimit: 2 },
    venus_flytrap: { name: 'Cây bắt ruồi', emoji: '🪴', growthTime: 86400000, price: 185000, sellPrice: 129500, rarity: 'Divine', restockChance: 0.02, stockLimit: 2 },

    // --- PRISMATIC (0.5% chance, Limit 1) - Buy: 800,000-1,200,000, Sell: 75% ---
    beanstalk: { name: 'Cây đậu thần', emoji: '🌱', growthTime: 172800000, price: 1000000, sellPrice: 750000, rarity: 'Prismatic', restockChance: 0.005, stockLimit: 1 },
    ember_lily: { name: 'Ly tàn lửa', emoji: '🔥', growthTime: 172800000, price: 1200000, sellPrice: 900000, rarity: 'Prismatic', restockChance: 0.005, stockLimit: 1 },
    sugar_apple: { name: 'Na', emoji: '🍏', growthTime: 172800000, price: 850000, sellPrice: 637500, rarity: 'Prismatic', restockChance: 0.005, stockLimit: 1 },
    burning_bud: { name: 'Chồi cháy', emoji: '💥', growthTime: 172800000, price: 1100000, sellPrice: 825000, rarity: 'Prismatic', restockChance: 0.005, stockLimit: 1 },
    giant_pinecone: { name: 'Quả thông khổng lồ', emoji: '🌲', growthTime: 172800000, price: 900000, sellPrice: 675000, rarity: 'Prismatic', restockChance: 0.005, stockLimit: 1 },
    elder_strawberry: { name: 'Dâu tây cổ thụ', emoji: '🍓', growthTime: 172800000, price: 950000, sellPrice: 712500, rarity: 'Prismatic', restockChance: 0.005, stockLimit: 1 },
    romanesco: { name: 'Súp lơ san hô', emoji: '🥦', growthTime: 172800000, price: 800000, sellPrice: 600000, rarity: 'Prismatic', restockChance: 0.005, stockLimit: 1 },

    // --- LEGACY (Off-sale) ---
    rice: { name: 'Lúa', emoji: '🌾', growthTime: 1800000, price: 250, sellPrice: 125, rarity: 'Legacy', restockChance: 0, stockLimit: 0 },
    corn: { name: 'Ngô', emoji: '🌽', growthTime: 3600000, price: 400, sellPrice: 200, rarity: 'Legacy', restockChance: 0, stockLimit: 0 },
    cassava: { name: 'Khoai Mì', emoji: '🍠', growthTime: 7200000, price: 800, sellPrice: 400, rarity: 'Legacy', restockChance: 0, stockLimit: 0 },
    sugarcane: { name: 'Mía', emoji: '🌱', growthTime: 7200000, price: 750, sellPrice: 375, rarity: 'Legacy', restockChance: 0, stockLimit: 0 },
    potato: { name: 'Khoai Tây', emoji: '🥔', growthTime: 14400000, price: 1500, sellPrice: 750, rarity: 'Legacy', restockChance: 0, stockLimit: 0 },
    melon: { name: 'Dưa Gang', emoji: '🍈', growthTime: 14400000, price: 1600, sellPrice: 800, rarity: 'Legacy', restockChance: 0, stockLimit: 0 },
    cabbage: { name: 'Cải Ngọt', emoji: '🥬', growthTime: 21600000, price: 2500, sellPrice: 1250, rarity: 'Legacy', restockChance: 0, stockLimit: 0 },
    jackfruit: { name: 'Mít', emoji: '🍈', growthTime: 64800000, price: 8000, sellPrice: 4000, rarity: 'Legacy', restockChance: 0, stockLimit: 0 },
};

// Helper to check if mutations match (considering null/undefined)
function isMutationEqual(m1, m2) {
    if (!m1 && !m2) return true;
    if (!m1 || !m2) return false;
    return m1.name === m2.name;
}

async function getUserFarm(userId) {
    let userFarm = await farmSchema.findOne({ userId });
    if (!userFarm) {
        userFarm = await farmSchema.create({ userId, items: [] });
    }
    return userFarm;
}

async function addToFarm(userId, itemName, quantity, itemType, mutation = null) {
    const userFarm = await getUserFarm(userId);
    // Find existing item with same name, type, and mutation
    const item = userFarm.items.find(i =>
        i.name === itemName &&
        i.type === itemType &&
        isMutationEqual(i.mutation, mutation)
    );

    if (item) {
        item.quantity += quantity;
    } else {
        userFarm.items.push({
            name: itemName,
            quantity,
            type: itemType,
            mutation
        });
    }

    await userFarm.save();
}

async function removeFromFarm(userId, itemName, quantity, itemType, mutation = null) {
    const userFarm = await getUserFarm(userId);

    let item;
    if (itemType) {
        item = userFarm.items.find(i =>
            i.name === itemName &&
            i.type === itemType &&
            isMutationEqual(i.mutation, mutation)
        );
    } else {
        // Fallback
        item = userFarm.items.find(i => i.name === itemName);
    }

    if (!item || item.quantity < quantity) {
        return false; // Not enough items
    }

    item.quantity -= quantity;

    if (item.quantity <= 0) {
        // Remove specific entry
        userFarm.items = userFarm.items.filter(i => i !== item);
    }

    await userFarm.save();
    return true;
}

function formatPlantName(name, mutation, quantity) {
    const qtyStr = quantity ? `[${quantity}] ` : '';
    const kgStr = quantity ? `[${quantity}kg]` : '';

    if (mutation) {
        return `[${mutation.emoji} ${mutation.name}] ${kgStr} ${name}`;
    }
    return `${kgStr} ${name}`;
}

async function checkStoreRestock() {
    let globalState = await farmGlobalSchema.findOne({ identifier: 'global' });
    if (!globalState) {
        globalState = await farmGlobalSchema.create({ identifier: 'global' });
    }

    if (!globalState.storeNextRestock) globalState.storeNextRestock = 0;
    if (!globalState.currentStockLimits) globalState.currentStockLimits = {};

    const now = Date.now();
    if (now >= globalState.storeNextRestock) {
        // Trigger Restock
        // 5 Minutes Cycle
        globalState.storeNextRestock = now + 300000;

        const newLimits = {};

        for (const [key, seed] of Object.entries(seeds)) {
            // Updated Logic: Random Quantity between 1 and StockLimit if chance passes
            if (Math.random() <= seed.restockChance) {
                // Random stock from 1 to Limit
                const randomStock = Math.floor(Math.random() * seed.stockLimit) + 1;
                newLimits[key] = randomStock;
            } else {
                newLimits[key] = 0;
            }
        }

        globalState.currentStockLimits = newLimits;
        await globalState.save();
    }

    return globalState;
}

module.exports = { seeds, getUserFarm, addToFarm, removeFromFarm, formatPlantName, checkStoreRestock };
