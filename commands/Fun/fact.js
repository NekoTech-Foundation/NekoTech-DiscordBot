/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |  | | | | (_| |   < (_) | | |_) | (_) | |_ 
 | |__| | | | (_| |_|\_\___/  |____/ \___/ \__|
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
        .setName('fact')
        .setDescription('Get a random fact.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('cat')
                .setDescription('Get a random cat fact'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dog')
                .setDescription('Get a random dog fact'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('general')
                .setDescription('Get a random general fact'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('useless')
                .setDescription('Get a random useless fact')),
    category: 'Fun',
    async execute(interaction, client) {
        try {
            await interaction.deferReply();

            let fact;
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'cat') {
                const response = await fetch('https://catfact.ninja/fact?max_length=140');
                const data = await response.json();
                fact = data.fact;
            } else if (subcommand === 'dog') {
                const response = await fetch('https://dog-api.kinduff.com/api/facts?number=1');
                const data = await response.json();
                fact = data.facts[0];
            } else if (subcommand === 'general') {
                const response = await fetch('https://api.popcat.xyz/fact');
                const data = await response.json();
                fact = data.fact;
            } else if (subcommand === 'useless') {
                const response = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random');
                const data = await response.json();
                fact = data.text;
            }

            interaction.editReply({ content: `**🎲 RANDOM FACT**\n${fact}` });
        } catch (error) {
            console.error("Error fetching fact: ", error);
            interaction.editReply({ content: 'Sorry, I couldn\'t fetch a fact at the moment.' });
        }
    }
};