/**
 * Uma Musume Skills Engine
 * Handles skill activation conditions, effects calculation, and combo detection
 */

const allSkills = require('./skills.json').skills;

/**
 * Check if a skill can be activated based on current context
 * @param {Object} skill - The skill object
 * @param {Object} racer - The racer with stats and state
 * @param {String} phase - Current race phase
 * @param {Object} raceContext - Full race context (weather, track, positions, etc.)
 * @returns {Boolean} - Whether skill can activate
 */
function canActivateSkill(skill, racer, phase, raceContext) {
    if (!skill || !skill.effects) return false;

    const condition = skill.effects.condition;
    if (!condition) return true; // No condition means always active

    const condLower = condition.toLowerCase();

    // Phase-based conditions
    if (!checkPhaseCondition(condLower, phase)) return false;

    // Position-based conditions
    if (!checkPositionCondition(condLower, racer.position, raceContext.totalRacers)) return false;

    // Distance/Race type conditions
    if (!checkDistanceCondition(condLower, raceContext.distance)) return false;

    // Weather conditions
    if (!checkWeatherCondition(condLower, raceContext.weather)) return false;

    // Season conditions
    if (skill.effects.season && !checkSeasonCondition(skill.effects.season, raceContext.season)) return false;

    // Track conditions
    if (!checkTrackCondition(condLower, raceContext)) return false;

    // Gate/Starting position conditions
    if (!checkGateCondition(condLower, racer.gate)) return false;

    // Strategy conditions
    if (!checkStrategyCondition(condLower, racer.strategy)) return false;

    // Special conditions
    if (!checkSpecialConditions(condLower, racer, raceContext)) return false;

    return true;
}

/**
 * Check phase-based condition
 */
function checkPhaseCondition(condition, phase) {
    if (condition.includes('start') && phase !== 'start') return false;
    if (condition.includes('early') && phase !== 'early' && !condition.includes('early_')) return false;
    if (condition.includes('mid') && phase !== 'middle') return false;
    if (condition.includes('final') && phase !== 'final') return false;
    if (condition.includes('corner') && phase !== 'middle') return false; // Most turns in middle
    if (condition.includes('straight') && (phase === 'middle')) return false; // Not in corners
    return true;
}

/**
 * Check position-based condition
 */
function checkPositionCondition(condition, position, totalRacers) {
    // Front/Lead conditions
    if (condition.includes('front') || condition.includes('lead') || condition.includes('dẫn đầu')) {
        if (position > 3) return false;
    }

    // Mid-pack conditions
    if (condition.includes('mid_race') || condition.includes('giữa')) {
        if (position < 4 || position > totalRacers - 3) return false;
    }

    // Rear/Back conditions
    if (condition.includes('rear') || condition.includes('back') || condition.includes('phía sau')) {
        if (position <= totalRacers / 2) return false;
    }

    // Specific position ranges
    if (condition.includes('position_1_3') && (position < 1 || position > 3)) return false;
    if (condition.includes('position_4_8') && (position < 4 || position > 8)) return false;

    return true;
}

/**
 * Check distance/race type condition
 */
function checkDistanceCondition(condition, distance) {
    if (condition.includes('sprint') && distance > 1400) return false;
    if (condition.includes('mile') && (distance < 1400 || distance > 1800)) return false;
    if (condition.includes('medium') && (distance < 1800 || distance > 2400)) return false;
    if (condition.includes('long') && distance <= 2400) return false;

    return true;
}

/**
 * Check weather condition
 */
function checkWeatherCondition(condition, weather) {
    if (!weather) return true;

    const weatherLower = weather.toLowerCase();

    if (condition.includes('rain') && !weatherLower.includes('rain')) return false;
    if (condition.includes('sunny') && !weatherLower.includes('sunny') && !weatherLower.includes('clear')) return false;
    if (condition.includes('snow') && !weatherLower.includes('snow')) return false;
    if (condition.includes('fog') && !weatherLower.includes('fog')) return false;
    if (condition.includes('cloud') && !weatherLower.includes('cloud')) return false;

    return true;
}

