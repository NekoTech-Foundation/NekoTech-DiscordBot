/**
 * Uma Musume Racing Engine
 * Phase-based race simulation with skill activation, stamina management, and position tracking
 */

const PHASES = {
    START: 'start',
    EARLY: 'early',
    MIDDLE: 'middle',
    FINAL: 'final',
    FINISH: 'finish'
};

const POSITION_GROUPS = {
    FRONT: [1, 2, 3],
    MID: [4, 5, 6, 7, 8],
    BACK: [9, 10, 11, 12]
};

/**
 * Main race simulation function
 * @param {Object} uma - Player's Uma Musume
 * @param {Array} bots - Array of bot racers
 * @param {Object} raceConfig - Race configuration (track, weather, etc.)
 * @returns {Object} Race result with positions, skill activations, etc.
 */
function simulateRace(uma, bots, raceConfig) {
    // Initialize racers
    const racers = initializeRacers(uma, bots, raceConfig);

    // Race state
    const raceState = {
        phase: PHASES.START,
        distance: raceConfig.distance,
        distanceCovered: 0,
        weather: raceConfig.weather || 'Clear',
        trackCondition: raceConfig.trackCondition || 'firm',
        turnDirection: raceConfig.turnDirection || 'right',
        surface: raceConfig.surface || 'Cỏ',
        racers: racers,
        activatedSkills: [],
        phaseResults: []
    };

    // Run simulation through phases
    const phases = calculatePhases(raceConfig.distance);

    for (const phase of phases) {
        raceState.phase = phase.type;
        const phaseResult = processPhase(raceState, phase);
        raceState.phaseResults.push(phaseResult);
        raceState.distanceCovered += phase.distance;
    }

    // Calculate final results
    return calculateFinalResults(raceState, uma);
}

/**
 * Initialize racers with starting positions and stats
 */
function initializeRacers(uma, bots, raceConfig) {
    const racers = [];

    // Player's Uma
    racers.push({
        id: 'player',
        name: uma.name,
        isPlayer: true,
        stats: { ...uma.stats },
        skills: uma.skills || [],
        trackPreferences: uma.trackPreferences || {},
        position: 0,
        stamina: 100,
        speed: 0,
        acceleration: 0,
        distanceCovered: 0,
        strategy: determineStrategy(uma),
        gate: Math.floor(Math.random() * 8) + 1,
        skillCooldowns: {},
        activeEffects: []
    });

    // Bots
    bots.forEach((bot, index) => {
        racers.push({
            id: `bot_${index}`,
            name: bot.name || `Bot ${index + 1}`,
            isPlayer: false,
            stats: bot.stats,
            skills: bot.skills || [],
            trackPreferences: bot.trackPreferences || {},
            position: 0,
            stamina: 100,
            speed: 0,
            acceleration: 0,
            distanceCovered: 0,
            strategy: bot.strategy || 'chaser',
            gate: Math.floor(Math.random() * 8) + 1,
            skillCooldowns: {},
            activeEffects: []
        });
    });

    return racers;
}

/**
 * Calculate race phases based on distance
 */
function calculatePhases(distance) {
    const phases = [];

    // Start phase (first 10% or 200m, whichever is smaller)
    const startDistance = Math.min(200, distance * 0.1);
    phases.push({ type: PHASES.START, distance: startDistance });

    // Early phase (next 30%)
    const earlyDistance = distance * 0.3;
    phases.push({ type: PHASES.EARLY, distance: earlyDistance });

    // Middle phase (next 40%)
    const middleDistance = distance * 0.4;
    phases.push({ type: PHASES.MIDDLE, distance: middleDistance });

    // Final phase (last 20%)
    const finalDistance = distance - startDistance - earlyDistance - middleDistance;
    phases.push({ type: PHASES.FINAL, distance: finalDistance });

    return phases;
}

/**
 * Process a single phase of the race
 */
