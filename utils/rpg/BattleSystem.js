class BattleSystem {
    constructor() {
        this.log = [];
    }

    /**
     * Simulate a battle
     * @param {Array} teamA - Players/Animals
     * @param {Array} teamB - Mobs/Animals
     */
    simulate(teamA, teamB) {
        this.log = [];
        let turn = 1;

        // Deep clone and Init stats
        // We use 'currentHp' to track health during battle
        let sideA = teamA.map(e => this._initEntity(e, 'A'));
        let sideB = teamB.map(e => this._initEntity(e, 'B'));

        this.log.push(`⚔️ **Battle Start!**`);
        this.log.push(`Team A: ${sideA.map(e => e.name).join(', ')}`);
        this.log.push(`Team B: ${sideB.map(e => e.name).join(', ')}`);

        while (this.isAlive(sideA) && this.isAlive(sideB) && turn <= 30) {
            this.log.push(`\n**--- Turn ${turn} ---**`);

            // Turn Order based on Speed
            const allEntities = [...sideA, ...sideB]
                .filter(e => e.currentHp > 0)
                .sort((a, b) => b.stats.spd - a.stats.spd);

            for (const attacker of allEntities) {
                if (attacker.currentHp <= 0) continue;

                const targetSide = attacker.team === 'A' ? sideB : sideA;
                const activeTargets = targetSide.filter(e => e.currentHp > 0);

                if (activeTargets.length === 0) break;

                const target = activeTargets[Math.floor(Math.random() * activeTargets.length)];

                // SKILL CHECK
                // Simple AI: 30% chance to use special skill if available
                let usedSkill = false;
                if (attacker.skills && attacker.skills.length > 0 && Math.random() < 0.3) {
                    const skillId = attacker.skills[Math.floor(Math.random() * attacker.skills.length)];
                    if (skillId !== 'basic_attack') {
                        this.useSkill(attacker, target, skillId);
                        usedSkill = true;
                    }
                }

                if (!usedSkill) {
                    this.attack(attacker, target);
                }
            }
            turn++;
        }

        const winner = this.isAlive(sideA) ? 'A' : (this.isAlive(sideB) ? 'B' : 'Draw');
        this.log.push(`\n🏆 **Battle Ended! Winner: Team ${winner}**`);

        return {
            winner: winner,
            log: this.log
        };
    }

    _initEntity(original, team) {
        // Handle both raw objects and Animal class instances
        // Ensure we calculate effective stats if it's an Animal instance
        const stats = original.getEffectiveStats ? original.getEffectiveStats() : original.stats;

        // If it's a Player-like object (has equipment stats, handled outside or merged here?)
        // For simplicity, assume stats are already final on the object passed in, OR we pass in RPGPlayer and need to merge.
        // Assuming 'original' is the Animal instance for now. 

        return {
            ...original,
            name: original.name,
            stats: { ...stats },
            currentHp: stats.hp,
            skills: original.skills || [],
            team: team,
            isPlayer: original.isPlayer || false // marker
        };
    }

    isAlive(team) {
        return team.some(e => e.currentHp > 0);
    }

    attack(attacker, defender) {
        // Base Dmg Formula: Str * 2 - Def
        let damage = Math.max(1, (attacker.stats.str * 2) - (defender.stats.def || 0));

        // Crit Chance: 10%
        let isCrit = Math.random() < 0.1;
        if (isCrit) damage = Math.floor(damage * 1.5);

        defender.currentHp -= damage;

        this.log.push(`${attacker.name} attacks ${defender.name}! ${isCrit ? '**CRITICAL HIT!** ' : ''}${damage} dmg. (${Math.max(0, defender.currentHp)} HP left)`);

        if (defender.currentHp <= 0) {
            this.log.push(`💀 **${defender.name}** fainted!`);
        }
    }

    useSkill(attacker, defender, skillId) {
        // Simplified Skill Logic
        switch (skillId) {
            case 'firebreath':
                const dmg = attacker.stats.str * 2.5;
                defender.currentHp -= dmg;
                this.log.push(`🔥 ${attacker.name} used **Fire Breath**! ${dmg} dmg.`);
                break;
            case 'heal':
                const healAmt = 20;
                attacker.currentHp += healAmt;
                this.log.push(`✨ ${attacker.name} used **Heal**! Recovered ${healAmt} HP.`);
                break;
            case 'bite':
                const biteDmg = attacker.stats.str * 1.5;
                defender.currentHp -= biteDmg;
                this.log.push(`🦷 ${attacker.name} used **Bite**! ${biteDmg} dmg.`);
                break;
            case 'smash':
                const smashDmg = attacker.stats.str * 2.0;
                defender.currentHp -= smashDmg;
                this.log.push(`🔨 ${attacker.name} used **Smash**! ${smashDmg} dmg.`);
                break;
            default:
                this.attack(attacker, defender);
                break;
        }
    }
}

module.exports = new BattleSystem();