/**
 * Check season condition
 */
function checkSeasonCondition(skillSeason, raceSeason) {
    if (!raceSeason) return true;
    return skillSeason.toLowerCase() === raceSeason.toLowerCase();
}

/**
 * Check track-specific conditions
 */
function checkTrackCondition(condition, raceContext) {
    // Turn direction
    if (condition.includes('right_turn') && raceContext.turnDirection !== 'right') return false;
    if (condition.includes('left_turn') && raceContext.turnDirection !== 'left') return false;

    // Surface type
    if (condition.includes('grass') || condition.includes('cỏ')) {
        if (raceContext.surface !== 'Cỏ') return false;
    }
    if (condition.includes('dirt') || condition.includes('đất')) {
        if (raceContext.surface !== 'Đất') return false;
    }

    // Ground condition
    if (condition.includes('wet') || condition.includes('ướt')) {
        if (!raceContext.trackCondition || !raceContext.trackCondition.includes('wet')) return false;
    }
    if (condition.includes('firm') || condition.includes('cứng')) {
        if (raceContext.trackCondition && raceContext.trackCondition.includes('soft')) return false;
    }

    return true;
}

/**
 * Check gate/starting position condition
 */
function checkGateCondition(condition, gate) {
    if (condition.includes('gate_7') && gate !== 7) return false;
    if (condition.includes('outer_gate') && gate < 6) return false;
    if (condition.includes('inner_gate') && gate > 3) return false;

    return true;
}

/**
 * Check strategy-based conditions
 */
function checkStrategyCondition(condition, strategy) {
    if (!strategy) return true;

    const stratLower = strategy.toLowerCase();

    if (condition.includes('front_runner') && stratLower !== 'front') return false;
    if (condition.includes('stalker') && stratLower !== 'stalker') return false;
    if (condition.includes('pace_chaser') && stratLower !== 'chaser') return false;
    if (condition.includes('end_closer') && stratLower !== 'closer') return false;

    return true;
}

/**
 * Check special conditions (stamina, being overtaken, blocked, etc.)
 */
function checkSpecialConditions(condition, racer, raceContext) {
    // Stamina-based
    if (condition.includes('kiệt sức') || condition.includes('exhausted')) {
        if (racer.stamina > 30) return false;
    }

    // Being overtaken (would need to track previous position)
    if (condition.includes('overtaken') || condition.includes('bị vượt')) {
        // This needs to be tracked in race state
        if (!raceContext.wasOvertaken) return false;
    }

    // Blocked path
    if (condition.includes('blocked') || condition.includes('bị kẹt')) {
        // Would need to check surrounding racers
        if (!raceContext.isBlocked) return false;
    }

    // Surrounded/boxed in
    if (condition.includes('bao vây') || condition.includes('surrounded')) {
        if (!raceContext.isSurrounded) return false;
    }

    return true;
}

/**
 * Calculate effects of an activated skill
 * @param {Object} skill - The skill being activated
 * @param {Object} racer - The racer activating the skill
 * @param {Object} raceContext - Current race context
 * @returns {Object} - Effects object to apply
 */