function processPhase(raceState, phase) {
    const { racers, weather, trackCondition, surface, turnDirection } = raceState;
    const phaseResult = {
        phase: phase.type,
        skillActivations: [],
        positionChanges: [],
        staminaChanges: []
    };

    // Process each racer
    racers.forEach(racer => {
        // Calculate base speed for this phase
        const baseSpeed = calculatePhaseSpeed(racer, phase, raceState);

        // Apply weather effects
        const weatherMultiplier = getWeatherMultiplier(weather, racer);

        // Apply track condition effects
        const trackMultiplier = getTrackMultiplier(surface, trackCondition, racer);

        // Check and activate skills
        const skillEffects = activateSkills(racer, phase.type, raceState);
        phaseResult.skillActivations.push(...skillEffects.activations);

        // Calculate stamina usage
        const staminaUsage = calculateStaminaUsage(racer, phase, raceState);
        racer.stamina = Math.max(0, racer.stamina - staminaUsage + (skillEffects.staminaRecovery || 0));

        phaseResult.staminaChanges.push({
            racerId: racer.id,
            change: -staminaUsage + (skillEffects.staminaRecovery || 0),
            current: racer.stamina
        });

        // Calculate final speed with all modifiers
        let finalSpeed = baseSpeed * weatherMultiplier * trackMultiplier;
        finalSpeed += skillEffects.speedBoost || 0;
        finalSpeed *= (1 + (skillEffects.speedMultiplier || 0));

        // Apply stamina penalty if low
        if (racer.stamina < 30) {
            finalSpeed *= (0.7 + racer.stamina / 100);
        }

        racer.speed = finalSpeed;
        racer.distanceCovered += finalSpeed * (phase.distance / 100);
    });

    // Update positions
    updatePositions(racers);

    return phaseResult;
}

/**
 * Calculate base speed for a phase based on strategy
 */
function calculatePhaseSpeed(racer, phase, raceState) {
    const { speed, stamina, power, guts, wit } = racer.stats;
    let baseSpeed = 0;

    // Strategy-based pacing
    switch (racer.strategy) {
        case 'front':
            // Front runners go fast early, slow down late
            if (phase.type === PHASES.START || phase.type === PHASES.EARLY) {
                baseSpeed = speed * 1.2 + power * 0.5;
            } else if (phase.type === PHASES.MIDDLE) {
                baseSpeed = speed * 1.0 + stamina * 0.3;
            } else {
                baseSpeed = speed * 0.8 + guts * 0.4;
            }
            break;

        case 'stalker':
            // Stalkers maintain steady pace, accelerate in final
            if (phase.type === PHASES.FINAL) {
                baseSpeed = speed * 1.3 + power * 0.6;
            } else {
                baseSpeed = speed * 1.0 + wit * 0.3;
            }
            break;

        case 'chaser':
            // Chasers save energy, strong finish
            if (phase.type === PHASES.START || phase.type === PHASES.EARLY) {
                baseSpeed = speed * 0.8 + stamina * 0.4;
            } else if (phase.type === PHASES.FINAL) {
                baseSpeed = speed * 1.4 + guts * 0.7;
            } else {
                baseSpeed = speed * 0.9 + stamina * 0.5;
            }
            break;

        case 'closer':
            // Closers save maximum energy for final burst
            if (phase.type === PHASES.FINAL) {
                baseSpeed = speed * 1.5 + power * 0.8 + guts * 0.6;
            } else {
                baseSpeed = speed * 0.7 + stamina * 0.6;
            }
            break;

        default:
            baseSpeed = speed * 1.0 + stamina * 0.3;
    }

    return baseSpeed;
}

/**
 * Activate skills based on conditions
 */
function activateSkills(racer, phase, raceState) {
    const effects = {
        speedBoost: 0,
        speedMultiplier: 0,
        staminaRecovery: 0,
        accelerationBoost: 0,
        activations: []
    };

    if (!racer.skills || racer.skills.length === 0) return effects;

    racer.skills.forEach(skill => {
        // Check cooldown
        if (racer.skillCooldowns[skill.name] > 0) {
            racer.skillCooldowns[skill.name]--;
            return;
        }

        // Check activation conditions
        if (canActivateSkill(skill, racer, phase, raceState)) {
            // Apply skill effects
            applySkillEffects(skill, effects);

            // Set cooldown if any
            if (skill.cooldown) {
                racer.skillCooldowns[skill.name] = skill.cooldown;
            }

            effects.activations.push({
                racerId: racer.id,
                skillName: skill.name,
                phase: phase
            });
        }
    });

    return effects;
}

/**
 * Check if a skill can be activated
 */
