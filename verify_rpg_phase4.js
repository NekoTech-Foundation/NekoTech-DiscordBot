const RPGController = require('./utils/rpg/RPGController');
const path = require('path');

// Mock Interactions
const mockInteraction = (userId, options = {}) => ({
    user: { id: userId, username: 'TestUser' },
    options: {
        getString: (name) => options[name],
        getInteger: (name) => options[name],
        getUser: (name) => ({ id: userId, username: 'TestUser' }),
        getBoolean: (name) => options[name]
    },
    reply: async (msg) => {
        // Output clean JSON for easy reading
        if (msg.embeds && msg.embeds.length > 0) {
            const embed = msg.embeds[0];
            console.log(`[REPLY EMBED] Title: ${embed.data.title}`);
            console.log(`[REPLY EMBED] Desc: ${embed.data.description}`);
            if (embed.data.fields) {
                embed.data.fields.forEach(f => console.log(`   Field: ${f.name}: ${f.value}`));
            }
            if (embed.data.footer) console.log(`   Footer: ${embed.data.footer.text}`);
        } else {
            console.log(`[REPLY] ${msg}`);
        }

        return {
            createMessageComponentCollector: () => ({ on: () => { } }),
            editReply: () => { }
        };
    },
    editReply: async (msg) => console.log(`[EDIT_REPLY]`, msg)
});

async function runTests() {
    try {
        console.log('--- STARTING RPG PHASE 4 VERIFICATION (SQLite) ---');
        console.log('--------------------------------------------------');

        const userId = 'TEST_USER_PHASE4';

        // 1. Reset Data for User
        // Since we don't have direct access to SQLiteModel's db instance here easily without requiring it,
        // we can just use RPGController to get the player and modify it.
        // Or we can require the model directly to delete.
        const RPGPlayer = require('./models/RPGPlayer');
        // SQLiteModel likely has a delete method? Or we manually clear.
        // Let's assume we can just overwrite data or strict check.
        // Actually best to try and "reset" via the object if we can't drop.

        let player = await RPGController.getPlayer(userId);
        player.lastHuntTime = 0;
        player.zoo = [];
        player.gold = 0;
        player.inventory = [];
        await player.save();
        console.log('Reset test user data.');

        console.log('\n--- TEST 1: Hunt Loop (Check Probability & Biomes) ---');
        // Run hunt 10 times. We expect animals and maybe "Nothing" or "Treasure".
        // We force cooldown reset every time.

        for (let i = 0; i < 5; i++) {
            console.log(`\nRun ${i + 1}:`);
            // Force reset cooldown
            let p = await RPGController.getPlayer(userId);
            p.lastHuntTime = 0;
            await p.save();

            await RPGController.hunt(mockInteraction(userId));
        }

        console.log('\n--- TEST 2: Zoo Pagination ---');
        // Add dummy animals manually
        player = await RPGController.getPlayer(userId);
        for (let j = 0; j < 25; j++) {
            player.zoo.push({
                name: `Test Animal ${j}`,
                rarity: 'Common',
                level: 1,
                id: `id_${j}`,
                stats: { hp: 10, str: 1, spd: 1 }
            });
        }
        await player.save();

        console.log('Calling zoo (expect Page 1/3)...');
        await RPGController.zoo(mockInteraction(userId));

        console.log('\n--------------------------------------------------');
        console.log('Test Complete. Check output logs for functionality confirmation.');
        // SQLite holds the process open usually?
        // SQLiteModel usually doesn't block exit?
        process.exit(0);

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

runTests();
