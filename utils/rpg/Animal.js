class Animal {
    constructor(data = {}) {
        this.id = data.id || Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.name = data.name || 'Unknown';
        this.rarity = data.rarity || 'Common';
        this.level = data.level || 1;
        this.xp = data.xp || 0;

        // Base stats
        this.stats = data.stats || {
            hp: 10,
            str: 2,
            spd: 2,
            def: 0
        };

        this.skills = data.skills || ['basic_attack'];

        // Runtime props (not saved)
        this.currentHp = this.stats.hp;
    }

    static get Rarities() {
        return {
            COMMON: { name: 'Common', multiplier: 1.0, color: '#808080' },
            UNCOMMON: { name: 'Uncommon', multiplier: 1.2, color: '#00FF00' },
            RARE: { name: 'Rare', multiplier: 1.5, color: '#0000FF' },
            EPIC: { name: 'Epic', multiplier: 2.0, color: '#800080' },
            LEGENDARY: { name: 'Legendary', multiplier: 3.0, color: '#FFA500' },
            MYTHICAL: { name: 'Mythical', multiplier: 5.0, color: '#FF0000' }
        };
    }

    getEffectiveStats() {
        const multiplier = 1 + (this.level - 1) * 0.1;
        return {
            hp: Math.floor(this.stats.hp * multiplier),
            str: Math.floor(this.stats.str * multiplier),
            spd: Math.floor(this.stats.spd * multiplier),
            def: Math.floor((this.stats.def || 0) * multiplier)
        };
    }

    gainXp(amount) {
        this.xp += amount;
        const nextLevelReq = this.level * 100;
        if (this.xp >= nextLevelReq) {
            this.level++;
            this.xp -= nextLevelReq;
            return true;
        }
        return false;
    }
}

module.exports = Animal;
