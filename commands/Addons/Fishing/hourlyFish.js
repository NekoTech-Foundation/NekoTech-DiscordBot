const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG_PATH = path.join(__dirname, 'config.yml');
const HOURLY_FISH_PATH = path.join(__dirname, 'current_hourly.json');

function loadFishingConfig() {
    try {
        const configFile = fs.readFileSync(CONFIG_PATH, 'utf8');
        return yaml.load(configFile);
    } catch (error) {
        console.error('[Fishing Addon] Error loading config.yml:', error);
        return null;
    }
}

function updateHourlyFish() {
    const config = loadFishingConfig();
    if (!config || !config.fish_pools) {
        console.error('[Fishing Addon] fish_pools not found in config.');
        return;
    }

    const { legendary, epic } = config.fish_pools;

    if (!legendary || legendary.length === 0 || !epic || epic.length === 0) {
        console.error('[Fishing Addon] Legendary or Epic fish pools are empty.');
        return;
    }

    const randomLegendary = legendary[Math.floor(Math.random() * legendary.length)];
    const randomEpic = epic[Math.floor(Math.random() * epic.length)];

    const hourlyData = {
        legendary: randomLegendary,
        epic: randomEpic,
        updatedAt: new Date().toISOString(),
    };

    try {
        fs.writeFileSync(HOURLY_FISH_PATH, JSON.stringify(hourlyData, null, 2));
        console.log(`[Fishing Addon] Updated hourly fish: ${randomLegendary.name} (Legendary), ${randomEpic.name} (Epic)`);
    } catch (error) {
        console.error('[Fishing Addon] Error writing to current_hourly.json:', error);
    }
}

function startHourlyFishScheduler() {
    // Schedule to run at the beginning of every hour
    cron.schedule('0 * * * *', () => {
        console.log('[Fishing Addon] Running hourly fish update...');
        updateHourlyFish();
    }, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh"
    });

    // Run once immediately on startup
    console.log('[Fishing Addon] Performing initial hourly fish update...');
    updateHourlyFish();
}

module.exports = { startHourlyFishScheduler, updateHourlyFish };