function calculateSkillEffects(skill, racer, raceContext) {
    const effects = {
        speedBoost: 0,
        speedMultiplier: 0,
        staminaRecovery: 0,
        staminaReduction: 0,
        accelerationBoost: 0,
        powerBoost: 0,
        gutsBoost: 0,
        positioningBoost: 0,
        visionBoost: 0,
        focusBoost: 0
    };

    if (!skill.effects) return effects;

    const effectType = skill.effects.type;
    const effectValue = skill.effects.value || 0;

    switch (effectType) {
        case 'stamina_recovery':
            effects.staminaRecovery = effectValue;
            break;

        case 'speed_boost':
            // Convert percentage to absolute boost
            effects.speedBoost = effectValue * 100;
            break;

        case 'acceleration_boost':
            effects.accelerationBoost = effectValue * 100;
            break;

        case 'fatigue_reduction':
            // Reduces stamina usage
            effects.staminaReduction = effectValue * 20;
            break;

        case 'track_condition_boost':
        case 'season_bonus':
        case 'weather_bonus':
        case 'ground_condition_bonus':
            // These apply as speed multipliers
            effects.speedMultiplier = effectValue / 100;
            break;

        case 'positioning_boost':
            effects.positioningBoost = effectValue;
            break;

        case 'vision_boost':
            effects.visionBoost = effectValue;
            break;

        case 'focus_boost':
            effects.focusBoost = effectValue;
            break;

        case 'motivation_boost':
        case 'random_stat_boost':
            // Random bonus effects
            effects.speedMultiplier = (effectValue / 100) * (0.8 + Math.random() * 0.4);
            effects.staminaRecovery = effectValue / 10;
            break;

        case 'overtake_assist':
            effects.speedBoost = effectValue * 80;
            effects.accelerationBoost = effectValue * 60;
            break;

        case 'sprint_prep_boost':
            effects.accelerationBoost = effectValue * 120;
            break;

        case 'gate_bonus':
        case 'underdog_boost':
        case 'lone_wolf_bonus':
        case 'rival_bonus':
        case 'crowd_bonus':
            effects.speedMultiplier = effectValue / 100;
            effects.staminaRecovery = effectValue / 8;
            break;
    }

    // Apply rarity multiplier
    if (skill.rarity === 'Gold') {
        effects.speedBoost *= 1.2;
        effects.staminaRecovery *= 1.2;
        effects.accelerationBoost *= 1.2;
    } else if (skill.rarity === 'Rare') {
        effects.speedBoost *= 1.1;
        effects.staminaRecovery *= 1.1;
        effects.accelerationBoost *= 1.1;
    }

    return effects;
}

/**
 * Detect skill combos from activated skills
 * @param {Array} activatedSkills - Array of activated skill objects
 * @returns {Array} - Array of combo bonuses
 */
function detectCombos(activatedSkills) {
    const combos = [];

    if (!activatedSkills || activatedSkills.length < 2) return combos;

    // Define combo patterns
    const comboPatterns = [
        {
            name: 'Corner Master Combo',
            skills: ['Bậc Thầy Vào Cua', 'Giáo Sư Đường Cong', 'Chuyên Gia Đường Cong'],
            minMatch: 2,
            bonus: { speedMultiplier: 0.15, staminaRecovery: 5 }
        },
        {
            name: 'Speed Demon Combo',
            skills: ['Hoàn Hảo Thể Chất và Tinh Thần', 'Vào Cuộc!', 'Cơn Gió Thổi Mạnh!'],
            minMatch: 2,
            bonus: { speedMultiplier: 0.2, accelerationBoost: 50 }
        },
        {
            name: 'Endurance Combo',
            skills: ['Hít Thở Khí Trời', 'Bất Khuất', 'Ý Chí Sắt Đá'],
            minMatch: 2,
            bonus: { staminaRecovery: 10, fatigue_reduction: 0.2 }
        },
        {
            name: 'Comeback King',
            skills: ['Cơn Sốt Adrenaline', 'Không Thể Cản Tôi!', 'Thư Giãn'],
            minMatch: 2,
            bonus: { speedBoost: 150, staminaRecovery: 8 }
        },
        {
            name: 'Perfect Position',
            skills: ['Sự Tập Trung', 'Giác Quan Thứ Sáu', 'Bước Chân Tia Chớp'],
            minMatch: 2,
            bonus: { positioningBoost: 0.3, focusBoost: 1.0 }
        }
    ];

    const skillNames = activatedSkills.map(s => s.name);

    // Check each combo pattern
    comboPatterns.forEach(pattern => {
        const matchCount = pattern.skills.filter(s => skillNames.includes(s)).length;

        if (matchCount >= pattern.minMatch) {
            combos.push({
                name: pattern.name,
                matchCount,
                bonus: pattern.bonus
            });
        }
    });

    return combos;
}

/**
 * Apply skill effects and combos to a racer
 * @param {Object} racer - The racer object to modify
 * @param {Object} effects - Effects object from calculateSkillEffects
 * @param {Array} combos - Array of active combos
 */
