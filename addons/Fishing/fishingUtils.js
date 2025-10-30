const fishingSchema = require('./schemas/fishingSchema');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

let config;

function loadConfig() {
    if (!config) {
        const configPath = path.join(__dirname, 'config.yml');
        config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    }
    return config;
}

async function getUserFishing(userId) {
    let userFishing = await fishingSchema.findOne({ userId });
    if (!userFishing) {
        // If user is brand new, create a new document with the correct structure
        userFishing = new fishingSchema({ userId, inventory: [], baits: [], rods: [] });
        await userFishing.save();
    } else {
        // If user exists, check if they have the old data structure
        if (typeof userFishing.rods === 'undefined') {
            userFishing.rods = [];
            // Immediately save the document to fix the structure in the DB
            await userFishing.save();
        }
    }
    return userFishing;
}

module.exports = { loadConfig, getUserFishing };
