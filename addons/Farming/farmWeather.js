const farmGlobalSchema = require('./schemas/farmGlobalSchema');
const { getRandomEvent } = require('./farmEvents');

async function getGlobalWeather() {
    let globalState = await farmGlobalSchema.findOne({ identifier: 'global' });

    if (!globalState) {
        globalState = new farmGlobalSchema({
            currentWeather: getRandomEvent(),
            weatherStartTime: Date.now(),
            weatherEndTime: Date.now() + 3600000 // 1 hour duration
        });
        await globalState.save();
    }

    // Check if weather expired
    if (Date.now() > globalState.weatherEndTime) {
        globalState.currentWeather = getRandomEvent();
        globalState.weatherStartTime = Date.now();
        // Random duration between 30 mins and 2 hours
        const duration = Math.floor(Math.random() * (7200000 - 1800000 + 1)) + 1800000;
        globalState.weatherEndTime = Date.now() + duration;
        await globalState.save();
    }

    return globalState;
}

module.exports = { getGlobalWeather };
