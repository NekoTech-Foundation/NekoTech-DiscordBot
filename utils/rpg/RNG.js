const Animal = require('./Animal');

class RPG_RNG {
    static get DropRates() {
        // Percentage chance out of 100
        return {
            'Common': 50,
            'Uncommon': 30,
            'Rare': 15,
            'Epic': 4,
            'Legendary': 0.9,
            'Mythical': 0.1
        };
    }

    static rollRarity() {
        const rand = Math.random() * 100;
        let cumulative = 0;

        const sortedRarities = [
            ['Common', 50],
            ['Uncommon', 30],
            ['Rare', 15],
            ['Epic', 4],
            ['Legendary', 0.9],
            ['Mythical', 0.1]
        ].sort((a, b) => b[1] - a[1]); // Sort by probability desc? No, we need cumulative check. 
        // Actually, let's just do simple iterating

        // Correct approach:
        // Common: 50% (0-50)
        // Uncommon: 30% (50-80)
        // Rare: 15% (80-95)
        // Epic: 4% (95-99)
        // Legendary: 0.9% (99-99.9)
        // Mythical: 0.1% (99.9-100)

        // Let's use the object but we need a deterministic order provided by an array usually.
        const table = [
            { name: 'Common', chance: 50 },
            { name: 'Uncommon', chance: 30 },
            { name: 'Rare', chance: 15 },
            { name: 'Epic', chance: 4 },
            { name: 'Legendary', chance: 0.9 },
            { name: 'Mythical', chance: 0.1 }
        ];

        cumulative = 0;
        for (const tier of table) {
            cumulative += tier.chance;
            if (rand <= cumulative) return tier.name;
        }
        return 'Common'; // Fallback
    }

    // Sample animal names/types
    static get Species() {
        return [
            'Slime', 'Goblin', 'Wolf', 'Bear', 'Tiger', 'Dragon',
            'Phoenix', 'Griffin', 'Vampire Bat', 'Skeleton', 'Ghost',
            'Golem', 'Fairy', 'Unicorn', 'Hydra', 'Kraken'
        ];
    }

    static generateAnimal(fixedRarity = null) {
        const rarityName = fixedRarity || this.rollRarity();
        const rarityData = Animal.Rarities[rarityName.toUpperCase()] || Animal.Rarities.COMMON;

        const species = this.Species[Math.floor(Math.random() * this.Species.length)];

        // Random stats based on rarity multiplier
        const baseHp = 10 + Math.floor(Math.random() * 10);
        const baseStr = 2 + Math.floor(Math.random() * 3);
        const baseSpd = 2 + Math.floor(Math.random() * 3);

        const stats = {
            hp: Math.floor(baseHp * rarityData.multiplier),
            str: Math.floor(baseStr * rarityData.multiplier),
            spd: Math.floor(baseSpd * rarityData.multiplier)
        };

        return new Animal({
            name: `${rarityName} ${species}`,
            rarity: rarityName,
            stats: stats
        });
    }
}

module.exports = RPG_RNG;
