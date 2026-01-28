const RPGPlayer = require('../../models/RPGPlayer');
const itemsDb = require('../../utils/rpg/data/items.json');

module.exports = {
    name: 'equip',
    description: 'Equip an item. Usage: !equip <item_name_or_id>',

    async execute(message, args) {
        if (!args.length) return message.reply('Usage: `!equip <item>`');

        const query = args.join(' ').toLowerCase();
        const userId = message.author.id;
        const player = await RPGPlayer.findOne({ userId });

        if (!player) return message.reply('No profile found.');

        // Find item in inventory
        // Inventory structure: [ { id: 'sword', count: 1 } ]
        const slotIndex = player.inventory.findIndex(slot => {
            const itemDef = itemsDb.find(i => i.id === slot.id);
            return (itemDef && itemDef.name.toLowerCase() === query) || slot.id === query;
        });

        if (slotIndex === -1) return message.reply('You do not have that item!');

        const slot = player.inventory[slotIndex];
        const itemDef = itemsDb.find(i => i.id === slot.id);

        if (!itemDef || (itemDef.type !== 'WEAPON' && itemDef.type !== 'ARMOR')) {
            return message.reply('That is not equipable!');
        }

        // Equip Logic
        const typeKey = itemDef.type === 'WEAPON' ? 'weapon' : 'armor';
        const currentEquip = player.equipment[typeKey];

        // 1. If something equipped, unequip it (return to inv)
        if (currentEquip) {
            // Add back to inventory (check if exists or push new)
            const existingSlot = player.inventory.find(s => s.id === currentEquip);
            if (existingSlot) existingSlot.count++;
            else player.inventory.push({ id: currentEquip, count: 1 });
        }

        // 2. Remove 1 from inventory matching the new item
        if (slot.count > 1) {
            slot.count--;
        } else {
            player.inventory.splice(slotIndex, 1);
        }

        // 3. Set new equip
        player.equipment[typeKey] = itemDef.id;

        await player.save();
        message.reply(`Equipped **${itemDef.name}**!`);
    }
};
