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

async function getUserFarm(userId) {
    let userFarm = await farmSchema.findOne({ userId });
    if (!userFarm) {
        userFarm = new farmSchema({ userId, items: [] });
        await userFarm.save();
    }
    return userFarm;
}

async function addToFarm(userId, itemName, quantity, itemType) {
    const userFarm = await getUserFarm(userId);
    const item = userFarm.items.find(i => i.name === itemName);

    if (item) {
        item.quantity += quantity;
    } else {
        userFarm.items.push({ name: itemName, quantity, type: itemType });
    }

    await userFarm.save();
}

async function removeFromFarm(userId, itemName, quantity) {
    const userFarm = await getUserFarm(userId);
    const item = userFarm.items.find(i => i.name === itemName);

    if (!item || item.quantity < quantity) {
        return false; // Not enough items
    }

    item.quantity -= quantity;

    if (item.quantity <= 0) {
        userFarm.items = userFarm.items.filter(i => i.name !== itemName);
    }

    await userFarm.save();
    return true;
}

module.exports = { seeds, getUserFarm, addToFarm, removeFromFarm };
