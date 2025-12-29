const { startHourlyFishScheduler } = require('./hourlyFish');
const colors = require('ansi-colors');
const { loadConfig } = require('./fishingUtils');

// This function will be called by the main addon loader in utils.js
// It's used for initializing background tasks or schedulers for the addon.
function run(client) {
    console.log(`${colors.blue('[Fishing Addon]')} Đang tải Addons...`);
    const config = loadConfig();
    let totalFishCount = 0;
    for (const rarity in config.fish_pools) {
        totalFishCount += config.fish_pools[rarity].length;
    }
    console.log(`${colors.blue('[Fishing Addon]')} Đã import ${totalFishCount} loài cá.`);
    startHourlyFishScheduler(client);
    console.log(`${colors.green('[Fishing Addon]')} Tác vụ nền đã hoạt động,addons sẽ hoạt động.`);
}

module.exports = {
    run
};
