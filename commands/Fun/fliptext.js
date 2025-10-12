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
const fs = require('fs');
const yaml = require("js-yaml");
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const mapping = '¡"#$%⅋,)(*+\'-˙/0ƖᄅƐㄣϛ9ㄥ86:;<=>?@∀qƆpƎℲפHIſʞ˥WNOԀQɹS┴∩ΛMX⅄Z[/]^_`ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz{|}~';
const OFFSET = '!'.charCodeAt(0);

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
        .setName('fliptext')
        .setDescription('Flip text upside down')
        .addStringOption(option => option.setName('text').setDescription('The text to flip upside down').setRequired(true)),
    category: 'Fun',
    async execute(interaction, client) {
        try {
            let text = interaction.options.getString("text");

            if (await checkBlacklistWords(text)) {
                const blacklistMessage = lang.BlacklistWords && lang.BlacklistWords.Message
                    ? lang.BlacklistWords.Message.replace(/{user}/g, `${interaction.user}`)
                    : 'Your text contains blacklisted words.';
                return interaction.reply({ content: blacklistMessage, flags: MessageFlags.Ephemeral });
            }

            const flippedText = text.split('').map(c => c.charCodeAt(0) - OFFSET).map(c => mapping[c] || ' ').reverse().join('');
            interaction.reply({ content: flippedText });
        } catch (error) {
            console.error("Error in fliptext command: ", error);
            interaction.reply({ content: 'Sorry, there was an error flipping the text.' });
        }
    }
};