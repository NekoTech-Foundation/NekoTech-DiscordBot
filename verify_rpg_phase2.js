const Animal = require('./utils/rpg/Animal');
const BattleSystem = require('./utils/rpg/BattleSystem');
const MobsDb = require('./utils/rpg/data/mobs.json');
const RPGPlayer = require('./models/RPGPlayer'); // Mock only

// Mock Player Data for stat test
const fakePlayer = {
    stats: { hp: 100, str: 10, def: 5 },
    equipment: { weapon: 'iron_sword', armor: 'leather_armor' }
};

console.log('--- Testing Stat Calculation ---');
const totalStats = RPGPlayer.getPlayerTotalStats(fakePlayer);
console.log('Base STR:', fakePlayer.stats.str);
console.log('Total STR (w/ Iron Sword +15):', totalStats.str);
console.log('Expected:', 25);


console.log('\n--- Testing Battle AI (Skills) ---');
// Mock Mob: Goblin Chief (has abilities)
const mobDef = MobsDb.find(m => m.id === 'goblin_chief');
const enemyTeam = [{ ...mobDef, currentHp: mobDef.stats.hp, stats: mobDef.stats }];

// Hero
const hero = new Animal({ name: 'Hero', stats: { hp: 200, str: 20, spd: 10, def: 5 } });

const result = BattleSystem.simulate([hero], enemyTeam);

// Check log for skills
const skillUsage = result.log.filter(l => l.includes('used **'));
if (skillUsage.length > 0) {
    console.log('Success! Skills were used:');
    skillUsage.forEach(l => console.log(l));
} else {
    console.log('No skills used (might be RNG or mob died too fast).');
}

console.log(`Winner: ${result.winner}`);
