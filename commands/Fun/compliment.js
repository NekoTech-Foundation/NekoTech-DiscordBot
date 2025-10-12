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
        .setName('compliment')
        .setDescription('Gửi lời khen ngẫu nhiên cho ai đó!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Gửi lời khen')
                .setRequired(true)),
    category: 'Fun',
    async execute(interaction, client) {
        const user = interaction.options.getUser('user');

        const compliments = lang.compliments.messages;
        const compliment = compliments[Math.floor(Math.random() * compliments.length)];

        await interaction.reply(`<@${user.id}>, ${compliment}`);
    }
};