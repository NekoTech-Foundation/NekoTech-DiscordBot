const events = {
    weather: [
        { name: 'Nắng Ấm', type: 'weather', rarity: 'common', chance: 60, emoji: '☀️', description: 'Thời tiết đẹp, cây phát triển bình thường.', effect: { growthSpeed: 1.0 } },
        { name: 'Mưa Rào', type: 'weather', rarity: 'uncommon', chance: 20, emoji: '🌧️', description: 'Mưa giúp cây phát triển nhanh hơn.', effect: { growthSpeed: 1.2 } },
        { name: 'Sương Mù', type: 'weather', rarity: 'uncommon', chance: 10, emoji: '🌫️', description: 'Sương mù dày đặc, độ ẩm cao.', effect: { growthSpeed: 1.1 } },
        { name: 'Khô Hạn', type: 'weather', rarity: 'rare', chance: 1, emoji: '🌵', description: 'Nắng gắt, thiếu nước. Cây chậm lớn.', effect: { growthSpeed: 0.5 } },
        { name: 'Sâu Mọt', type: 'weather', rarity: 'rare', chance: 1, emoji: '🐛', description: 'Sâu bệnh hoành hành. Giảm sản lượng.', effect: { yield: 0.7 } },
        { name: 'Sấm Sét', type: 'weather', rarity: 'epic', chance: 5, emoji: '⚡', description: 'Sấm sét kích thích sự biến đổi.', effect: { mutationChance: 2.0 } },
        { name: 'Bão Tố', type: 'weather', rarity: 'legendary', chance: 2, emoji: '🌪️', description: 'Bão lớn! Nguy hiểm nhưng cơ hội đột biến cao.', effect: { mutationChance: 3.0 } },
        { name: 'Phù Phép', type: 'weather', rarity: 'mythical', chance: 1, emoji: '✨', description: 'Năng lượng ma thuật bao trùm.', effect: { growthSpeed: 2.0, yield: 2.0, mutationChance: 5.0 } }
    ],
    mutations: [
        { name: 'Tí Hon', type: 'mutation', rarity: 'common', chance: 30, emoji: '🤏', description: 'Nhỏ bé nhưng dễ thương.', effect: { yield: 0.8, price: 0.9 } },
        { name: 'Khổng Lồ', type: 'mutation', rarity: 'uncommon', chance: 25, emoji: '🐘', description: 'To lớn vượt trội.', effect: { yield: 1.5, price: 1.2 } },
        { name: 'Đỏ Thẫm', type: 'mutation', rarity: 'rare', chance: 20, emoji: '🔴', description: 'Màu sắc rực rỡ.', effect: { price: 2.0 } },
        { name: 'Vàng', type: 'mutation', rarity: 'epic', chance: 15, emoji: '👑', description: 'Lấp lánh như vàng.', effect: { price: 5.0 } },
        { name: 'Cầu Vồng', type: 'mutation', rarity: 'legendary', chance: 8, emoji: '🌈', description: 'Đủ màu sắc tuyệt đẹp.', effect: { price: 10.0 } },
        { name: 'Hoàn Hảo', type: 'mutation', rarity: 'mythical', chance: 2, emoji: '💠', description: 'Sự kết tinh hoàn hảo.', effect: { yield: 3.0, price: 20.0 } }
    ]
};

function getRandomEvent() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const event of events.weather) {
        cumulative += event.chance;
        if (rand < cumulative) return event;
    }
    return events.weather[0];
}

function getRandomMutation(weatherEvent) {
    // Base mutation chance is low (e.g., 5%)
    let mutationChance = 0.05;

    if (weatherEvent && weatherEvent.effect && weatherEvent.effect.mutationChance) {
        mutationChance *= weatherEvent.effect.mutationChance;
    }

    if (Math.random() > mutationChance) return null;

    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const mutation of events.mutations) {
        cumulative += mutation.chance;
        if (rand < cumulative) return mutation;
    }
    return null;
}

module.exports = { events, getRandomEvent, getRandomMutation };
