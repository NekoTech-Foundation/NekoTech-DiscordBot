// Uma Musume Utility Functions

/**
 * Calculate rank based on total stats
 */
function calculateRank(stats) {
    const total = stats.speed + stats.stamina + stats.power + stats.guts + stats.wit;
    
    if (total >= 5500) return 'UF9';
    if (total >= 5300) return 'UF7';
    if (total >= 5000) return 'UF5';
    if (total >= 4800) return 'UF3';
    if (total >= 4500) return 'UF1';
    if (total >= 4300) return 'UE9';
    if (total >= 4100) return 'UE7';
    if (total >= 3900) return 'UE5';
    if (total >= 3700) return 'UE3';
    if (total >= 3500) return 'UE1';
    if (total >= 3300) return 'UG9';
    if (total >= 3100) return 'UG7';
    if (total >= 2900) return 'UG5';
    if (total >= 2700) return 'UG3';
    if (total >= 2500) return 'UG1';
    if (total >= 2300) return 'U9';
    if (total >= 2200) return 'U7';
    if (total >= 2100) return 'U5';
    if (total >= 2000) return 'U3';
    if (total >= 1900) return 'U1';
    if (total >= 1800) return 'SS+';
    if (total >= 1700) return 'SS';
    if (total >= 1600) return 'S+';
    if (total >= 1500) return 'S';
    if (total >= 1400) return 'A+';
    if (total >= 1300) return 'A';
    if (total >= 1200) return 'B+';
    if (total >= 1100) return 'B';
    if (total >= 1000) return 'C+';
    if (total >= 900) return 'C';
    if (total >= 800) return 'D';
    if (total >= 700) return 'E';
    if (total >= 600) return 'F';
    return 'G';
}

/**
 * Generate random stats based on tier
 */
function generateStats(tier, umaData) {
    const baseTotals = {
        1: 100,
        2: 150,
        3: 210
    };
    
    const total = baseTotals[tier] || 100;
    
    const stats = {
        speed: 0,
        stamina: 0,
        power: 0,
        guts: 0,
        wit: 0
    };
    
    let remaining = total;
    const statNames = ['speed', 'stamina', 'power', 'guts', 'wit'];
    
    // Distribute stats with weighted randomness
    for (let i = 0; i < statNames.length - 1; i++) {
        const min = Math.floor(remaining / (statNames.length - i) * 0.7);
        const max = Math.floor(remaining / (statNames.length - i) * 1.3);
        const value = Math.floor(Math.random() * (max - min + 1)) + min;
        
        stats[statNames[i]] = value;
        remaining -= value;
    }
    
    stats[statNames[statNames.length - 1]] = remaining;
    
    return stats;
}

/**
 * Generate track preferences based on stats
 */
