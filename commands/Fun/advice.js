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
const yaml = require("js-yaml");
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('advice')
        .setDescription(`Get random advice`),
    category: 'Fun',
    async execute(interaction, client) {
        try {
            await interaction.deferReply();
            let response = await fetch('http://api.adviceslip.com/advice');
            let advice = await response.json();
            interaction.editReply({ content: advice.slip.advice });
        } catch (error) {
            console.error("Error fetching advice: ", error);
            interaction.editReply({ content: 'Sorry, I couldn\'t fetch any advice at the moment.' });
        }
    }
}