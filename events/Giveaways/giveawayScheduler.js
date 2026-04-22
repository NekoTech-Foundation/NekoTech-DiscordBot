const Giveaway = require('../../models/Giveaway.js');

const fs = require("fs");
const yaml = require("js-yaml");
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();

async function checkGiveaways() {
    try {
        const validGuildId = config.GuildID;

        const giveaways = await Giveaway.find({ ended: false });
        const now = Date.now();

        for (const giveaway of giveaways) {
            try {
                if (giveaway.guildId !== validGuildId) {
                    await Giveaway.deleteOne({ giveawayId: giveaway.giveawayId });
                    console.log(`Deleted giveaway ${giveaway.giveawayId} from invalid guild ${giveaway.guildId}`);
                    continue;
                }

                if (now > giveaway.endAt) {
                    // Resolve actions lazily to avoid startup circular dependency.
                    const { endGiveaway } = require('./giveawayActions.js');
                    if (typeof endGiveaway !== 'function') {
                        throw new TypeError('giveawayActions.endGiveaway is not a function');
                    }
                    await endGiveaway(giveaway.giveawayId);
                }
            } catch (error) {
                console.error(`Error processing giveaway ${giveaway.giveawayId}:`, error);
            }
        }
    } catch (findError) {
        console.error('Error fetching giveaways:', findError);
    }
}

function startGiveawayScheduler() {
    const checkIntervalInSeconds = config.Giveaways.GiveawayStatusCheck / 1000;
    const checkIntervalInMilliseconds = checkIntervalInSeconds * 1000;
    setInterval(checkGiveaways, checkIntervalInMilliseconds);
}

module.exports = startGiveawayScheduler;