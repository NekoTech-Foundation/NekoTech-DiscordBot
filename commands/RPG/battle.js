const { EmbedBuilder } = require('discord.js');
const RPGPlayer = require('../../models/RPGPlayer');
const BattleSystem = require('../../utils/rpg/BattleSystem');
const MobsDb = require('../../utils/rpg/data/mobs.json');
const Animal = require('../../utils/rpg/Animal');

module.exports = {
    name: 'battle',
    description: 'Battle a mob! Usage: !battle <mob_name|optional>',

    async execute(message, args) {
        const userId = message.author.id;
        const player = await RPGPlayer.findOne({ userId });

        if (!player || player.zoo.length === 0) {
            return message.reply('You need animals to fight! Use `!hunt` first.');
        }

        // 1. Determine Player Team
        // For now, auto-select top 3 animals or use 'team' array if populated
        let playerTeamData = [];
        if (player.team && player.team.length > 0) {
            // resolve team IDs to animal objects
            // Assuming player.zoo contains full animal objects
            // Filter zoo by IDs in player.team
            playerTeamData = player.team.map(id => player.zoo.find(a => a.id === id)).filter(Boolean);
        }

        // Fallback: Pick first 3
        if (playerTeamData.length === 0) {
            playerTeamData = player.zoo.slice(0, 3);
        }

        // Convert plain data back to Animal instances for logic
        const playerTeam = playerTeamData.map(d => new Animal(d));

        // Add player stats bonuses? (From Equipment)
        // Currently BattleSystem treats animals as fighters. 
        // If we want Player participation, we add a "Hero" entity or boost animals.
        // Let's BOOST animals stats based on Player Equipment for now.
        const playerStats = RPGPlayer.getPlayerTotalStats(player);
        // Bonus per animal = Player Stats / team size (simplified)
        const bonusStr = Math.floor(playerStats.str / 10);
        const bonusDef = Math.floor(playerStats.def / 10);

        playerTeam.forEach(a => {
            a.stats.str += bonusStr;
            a.stats.def = (a.stats.def || 0) + bonusDef;
        });


        // 2. Determine Enemy
        let mobDef;
        // Logic: specific mob or random based on level?
        // Random for now if no arg
        if (args.length > 0) {
            const query = args.join(' ').toLowerCase();
            mobDef = MobsDb.find(m => m.name.toLowerCase().includes(query) || m.id === query);
        }

        if (!mobDef) {
            // Random mob
            mobDef = MobsDb[Math.floor(Math.random() * MobsDb.length)];
        }

        // Create full mob instance (Object + Runtime props)
        // Mobs are not "Animal" instances but share structure. 
        const enemyTeam = [{
            ...mobDef,
            stats: { ...mobDef.stats }, // clone
            skills: mobDef.skills // pass skills
        }];


        // 3. Simulate
        const result = BattleSystem.simulate(playerTeam, enemyTeam);

        // 4. Rewards
        let description = '';
        if (result.winner === 'A') {
            const xpGain = 50;
            const goldGain = 100;

            player.xp += xpGain;
            player.gold += goldGain;

            // Level up active animals
            playerTeamData.forEach(original => {
                // We need to find the animal in the zoo array and update it
                // 'original' is a reference to the object in player.zoo (if we referenced correctly)
                // But we mapped new Animal(d). The logic needs to update persistent data.
                // We'll just perform a lookup by ID.
                const realAnimal = player.zoo.find(z => z.id === original.id);
                if (realAnimal) {
                    realAnimal.xp = (realAnimal.xp || 0) + 10;
                    // Simple logic
                }
            });

            await player.save();
            description = `🏆 **Victory!**\nYou gained **${goldGain} Gold** and **${xpGain} XP**!`;
        } else {
            description = `💀 **Defeat...**\nYour animals need to rest.`;
        }

        // Truncate Log for Embed (max 4096 chars)
        let logText = result.log.join('\n');
        if (logText.length > 1000) logText = logText.slice(0, 1000) + '...';

        const embed = new EmbedBuilder()
            .setTitle(`Battle: VS ${mobDef.name}`)
            .setDescription(description + '\n\n' + '```\n' + logText + '\n```')
            .setColor(result.winner === 'A' ? 'Green' : 'Red');

        message.channel.send({ embeds: [embed] });
    }
};