function canActivateSkill(skill, racer, phase, raceState) {
    if (!skill.effects) return false;

    const condition = skill.effects.condition;
    if (!condition) return true; // No condition = always active

    const condLower = condition.toLowerCase();

    // Phase conditions
    if (condLower.includes('start') && phase !== PHASES.START) return false;
    if (condLower.includes('early') && phase !== PHASES.EARLY) return false;
    if (condLower.includes('mid') && phase !== PHASES.MIDDLE) return false;
    if (condLower.includes('final') && phase !== PHASES.FINAL) return false;

    // Position conditions
    if (condLower.includes('front') || condLower.includes('lead')) {
        if (racer.position > 3) return false;
    }
    if (condLower.includes('rear') || condLower.includes('back')) {
        if (racer.position < 6) return false;
    }

    // Weather conditions
    if (skill.effects.season) {
        // Check if current race matches season (would need to be passed in raceConfig)
    }

    // Track conditions
    if (condLower.includes('corner') || condLower.includes('turn')) {
        // Activate in middle phase (most turns)
        if (phase !== PHASES.MIDDLE) return false;
    }

    if (condLower.includes('straight')) {
        // Activate in early or final (straight sections)
        if (phase !== PHASES.EARLY && phase !== PHASES.FINAL) return false;
    }

    // Distance conditions
    if (condLower.includes('sprint') && raceState.distance > 1400) return false;
    if (condLower.includes('mile') && (raceState.distance < 1400 || raceState.distance > 1800)) return false;
    if (condLower.includes('medium') && (raceState.distance < 1800 || raceState.distance > 2400)) return false;
    if (condLower.includes('long') && raceState.distance < 2400) return false;

    // Gate conditions
    if (condLower.includes('gate_7') && racer.gate !== 7) return false;
    if (condLower.includes('outer_gate') && racer.gate < 6) return false;
    if (condLower.includes('inner_gate') && racer.gate > 3) return false;

    // Weather conditions
    if (condLower.includes('rain') && raceState.weather !== 'Rainy') return false;
    if (condLower.includes('sunny') && raceState.weather !== 'Sunny') return false;

    return true;
}

/**
 * Apply skill effects to the effects object
 */
function applySkillEffects(skill, effects) {
    const skillEffect = skill.effects;

    if (skillEffect.type === 'stamina_recovery') {
        effects.staminaRecovery += skillEffect.value || 0;
    }

    if (skillEffect.type === 'speed_boost') {
        effects.speedBoost += (skillEffect.value || 0) * 100; // Convert to absolute value
    }

    if (skillEffect.type === 'acceleration_boost') {
        effects.accelerationBoost += (skillEffect.value || 0) * 100;
    }

    if (skillEffect.type === 'fatigue_reduction') {
        effects.staminaRecovery += (skillEffect.value || 0) * 20;
    }

    // Track condition bonuses
    if (skillEffect.type === 'track_condition_boost') {
        effects.speedMultiplier += (skillEffect.value || 0) / 100;
    }

    if (skillEffect.type === 'season_bonus') {
        effects.speedMultiplier += (skillEffect.value || 0) / 100;
    }

    if (skillEffect.type === 'weather_bonus') {
        effects.speedMultiplier += (skillEffect.value || 0) / 100;
    }
}

/**
 * Calculate stamina usage for a phase
 */
function calculateStaminaUsage(racer, phase, raceState) {
    const baseUsage = 15; // Base stamina per phase
    let usage = baseUsage;

    // Distance affects stamina usage
    const distanceMultiplier = raceState.distance / 2000; // Normalize around 2000m
    usage *= distanceMultiplier;

    // Strategy affects usage
    if (racer.strategy === 'front' && phase.type === PHASES.START) {
        usage *= 1.3; // Front runners use more early
    } else if (racer.strategy === 'closer' && phase.type !== PHASES.FINAL) {
        usage *= 0.7; // Closers conserve energy
    }

    // Phase type affects usage
    if (phase.type === PHASES.FINAL) {
        usage *= 1.5; // Final sprint uses more stamina
    }

    return usage;
}

/**
 * Get weather effect multiplier
 */
function getWeatherMultiplier(weather, racer) {
    let multiplier = 1.0;

    switch (weather) {
        case 'Sunny':
            multiplier = 1.05;
            break;
        case 'Rainy':
            multiplier = 0.95;
            break;
        case 'Foggy':
            multiplier = 0.92 + Math.random() * 0.16; // 0.92 to 1.08
            break;
        case 'Snowy':
            multiplier = 0.90;
            // Guts helps in harsh conditions
            if (racer.stats.guts > 800) {
                multiplier += 0.05;
            }
            break;
    }

    return multiplier;
}

/**
 * Get track condition multiplier
 */
function getTrackMultiplier(surface, condition, racer) {
    let multiplier = 1.0;

    // Surface preference
    if (racer.trackPreferences) {
        if (surface === 'Cỏ' && racer.trackPreferences.grass) {
            multiplier *= getPreferenceMultiplier(racer.trackPreferences.grass);
        } else if (surface === 'Đất' && racer.trackPreferences.dirt) {
            multiplier *= getPreferenceMultiplier(racer.trackPreferences.dirt);
        }
    }

    // Track condition
    if (condition === 'heavy' || condition === 'soft') {
        // Power helps on heavy tracks
        if (racer.stats.power > 800) {
            multiplier *= 1.05;
        } else {
            multiplier *= 0.97;
        }
    }

    return multiplier;
}

/**
 * Get preference multiplier from grade
 */
