const { EmbedBuilder } = require('discord.js');
const RPGPlayer = require('../../models/RPGPlayer');
const itemsDb = require('../../utils/rpg/data/items.json');

module.exports = {
    name: 'inv',
    description: 'View your inventory',

    async execute(message, args) {
        const userId = message.author.id;
        const player = await RPGPlayer.findOne({ userId });

        if (!player) return message.reply('Start your journey with !hunt first!');

        const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}'s Inventory 🎒`)
            .setColor('Gold');

        // Equipment Display
        const weaponName = player.equipment.weapon
            ? itemsDb.find(i => i.id === player.equipment.weapon)?.name || player.equipment.weapon
            : 'None';
        const armorName = player.equipment.armor
            ? itemsDb.find(i => i.id === player.equipment.armor)?.name || player.equipment.armor
            : 'None';

        embed.addFields({ name: 'Equipment', value: `⚔️ **Weapon**: ${weaponName}\n🛡️ **Armor**: ${armorName}` });

        // Inventory List
        if (!player.inventory || player.inventory.length === 0) {
            embed.setDescription('Inventory is empty.');
        } else {
            // Aggregate items
            // Assuming inventory is array of { id, count }
            const lines = player.inventory.map(slot => {
                const itemDef = itemsDb.find(i => i.id === slot.id);
                const name = itemDef ? itemDef.name : slot.id;
                return `**${name}** x${slot.count}`;
            });
            embed.setDescription(`**Gold**: ${player.gold} 💰\n\n` + lines.join('\n'));
        }

        message.channel.send({ embeds: [embed] });
    }
};
