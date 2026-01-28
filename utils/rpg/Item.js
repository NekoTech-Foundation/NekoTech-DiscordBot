class Item {
    constructor(data = {}) {
        this.id = data.id;
        this.name = data.name || 'Unknown Item';
        this.type = data.type || 'MATERIAL'; // CONSUMABLE, WEAPON, ARMOR, MATERIAL
        this.description = data.description || '';
        this.stats = data.stats || {}; // { str: 5, def: 2 } etc
        this.effect = data.effect || null; // { type: 'HEAL', value: 50 }
        this.price = data.price || 0;
    }

    static get Types() {
        return {
            CONSUMABLE: 'CONSUMABLE',
            WEAPON: 'WEAPON',
            ARMOR: 'ARMOR',
            MATERIAL: 'MATERIAL'
        };
    }
}

module.exports = Item;
