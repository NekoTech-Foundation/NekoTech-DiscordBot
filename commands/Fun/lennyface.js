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

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lennyface')
        .setDescription(`Get a random lenny face`),
    category: 'Fun',
    async execute(interaction, client) {
        const lennyFaces = [
            "( ͡° ͜ʖ ͡°)",
            "ʘ‿ʘ",
            "(◑‿◐)",
            "( ͡~ ͜ʖ ͡°)",
            "( ° ͜ʖ °)",
            "( ͠° ͟ʖ ͡°)",
            "(͠≖ ͜ʖ͠≖)",
            "ʕ ͡° ʖ̯ ͡°ʔ",
            "(◕‿◕)╭∩╮",
            "( ͡ʘ ͜ʖ ͡ʘ)",
            "( ͡° ᴥ ͡°)",
            "( ͡♥ ͜ʖ ͡♥)",
            "( ͡ ͡° ͜つ ͡͡° )",
            "(☭ ͜ʖ ☭)",
            "༼ ͡ ◕ ͜ ʖ ◕͡ ༽",
            "( ͡°╭͜ʖ╮ ͡°)",
            "¯\\\\_(ツ)_/¯",
            "¯\\\\_( ͡° ͜ʖ ͡°)_/¯",
            "凸༼ຈل͜ຈ༽凸",
            "( ͡° ل͜ ͡°)",
            "(͡• ͜໒ ͡• )",
            "(☞ ͡° ͜ʖ ͡°)☞",
            "( ͝° ͜ʖ͡°)",
            "┏(-_-)┛",
            "( ಠ ͜ʖಠ)",
            "( ͡ಥ ͜ʖ ͡ಥ)",
            "ಥ_ಥ",
            "(ಠ_ರೃ)",
            "( ͡ຈ╭͜ʖ╮͡ຈ )",
            "ᕙ(▀̿ĺ̯▀̿ ̿)ᕗ",
            "( ͡° ͜ʖ ͡°)╭∩╮",
            "(✿❦ ͜ʖ ❦)",
            "(✿ ♡‿♡)",
            "♥╣[-_-]╠♥",
            "(-‿◦☀)",
            "(⌐□_□)",
            "( ͡°👅 ͡°)",
            "╲⎝⧹ ( ͡° ͜ʖ ͡°) ⎠╱",
            "[̲̅$̲̅(̲̅ ͡° ͜ʖ ͡°̲̅)̲̅$̲̅]",
            "(╬ಠ益ಠ)",
            "( ◔ ʖ̯ ◔ )",
            "◕‿↼",
            "( ͡°( ͡° ͜ʖ( ͡° ͜ʖ ͡°)ʖ ͡°) ͡°)",
            "( ཀ ʖ̯ ཀ)",
            "(｢•-•)｢ ʷʱʸ?"
          ];

        const randomLenny = lennyFaces[Math.floor(Math.random() * lennyFaces.length)];

        await interaction.reply(randomLenny);
    }
}