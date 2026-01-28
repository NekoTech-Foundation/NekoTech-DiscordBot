const { EmbedBuilder } = require('discord.js');
const RPGPlayer = require('../../models/RPGPlayer');
const RNG = require('../../utils/rpg/RNG');

module.exports = {
    name: 'hunt',
    description: 'Hunt for animals',

    async execute(message, args) {
        const userId = message.author.id;

        // 1. Get or Create Player
        let player = await RPGPlayer.findOne({ userId });
        if (!player) {
            player = await RPGPlayer.create({ userId });
        }

        // 2. Cooldown Check (Simple timestamp check)
        const now = Date.now();
        const COOLDOWN_MS = 60000; // 1 minute
        if (now - player.lastHuntTime < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - player.lastHuntTime)) / 1000);
            return message.reply(`You are tired! Wait ${remaining}s before hunting again.`);
        }

        // 3. Generate Animal
        const animal = RNG.generateAnimal();

        // 4. Save to Database
        player.zoo.push(animal);
        player.lastHuntTime = now;
        player.xp += 10; // Give some player XP
        await player.save();

        // 5. View (Embed)
        const embed = new EmbedBuilder()
            .setTitle('🏹 Hunt Result')
            .setDescription(`You went hunting and found a **${animal.rarity} ${animal.name}**!`)
            .addFields(
                { name: 'Rarity', value: animal.rarity, inline: true },
                { name: 'Stats', value: `HP: ${animal.stats.hp} | STR: ${animal.stats.str} | SPD: ${animal.stats.spd}`, inline: true }
            )
            .setColor(getColorForRarity(animal.rarity))
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }
};

function getColorForRarity(rarity) {
    const colors = {
        'Common': '#808080',
        'Uncommon': '#00FF00',
        'Rare': '#0000FF',
        'Epic': '#800080',
        'Legendary': '#FFA500',
        'Mythical': '#FF0000'
    };
    return colors[rarity] || '#FFFFFF';
}