function getPreferenceMultiplier(grade) {
    const multipliers = {
        'S': 1.3,
        'A+': 1.25,
        'A': 1.2,
        'B+': 1.15,
        'B': 1.1,
        'C+': 1.05,
        'C': 1.0,
        'D': 0.95,
        'E': 0.9,
        'F': 0.85,
        'G': 0.8
    };
    return multipliers[grade] || 1.0;
}

/**
 * Update racer positions based on distance covered
 */
function updatePositions(racers) {
    // Sort by distance covered (descending)
    racers.sort((a, b) => b.distanceCovered - a.distanceCovered);

    // Update position property
    racers.forEach((racer, index) => {
        racer.position = index + 1;
    });
}

/**
 * Determine strategy based on Uma's track preferences
 */
function determineStrategy(uma) {
    const prefs = uma.trackPreferences;
    if (!prefs) return 'chaser';

    const strategies = {
        front: getPreferenceMultiplier(prefs.front || 'C'),
        stalker: getPreferenceMultiplier(prefs.stalker || 'C'),
        chaser: getPreferenceMultiplier(prefs.chaser || 'C'),
        closer: getPreferenceMultiplier(prefs.closer || 'C')
    };

    // Return strategy with highest preference
    return Object.entries(strategies).reduce((a, b) => a[1] > b[1] ? a : b)[0];
}

/**
 * Calculate final race results
 */
function calculateFinalResults(raceState, uma) {
    // Final sort by distance
    updatePositions(raceState.racers);

    const playerRacer = raceState.racers.find(r => r.isPlayer);
    const position = playerRacer.position;
    const totalRacers = raceState.racers.length;

    // Calculate rewards
    let reward = 0;
    if (position === 1) reward = 500;
    else if (position === 2) reward = 300;
    else if (position === 3) reward = 150;

    // Calculate skill points
    let skillPoints = 0;
    if (position === 1) skillPoints = 30;
    else if (position === 2) skillPoints = 20;
    else if (position === 3) skillPoints = 10;
    else if (position <= 5) skillPoints = 5;

    return {
        position,
        totalRacers,
        reward,
        skillPoints,
        isWin: position === 1,
        finalStamina: playerRacer.stamina,
        skillActivations: raceState.activatedSkills.filter(s => s.racerId === 'player'),
        positions: raceState.racers.map(r => ({
            name: r.name,
            position: r.position,
            distance: Math.round(r.distanceCovered),
            isPlayer: r.isPlayer
        })),
        phaseResults: raceState.phaseResults
    };
}

/**
 * Generate bot racers for a race
 */
function generateBots(difficulty = 5, count = 11, raceDistance = 2000) {
    const bots = [];
    const baseStatTotal = 800 + difficulty * 50;

    for (let i = 0; i < count; i++) {
        const variance = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
        const statTotal = Math.floor(baseStatTotal * variance);

        const stats = distributeStats(statTotal);
        const trackPreferences = generateBotPreferences(stats);

        bots.push({
            name: `Racer ${i + 1}`,
            stats,
            trackPreferences,
            skills: [], // Bots have no skills for simplicity
            strategy: ['front', 'stalker', 'chaser', 'closer'][Math.floor(Math.random() * 4)]
        });
    }

    return bots;
}

/**
 * Distribute stat points for bot
 */
function distributeStats(total) {
    const stats = { speed: 0, stamina: 0, power: 0, guts: 0, wit: 0 };
    const statNames = ['speed', 'stamina', 'power', 'guts', 'wit'];

    let remaining = total;
    for (let i = 0; i < statNames.length - 1; i++) {
        const avg = remaining / (statNames.length - i);
        const value = Math.floor(avg * (0.7 + Math.random() * 0.6));
        stats[statNames[i]] = Math.max(100, value);
        remaining -= stats[statNames[i]];
    }
    stats[statNames[statNames.length - 1]] = Math.max(100, remaining);

    return stats;
}

/**
 * Generate track preferences for bot
 */
function generateBotPreferences(stats) {
    const grades = ['G', 'F', 'E', 'D', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S'];
    const getGrade = (value) => {
        const index = Math.floor(value / 100);
        return grades[Math.min(index, grades.length - 1)];
    };

    return {
        grass: getGrade(stats.speed + stats.wit),
        dirt: getGrade(stats.power + stats.guts),
        sprint: getGrade(stats.speed),
        mile: getGrade(stats.speed + stats.wit / 2),
        medium: getGrade(stats.speed + stats.stamina / 2),
        long: getGrade(stats.stamina + stats.guts),
        front: getGrade(stats.speed + stats.power),
        stalker: getGrade(stats.speed + stats.wit),
        chaser: getGrade(stats.stamina + stats.guts),
        closer: getGrade(stats.stamina + stats.power)
    };
}

module.exports = {
    simulateRace,
    generateBots,
    PHASES,
    POSITION_GROUPS
};
