const farmSchema = require('./schemas/farmSchema');

const seeds = {
    chili: { name: 'Ớt', emoji: '🌶️', growthTime: 1800000, price: 350 },
    rice: { name: 'Lúa', emoji: '🌾', growthTime: 1800000, price: 350 },
    strawberry: { name: 'Dâu Tây', emoji: '🍓', growthTime: 3600000, price: 550 },
    corn: { name: 'Ngô', emoji: '🌽', growthTime: 3600000, price: 550 },
    tomato: { name: 'Cà Chua', emoji: '🍅', growthTime: 5400000, price: 700 },
    peach: { name: 'Đào', emoji: '🍑', growthTime: 5400000, price: 700 },
    cassava: { name: 'Khoai Mì', emoji: '🍠', growthTime: 7200000, price: 1050 },
    sugarcane: { name: 'Mía', emoji: '🌱', growthTime: 7200000, price: 1050 },
    potato: { name: 'Khoai Tây', emoji: '🥔', growthTime: 14400000, price: 2100 },
    melon: { name: 'Dưa Gang', emoji: '🍈', growthTime: 14400000, price: 2100 },
    carrot: { name: 'Cà Rốt', emoji: '🥕', growthTime: 21600000, price: 3500 },
    cabbage: { name: 'Cải Ngọt', emoji: '🥬', growthTime: 21600000, price: 3500 },
    jackfruit: { name: 'Mít', emoji: '🍈', growthTime: 64800000, price: 10500 },
    pumpkin: { name: 'Bí ngô', emoji: '🎃', growthTime: 10800000, price: 1400 },
    watermelon: { name: 'Dưa hấu', emoji: '🍉', growthTime: 28800000, price: 5600 },
    grapes: { name: 'Nho', emoji: '🍇', growthTime: 43200000, price: 14000 },
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
        // Fallback (try to match name, ignore mutation safety if not provided? No, strict is better now)
        // If no ItemType provided, we assume mutation is possibly null or we search all
        item = userFarm.items.find(i => i.name === itemName);
        // This fallback is risky with mutations. Let's assume strict usage from now on.
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
    const qtyStr = quantity ? `[${quantity}] ` : ''; // Or [4kg] as requested
    // Request: [Mutation List] [KG] Cây trồng
    // Example: [✨ Neon] [5kg] Cà Chua
    const kgStr = quantity ? `[${quantity}kg]` : '';

    if (mutation) {
        return `[${mutation.emoji} ${mutation.name}] ${kgStr} ${name}`;
    }
    return `${kgStr} ${name}`; // Standard item
}

module.exports = { seeds, getUserFarm, addToFarm, removeFromFarm, formatPlantName };
