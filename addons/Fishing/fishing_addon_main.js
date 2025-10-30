const { startHourlyFishScheduler } = require('./hourlyFish');
const colors = require('ansi-colors');

// This function will be called by the main addon loader in utils.js
// It's used for initializing background tasks or schedulers for the addon.
function run(client) {
    console.log(`${colors.blue('[Fishing Addon]')} Initializing background services...`);
    startHourlyFishScheduler(client);
    console.log(`${colors.green('[Fishing Addon]')} Background services initialized successfully.`);
}

module.exports = {
    run
};