function applyEffects(racer, effects, combos = []) {
    // Apply base skill effects
    racer.stamina = Math.min(100, racer.stamina + (effects.staminaRecovery || 0));
    racer.speed += effects.speedBoost || 0;
    racer.acceleration += effects.accelerationBoost || 0;

    // Apply multipliers
    if (effects.speedMultiplier) {
        racer.speed *= (1 + effects.speedMultiplier);
    }

    // Track active effects for display
    if (!racer.activeEffects) racer.activeEffects = [];

    if (effects.staminaRecovery > 0) {
        racer.activeEffects.push({ type: 'stamina_recovery', value: effects.staminaRecovery });
    }
    if (effects.speedBoost > 0) {
        racer.activeEffects.push({ type: 'speed_boost', value: effects.speedBoost });
    }

    // Apply combo bonuses
    combos.forEach(combo => {
        const bonus = combo.bonus;

        if (bonus.speedMultiplier) {
            racer.speed *= (1 + bonus.speedMultiplier);
        }
        if (bonus.speedBoost) {
            racer.speed += bonus.speedBoost;
        }
        if (bonus.staminaRecovery) {
            racer.stamina = Math.min(100, racer.stamina + bonus.staminaRecovery);
        }
        if (bonus.accelerationBoost) {
            racer.acceleration += bonus.accelerationBoost;
        }

        racer.activeEffects.push({ type: 'combo', name: combo.name });
    });
}

/**
 * Get skill by name from the skills database
 * @param {String} skillName - Name of the skill
 * @returns {Object} - Skill object or null
 */
function getSkillByName(skillName) {
    return allSkills.find(s => s.name === skillName) || null;
}

/**
 * Filter skills by rarity
 * @param {String} rarity - 'Common', 'Rare', or 'Gold'
 * @returns {Array} - Array of skills
 */
function getSkillsByRarity(rarity) {
    return allSkills.filter(s => s.rarity === rarity);
}

/**
 * Get recommended skills based on Uma's preferences
 * @param {Object} trackPreferences - Uma's track preferences
 * @param {Object} stats - Uma's stats
 * @returns {Array} - Array of recommended skill names
 */
function getRecommendedSkills(trackPreferences, stats) {
    const recommendations = [];

    // Based on distance preferences
    if (trackPreferences.sprint === 'A' || trackPreferences.sprint === 'A+' || trackPreferences.sprint === 'S') {
        recommendations.push('Thành Thạo Đường Thẳng', 'Vội Vã Đoạn Cuối', 'Cơn Gió Thổi Mạnh!');
    }
    if (trackPreferences.long === 'A' || trackPreferences.long === 'A+' || trackPreferences.long === 'S') {
        recommendations.push('Hít Thở Khí Trời', 'Cơn Sốt Adrenaline', 'Người Mở Đường');
    }

    // Based on strategy preferences
    if (trackPreferences.front === 'A' || trackPreferences.front === 'A+' || trackPreferences.front === 'S') {
        recommendations.push('Giác Quan Thứ Sáu', 'Bồn Chồn (Restless)');
    }
    if (trackPreferences.closer === 'A' || trackPreferences.closer === 'A+' || trackPreferences.closer === 'S') {
        recommendations.push('Thư Giãn', 'Sư Tử Ngủ Yên');
    }

    // Based on stats
    if (stats.stamina < 600) {
        recommendations.push('Bậc Thầy Vào Cua', 'Hồi Phục Trên Đường Thẳng');
    }
    if (stats.speed > 800) {
        recommendations.push('Hoàn Hảo Thể Chất và Tinh Thần', 'Vào Cuộc!');
    }
    if (stats.wit > 700) {
        recommendations.push('Sự Tập Trung', 'Nhãn Quan Siêu Phàm');
    }

    // Return unique recommendations
    return [...new Set(recommendations)].slice(0, 5);
}

module.exports = {
    canActivateSkill,
    calculateSkillEffects,
    detectCombos,
    applyEffects,
    getSkillByName,
    getSkillsByRarity,
    getRecommendedSkills,
    allSkills
};
