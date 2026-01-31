const fs = require('fs');
const path = require('path');

const WEATHER_STATES = ['Sunny', 'Rain', 'Storm'];
const WEATHER_DURATION = 4 * 60 * 60 * 1000; // 4 Hours

let currentWeather = 'Sunny';
let nextWeatherChange = Date.now() + WEATHER_DURATION;

// Simple in-memory storage, resets on bot restart (or could save to file)
// For now, let's keep it simple in-memory but allow it to persist via formatted JSON if needed in future.

function updateWeather() {
    const now = Date.now();
    if (now >= nextWeatherChange) {
        // Random new weather
        // Sunny: 50%, Rain: 35%, Storm: 15%
        const rand = Math.random();
        if (rand < 0.5) currentWeather = 'Sunny';
        else if (rand < 0.85) currentWeather = 'Rain';
        else currentWeather = 'Storm';

        nextWeatherChange = now + WEATHER_DURATION;
        console.log(`[Weather] Changed to ${currentWeather}. Next change in 4h.`);
    }
}

function getWeather() {
    updateWeather();
    return {
        current: currentWeather,
        nextChange: nextWeatherChange,
        emoji: currentWeather === 'Sunny' ? '☀️' : currentWeather === 'Rain' ? '🌧️' : '⛈️',
        description: currentWeather === 'Sunny' ? 'Trời đẹp, biển lặng.' :
            currentWeather === 'Rain' ? 'Mưa rơi, cá nổi nhiều hơn!' :
                'Bão lớn! Nguy hiểm nhưng có cá khủng!'
    };
}

// Force set for testing
function setWeather(weather) {
    if (WEATHER_STATES.includes(weather)) {
        currentWeather = weather;
        nextWeatherChange = Date.now() + WEATHER_DURATION;
    }
}

module.exports = {
    getWeather,
    setWeather
};
