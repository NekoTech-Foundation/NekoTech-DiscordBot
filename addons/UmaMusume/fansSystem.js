/**
 * Helper functions for the fans system in Uma Musume careers mode
 */

const tracksData = require('./tracksAndRaces.json');

/**
 * Calculate fan gain based on race position and race tier
 * @param {Number} position - Finish position (1-12)
 * @param {Object} race - Race object with difficulty
 * @param {Number} raceDifficulty - Race difficulty level
 * @returns {Number} - Fans gained
 */
function calculateFanGain(position, race, raceDifficulty = null) {
    const difficulty = raceDifficulty || race?.difficulty || 5;
    const baseFans = difficulty * 200;

    // Position multipliers
    if (position === 1) return baseFans; // Winner gets full fans
    if (position === 2) return Math.floor(baseFans * 0.6); // 2nd place
    if (position === 3) return Math.floor(baseFans * 0.4); // 3rd place
    if (position <= 5) return Math.floor(baseFans * 0.2); // 4th-5th
    if (position <= 8) return Math.floor(baseFans * 0.1); // 6th-8th

    return 0; // No fans for positions 9+
}

/**
 * Check if Uma has enough fans for a race
 * @param {Number} currentFans - Current fan count
 * @param {Object} race - Race object
 * @returns {Object} - { hasEnough, required, missing }
 */
function checkFanRequirement(currentFans, race) {
    const required = race?.requirements?.fans || 0;
    const hasEnough = currentFans >= required;
    const missing = hasEnough ? 0 : required - currentFans;

    return {
        hasEnough,
        required,
        missing,
        current: currentFans
    };
}

/**
 * Get available races that Uma can participate in based on fan count
 * @param {Number} currentFans - Current fan count
 * @param {Number} maxDifficulty - Maximum difficulty to show (optional)
 * @returns {Array} - Array of available race objects
 */
function getAvailableRaces(currentFans, maxDifficulty = null) {
    const allRaces = tracksData.races || [];

    return allRaces.filter(race => {
        const fanReq = race?.requirements?.fans || 0;
        const difficulty = race?.difficulty || 5;

        // Must have enough fans
        if (currentFans < fanReq) return false;

        // Check max difficulty if specified
        if (maxDifficulty !== null && difficulty > maxDifficulty) return false;

        return true;
    });
}

/**
 * Get races to build fans (lower tier races available)
 * @param {Number} currentFans - Current fan count
 * @param {Number} targetFans - Target fans needed
 * @returns {Array} - Array of races that can help build fans
 */
function getFanBuildingRaces(currentFans, targetFans = null) {
    const allRaces = tracksData.races || [];

    // Get races that are accessible with current fans
    const accessible = allRaces.filter(race => {
        const fanReq = race?.requirements?.fans || 0;
        return currentFans >= fanReq;
    });

    // Sort by difficulty (easier races first for fan building)
    accessible.sort((a, b) => (a.difficulty || 5) - (b.difficulty || 5));

    return accessible.slice(0, 5); // Return top 5 accessible races
}

/**
 * Format fan count for display
 * @param {Number} fans - Fan count
 * @returns {String} - Formatted string with emoji
 */
function formatFans(fans) {
    if (fans >= 100000) return `👥 ${(fans / 1000).toFixed(1)}K`;
    if (fans >= 10000) return `👥 ${(fans / 1000).toFixed(0)}K`;
    if (fans >= 1000) return `👥 ${fans.toLocaleString()}`;
    return `👥 ${fans}`;
}

/**
 * Get next race in career progression
 * @param {Number} currentRaceIndex - Current race index in career
 * @param {Array} careerRaceList - List of races in the career
 * @returns {Object} - Next race object or null
 */
function getNextCareerRace(currentRaceIndex, careerRaceList) {
    if (!careerRaceList || currentRaceIndex >= careerRaceList.length) {
        return null;
    }

    const nextRaceId = careerRaceList[currentRaceIndex];
    return tracksData.races.find(r => r.id === nextRaceId) || null;
}

/**
 * Check if career should end due to lack of fans (3 days before race)
 * @param {Number} daysUntilRace - Days remaining until race
 * @param {Number} currentFans - Current fans
 * @param {Number} requiredFans - Required fans for race
 * @returns {Boolean} - Whether career should end
 */
function shouldEndCareerForFans(daysUntilRace, currentFans, requiredFans) {
    // If within 3 days of race and don't have enough fans, career ends
    if (daysUntilRace >= 0 && daysUntilRace <= 3) {
        if (currentFans < requiredFans) {
            return true;
        }
    }

    return false;
}

module.exports = {
    calculateFanGain,
    checkFanRequirement,
    getAvailableRaces,
    getFanBuildingRaces,
    formatFans,
    getNextCareerRace,
    shouldEndCareerForFans
};