function generateTrackPreferences(stats) {
    const ranks = ['G', 'F', 'E', 'D', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S'];
    
    const getPreference = (value) => {
        if (value >= 1000) return 'S';
        if (value >= 900) return 'A+';
        if (value >= 800) return 'A';
        if (value >= 700) return 'B+';
        if (value >= 600) return 'B';
        if (value >= 500) return 'C+';
        if (value >= 400) return 'C';
        if (value >= 300) return 'D';
        if (value >= 200) return 'E';
        if (value >= 100) return 'F';
        return 'G';
    };
    
    // Surface preferences
    const grassPref = getPreference(stats.speed + stats.wit);
    const dirtPref = getPreference(stats.power + stats.guts);
    
    // Distance preferences
    const sprintPref = getPreference(stats.speed + stats.power);
    const milePref = getPreference(stats.speed + stats.wit);
    const mediumPref = getPreference(stats.speed + stats.stamina * 0.5);
    const longPref = getPreference(stats.stamina + stats.guts);
    
    // Style preferences
    const frontPref = getPreference(stats.speed + stats.power);
    const stalkerPref = getPreference(stats.speed + stats.wit);
    const closerPref = getPreference(stats.stamina + stats.power);
    const chaserPref = getPreference(stats.stamina + stats.guts);
    
    return {
        grass: grassPref,
        dirt: dirtPref,
        sprint: sprintPref,
        mile: milePref,
        medium: mediumPref,
        long: longPref,
        front: frontPref,
        stalker: stalkerPref,
        closer: closerPref,
        chaser: chaserPref
    };
}

/**
 * Format track preferences for display
 */
function formatTrackPreferences(prefs) {
    return `Đường cỏ: ${prefs.grass}, Đường đất: ${prefs.dirt}
Chạy nước rút: ${prefs.sprint}, Dặm: ${prefs.mile}
Trung bình: ${prefs.medium}, Dài: ${prefs.long}
Trước: ${prefs.front}, Tốc độ: ${prefs.stalker}
Sau: ${prefs.closer}, Về đích: ${prefs.chaser}`;
}

/**
 * Generate bonus percentages
 */
function generateBonuses(tier) {
    const bonuses = {
        powerBonus: 0,
        witBonus: 0,
        speedBonus: 0,
        staminaBonus: 0,
        gutsBonus: 0
    };
    
    const bonusTypes = ['powerBonus', 'witBonus', 'speedBonus', 'staminaBonus', 'gutsBonus'];
    const numBonuses = tier === 3 ? 2 : tier === 2 ? 1 : 0;
    
    for (let i = 0; i < numBonuses; i++) {
        const type = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
        bonuses[type] += (Math.floor(Math.random() * 3) + 1) * 10; // 10%, 20%, or 30%
    }
    
    return bonuses;
}

/**
 * Format bonuses for display
 */
function formatBonuses(bonuses) {
    const parts = [];
    if (bonuses.powerBonus > 0) parts.push(`POW +${bonuses.powerBonus}%`);
    if (bonuses.witBonus > 0) parts.push(`WIT +${bonuses.witBonus}%`);
    if (bonuses.speedBonus > 0) parts.push(`SPD +${bonuses.speedBonus}%`);
    if (bonuses.staminaBonus > 0) parts.push(`STA +${bonuses.staminaBonus}%`);
    if (bonuses.gutsBonus > 0) parts.push(`GUT +${bonuses.gutsBonus}%`);
    
    return parts.length > 0 ? parts.join(' ') : 'Không có bonus';
}

/**
 * Simulate a race
 */
function simulateRace(uma, race) {
    const stats = uma.stats;
    const prefs = uma.trackPreferences;
    
    // Base score from stats
    let score = stats.speed * 3 + stats.stamina * 2.5 + stats.power * 2 + stats.wit * 1.5 + stats.guts * 1;
    
    // Apply bonuses
    if (uma.bonuses) {
        score += stats.power * (uma.bonuses.powerBonus / 100);
        score += stats.wit * (uma.bonuses.witBonus / 100);
        score += stats.speed * (uma.bonuses.speedBonus / 100);
        score += stats.stamina * (uma.bonuses.staminaBonus / 100);
        score += stats.guts * (uma.bonuses.gutsBonus / 100);
    }
    
    // Apply surface preference
    if (race.surface === 'Cỏ' && prefs.grass) {
        const multiplier = getPreferenceMultiplier(prefs.grass);
        score *= multiplier;
    } else if (race.surface === 'Đất' && prefs.dirt) {
        const multiplier = getPreferenceMultiplier(prefs.dirt);
        score *= multiplier;
    }
    
    // Apply distance preference
    if (race.distance <= 1400 && prefs.sprint) {
        score *= getPreferenceMultiplier(prefs.sprint);
    } else if (race.distance <= 1800 && prefs.mile) {
        score *= getPreferenceMultiplier(prefs.mile);
    } else if (race.distance <= 2400 && prefs.medium) {
        score *= getPreferenceMultiplier(prefs.medium);
    } else if (race.distance > 2400 && prefs.long) {
        score *= getPreferenceMultiplier(prefs.long);
    }
    
    // Apply skills
    if (uma.skills && uma.skills.length > 0) {
        uma.skills.forEach(skill => {
            if (skill.effects && skill.effects.type === 'stat_boost') {
                score += skill.effects.value * 10;
            } else if (skill.effects) {
                score += skill.effects.value * 5;
            }
        });
    }
    
    // Random factor
    score *= (0.9 + Math.random() * 0.2);
    
    // Generate position (1-12)
    const totalRacers = 12;
    const position = Math.max(1, Math.min(totalRacers, Math.floor(13 - (score / 1000))));
    
    return {
        score,
        position,
        totalRacers
    };
}

/**
 * Get preference multiplier
 */
function getPreferenceMultiplier(pref) {
    const multipliers = {
        'S': 1.5,
        'A+': 1.4,
        'A': 1.3,
        'B+': 1.2,
        'B': 1.1,
        'C+': 1.05,
        'C': 1.0,
        'D': 0.95,
        'E': 0.9,
        'F': 0.85,
        'G': 0.8
    };
    
    return multipliers[pref] || 1.0;
}

/**
 * Convert rank to color
 */
function getRankColor(rank) {
    if (rank.startsWith('U')) return '#FF00FF';
    if (rank.startsWith('SS')) return '#FFD700';
    if (rank.startsWith('S')) return '#FFA500';
    if (rank.startsWith('A')) return '#00FF00';
    if (rank.startsWith('B')) return '#0000FF';
    if (rank.startsWith('C')) return '#FFFFFF';
    return '#808080';
}

module.exports = {
    calculateRank,
    generateStats,
    generateTrackPreferences,
    formatTrackPreferences,
    generateBonuses,
    formatBonuses,
    simulateRace,
    getPreferenceMultiplier,
    getRankColor
};
