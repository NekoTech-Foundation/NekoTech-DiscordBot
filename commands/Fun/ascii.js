/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
                                        
 Thank you for choosing Drako Bot!

 Should you encounter any issues, require assistance, or have suggestions for improving the bot,
 we invite you to connect with us on our Discord server and create a support ticket: 

 http://discord.drakodevelopment.net
 
*/

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const figlet = require('figlet');
const fs = require('fs');
const path = require('path');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

function wordWrap(text, maxLength) {
    let wrapped = '';
    let words = text.split(' ');
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length < maxLength) {
            currentLine += `${word} `;
        } else {
            wrapped += `${currentLine}\n`;
            currentLine = `${word} `;
        }
    });

    wrapped += currentLine;
    return wrapped.trim();
}

const fontSizeMapping = {
    'small': 'Small',
    'medium': 'Standard',
    'large': 'Big'
};

function convertSimplePatternToRegex(simplePattern) {
    let regexPattern = simplePattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`, 'i');
}

async function checkBlacklistWords(content) {
    const blacklistRegex = config.BlacklistWords.Patterns.map(pattern => convertSimplePatternToRegex(pattern));
    return blacklistRegex.some(regex => regex.test(content));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ascii')
        .setDescription('Create ASCII text')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The text you want converted')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('size')
                .setDescription('Font size')
                .setRequired(false)
                .addChoices(
                    { name: 'Small', value: 'small' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Large', value: 'large' }
            )),
    category: 'Fun',
    async execute(interaction) {
        let text = interaction.options.getString('text');
        const sizeChoice = interaction.options.getString('size') || 'medium';

        if (await checkBlacklistWords(text)) {
            const blacklistMessage = lang.BlacklistWords && lang.BlacklistWords.Message
                ? lang.BlacklistWords.Message.replace(/{user}/g, `${interaction.user}`)
                : 'Your text contains blacklisted words.';
            return interaction.reply({ content: blacklistMessage, flags: MessageFlags.Ephemeral });
        }

        text = wordWrap(text, 25);

        figlet(text, {
            font: fontSizeMapping[sizeChoice],
            horizontalLayout: 'default',
            verticalLayout: 'default'
        }, (err, data) => {
            if (err) {
                console.error('Something went wrong with figlet...');
                console.dir(err);
                return interaction.reply('Failed to convert text into ASCII art, please try again.');
            }
            if (data.length > 2000) {
                return interaction.reply('The generated ASCII art is too long for Discord!');
            }
            interaction.reply(`\`\`\`${data}\`\`\``);
        });
    },
};