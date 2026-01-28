const RPGController = require('./utils/rpg/RPGController');
const RPGPlayer = require('./models/RPGPlayer');
const RNG = require('./utils/rpg/RNG');
const itemsDb = require('./utils/rpg/data/items.json');

// Mock interaction
const createMockInteraction = (optionsData, userId = 'user_test_phase3') => ({
    user: { id: userId, username: 'TestUser' },
    guild: { id: 'guild_test' },
    options: {
        getSubcommand: () => optionsData.subcommand,
        getString: (name) => optionsData[name],
        getInteger: (name) => optionsData[name],
        getBoolean: (name) => optionsData[name],
        getUser: (name) => optionsData[name] || { id: userId, username: 'TestUser' },
    },
    reply: (msg) => console.log(`[REPLY]`, JSON.stringify(msg, null, 2)),
    editReply: (msg) => console.log(`[EDIT]`, JSON.stringify(msg, null, 2)),
    deferReply: () => console.log(`[DEFER]`)
});

async function verifyPhase3() {
    console.log('--- Starting Phase 3 Validation ---');

    // 1. Setup Player
    const userId = 'user_test_phase3_v2';
    // Clear old data if exists (using raw DB access would be better but this works for persistent mock)
    // Actually, let's just create a new user or rely on Controller

    // Give some gold
    let player = await RPGController.getPlayer(userId);
    player.gold = 1000;
    player.zoo = [];
    player.inventory = [];
    await player.save();

    console.log('1. Testing Hunt & Nekodex...');
    await RPGController.hunt(createMockInteraction({ subcommand: 'hunt' }, userId));

    player = await RPGController.getPlayer(userId);
    console.log(`Zoo size: ${player.zoo.length}, Nekodex size: ${player.nekodex ? player.nekodex.length : 0}`);

    console.log('2. Testing Rename...');
    if (player.zoo.length > 0) {
        await RPGController.rename(createMockInteraction({ subcommand: 'rename', index: 1, name: 'SuperCat' }, userId));
    }

    console.log('3. Testing Sell...');
    // Hunt another one to sell
    await RPGController.hunt(createMockInteraction({ subcommand: 'hunt' }, userId));
    await RPGController.sell(createMockInteraction({ subcommand: 'sell', index: 2 }, userId));

    console.log('4. Testing Lootbox...');
    await RPGController.lootbox(createMockInteraction({ subcommand: 'lootbox', type: 'lootbox' }, userId));
    await RPGController.lootbox(createMockInteraction({ subcommand: 'lootbox', type: 'crate' }, userId));

    console.log('5. Testing Team & Battle Settings...');
    await RPGController.hunt(createMockInteraction({ subcommand: 'hunt' }, userId)); // Ensure we have animals
    await RPGController.team(createMockInteraction({ subcommand: 'team', slot1: 1 }, userId));
    await RPGController.battlesetting(createMockInteraction({ subcommand: 'battlesetting', autoskill: false }, userId));

    console.log('6. Testing AutoHunt...');
    await RPGController.autohunt(createMockInteraction({ subcommand: 'autohunt' }, userId)); // Start
    // Simulate time pass? Hard to do without mocking Date.now, but logic check is done in controller.

    console.log('--- Validation Complete ---');
}

verifyPhase3().catch(console.error);
