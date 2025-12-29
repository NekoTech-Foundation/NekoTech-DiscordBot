const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [] });
client.slashCommands = new Collection();
global.slashCommands = []; // Mock global

// Mock config to avoid crash
global.config = { CommandsEnabled: true };

// Verify utils.js regex logic
function getFilesRecursively(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFilesRecursively(filePath, fileList);
        } else {
            if (file.endsWith('.js')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

const commandFiles = getFilesRecursively(path.join(__dirname, 'commands'));
const categories = {};
const commands = [];

commandFiles.forEach(file => {
    try {
        // Clear cache to ensure fresh load
        delete require.cache[require.resolve(file)];
        const command = require(file);
        
        let category = 'unknown'; 
        
        // Replicate utils.js logic exactly
        const folderNameMatch = file.match(/[\\\/]commands[\\\/]([^\\\/]+)/);
        const folderName = folderNameMatch ? folderNameMatch[1] : 'unknown';
        
        category = folderName;
        if (folderName === 'Addons') {
             const addonMatch = file.match(/[\\\/]commands[\\\/]Addons[\\\/]([^\\\/]+)/);
             if (addonMatch) {
                 category = addonMatch[1];
             }
        }

        const finalCategory = command.category || category;
        
        if (!categories[finalCategory]) categories[finalCategory] = 0;
        categories[finalCategory]++;
        
        commands.push({
            name: command.data?.name || command.name || 'unknown',
            file: path.relative(__dirname, file),
            category: finalCategory,
            folderName: folderName
        });

    } catch (e) {
        // Ignore errors, we just want to see properties
    }
});

console.log('--- Categories Summary ---');
console.log(categories);

console.log('\n--- "unknown" Category Commands ---');
commands.filter(c => c.category === 'unknown').forEach(c => console.log(`${c.name} (${c.file})`));

console.log('\n--- "Chung" Category Commands (if any) ---');
commands.filter(c => c.category === 'Chung').forEach(c => console.log(`${c.name} (${c.file})`));

console.log('\n--- "General" Category Commands ---');
commands.filter(c => c.category === 'General').forEach(c => console.log(`${c.name} (${c.file})`));
