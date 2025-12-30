const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
require('dotenv').config(); // Add this line back

const { getLangSync, getLang } = require('./langLoader');

const CONFIG_PATH = path.join(__dirname, '..', 'config.yml');
const COMMANDS_PATH = path.join(__dirname, '..', 'commands.yml');

let configCache = null;
let commandsCache = null;

function loadAllConfigs() {
    try {
        configCache = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
        
        commandsCache = yaml.load(fs.readFileSync(COMMANDS_PATH, 'utf8'));
        
        return true;
    } catch (error) {
        console.error('[ConfigLoader] Failed to load configuration files:', error);
        return false;
    }
}

const getConfig = () => {
    if (!configCache) {
        loadAllConfigs();
    }
    return configCache;
};

const getCommands = () => {
    if (!commandsCache) {
        loadAllConfigs();
    }
    return commandsCache;
};

loadAllConfigs();

module.exports = {
    getConfig,
    getLang,
    getCommands
}; 