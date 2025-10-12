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
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('darkjoke')
        .setDescription('Câu đùa hài hước,chắc vậy...'),
    category: 'Fun',
    async execute(interaction, client) {
        try {
            const darkjokes = lang.darkjokes.messages;
            const darkjoke = darkjokes[Math.floor(Math.random() * darkjokes.length)];
            interaction.reply({
                content: `**🤣 CÂU ĐÙA HÀI HƯỚC**\n${darkjoke}`
            });
        } catch (error) {
            console.error("Error in darkjoke command: ", error);
            interaction.reply({ content: 'Sorry, I couldn\'t fetch a dark joke at the moment.' });
        }
    }
};