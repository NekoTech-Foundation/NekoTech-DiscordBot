const farmGlobalSchema = require('./schemas/farmGlobalSchema');
const { getRandomEvent } = require('./farmEvents');

async function getGlobalWeather() {
    let globalState = await farmGlobalSchema.findOne({ identifier: 'global' });

    if (!globalState) {
        globalState = await farmGlobalSchema.create({
            currentWeather: getRandomEvent(),
            weatherStartTime: Date.now(),
            weatherEndTime: Date.now() + 3600000 // 1 hour duration
        });
    }

    // Check if weather expired
    if (Date.now() > globalState.weatherEndTime) {
        const newEvent = getRandomEvent();
        globalState.currentWeather = newEvent;
        globalState.weatherStartTime = Date.now();

        // Random duration between 30 mins and 4 hours
        // 30m = 1800000, 4h = 14400000
        const duration = Math.floor(Math.random() * (14400000 - 1800000 + 1)) + 1800000;
        globalState.weatherEndTime = Date.now() + duration;

        // Randomize mutation chance for this event execution (User Request: 5-45%)
        // Only if the event supports increased mutations (or just randomly for any event?)
        // User request: "khi diễn ra sự kiện đột biến" (when mutation event happens)
        // Activate mutation chance for any weather with mutationChance effect
        if (newEvent.effect && newEvent.effect.mutationChance > 0) {
            // Scale mutation rate based on the weather's mutationChance multiplier
            // Low multipliers (0.5) = ~5-15%, High multipliers (7.0) = ~40-80%
            const baseMin = 0.05;
            const baseMax = 0.15;
            const multiplier = newEvent.effect.mutationChance;
            const scaledMin = Math.min(0.80, baseMin * multiplier);
            const scaledMax = Math.min(0.90, baseMax * multiplier);
            const rate = Math.random() * (scaledMax - scaledMin) + scaledMin;
            globalState.activeMutationRate = rate;
        } else {
            globalState.activeMutationRate = 0.0; // or null, but 0.0 is safe
        }

        await globalState.save();
    }

    return globalState;
}

module.exports = { getGlobalWeather };
