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
        // Common (Total: 40%)
        { name: 'Tí Hon', type: 'mutation', rarity: 'common', chance: 20, emoji: '🤏', description: 'Nhỏ bé nhưng dễ thương.', effect: { yield: 0.8, price: 1.2 } },
        { name: 'Khổng Lồ', type: 'mutation', rarity: 'common', chance: 20, emoji: '🐘', description: 'To lớn vượt trội.', effect: { yield: 1.5, price: 1.2 } },

        // Uncommon (Total: 30%)
        { name: 'Đỏ Thẫm', type: 'mutation', rarity: 'uncommon', chance: 15, emoji: '🔴', description: 'Màu sắc rực rỡ.', effect: { price: 1.5 } },
        { name: 'Xanh Lá', type: 'mutation', rarity: 'uncommon', chance: 15, emoji: '🟢', description: 'Tươi tốt lạ thường.', effect: { yield: 1.2, price: 1.3 } },

        // Rare (Total: 15%)
        { name: 'Frozen', type: 'mutation', rarity: 'rare', chance: 5, emoji: '❄️', description: 'Đóng băng vĩnh cửu.', effect: { price: 3.0 } },
        { name: 'Burning', type: 'mutation', rarity: 'rare', chance: 5, emoji: '🔥', description: 'Rực cháy mãnh liệt.', effect: { price: 3.0 } },
        { name: 'Neon', type: 'mutation', rarity: 'rare', chance: 5, emoji: '✨', description: 'Phát sáng trong đêm.', effect: { price: 3.5 } },

        // Epic (Total: 10%)
        { name: 'Vàng', type: 'mutation', rarity: 'epic', chance: 3, emoji: '👑', description: 'Lấp lánh như vàng.', effect: { price: 5.0 } },
        { name: 'Crystal', type: 'mutation', rarity: 'epic', chance: 3, emoji: '💎', description: 'Kết tinh trong suốt.', effect: { price: 6.0 } },
        { name: 'Radioactive', type: 'mutation', rarity: 'epic', chance: 2, emoji: '☢️', description: 'Phát xạ năng lượng.', effect: { yield: 2.0, price: 4.0 } },
        { name: 'Pixel', type: 'mutation', rarity: 'epic', chance: 2, emoji: '👾', description: 'Lỗi hiển thị?', effect: { price: 7.0 } },

        // Legendary (Total: 4%)
        { name: 'Ghost', type: 'mutation', rarity: 'legendary', chance: 1.5, emoji: '👻', description: 'Thoắt ẩn thoắt hiện.', effect: { price: 10.0 } },
        { name: 'Cầu Vồng', type: 'mutation', rarity: 'legendary', chance: 1.5, emoji: '🌈', description: 'Đủ màu sắc tuyệt đẹp.', effect: { price: 12.0 } },
        { name: 'Glitch', type: 'mutation', rarity: 'legendary', chance: 1.0, emoji: '📺', description: 'Sự cố hệ thống.', effect: { yield: 0.5, price: 15.0 } },

        // Mythical (Total: 1%)
        { name: 'Void', type: 'mutation', rarity: 'mythical', chance: 0.4, emoji: '⚫', description: 'Vực thẳm vô tận.', effect: { price: 25.0 } },
        { name: 'Celestial', type: 'mutation', rarity: 'mythical', chance: 0.3, emoji: '🌟', description: 'Tinh tú hội tụ.', effect: { price: 30.0 } },
        { name: 'Quantum', type: 'mutation', rarity: 'mythical', chance: 0.2, emoji: '⚛️', description: 'Tồn tại ở mọi trạng thái.', effect: { yield: 5.0, price: 20.0 } },
        { name: 'Cosmic', type: 'mutation', rarity: 'mythical', chance: 0.1, emoji: '🌌', description: 'Chứa đựng cả vũ trụ.', effect: { price: 50.0 } },
        { name: 'Hoàn Hảo', type: 'mutation', rarity: 'mythical', chance: 0.05, emoji: '💠', description: 'Sự kết tinh hoàn hảo.', effect: { yield: 3.0, price: 40.0 } }
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

function getRandomMutation(weatherEvent, activeMutationRate) {
    // Base mutation chance (increased from 5% to 15%)
    let mutationChance = 0.36;

    // Use specific rate if provided (from global random event logic)
    if (activeMutationRate && activeMutationRate > 0) {
        mutationChance = activeMutationRate;
    } else if (weatherEvent && weatherEvent.effect && weatherEvent.effect.mutationChance) {
        // Fallback or legacy multiplier
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
