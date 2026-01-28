const Animal = require('./utils/rpg/Animal');
const RNG = require('./utils/rpg/RNG');
const BattleSystem = require('./utils/rpg/BattleSystem');

console.log('--- Testing RNG ---');
for (let i = 0; i < 5; i++) {
    const animal = RNG.generateAnimal();
    console.log(`Generated: ${animal.name} (${animal.rarity}) - HP:${animal.stats.hp} STR:${animal.stats.str}`);
}

console.log('\n--- Testing Battle System ---');
const teamA = [
    new Animal({ name: 'Hero Lion', stats: { hp: 50, str: 10, spd: 5, def: 2 } }),
    new Animal({ name: 'Sidekick Wolf', stats: { hp: 30, str: 8, spd: 8, def: 1 } })
];

const teamB = [
    new Animal({ name: 'Villain Dragon', stats: { hp: 80, str: 12, spd: 3, def: 5 } })
];

const result = BattleSystem.simulate(teamA, teamB);
console.log('Battle Log:');
console.log(result.log.join('\n'));
console.log(`Winner: ${result.winner}`);
