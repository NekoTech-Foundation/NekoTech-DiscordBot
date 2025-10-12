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
const { translate } = require('@vitalets/google-translate-api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Translate text to another language')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The text to translate')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('target')
                .setDescription('The target language (e.g., "es" for Spanish, "fr" for French)')
                .setRequired(true)),
    category: 'Utility',
    async execute(interaction) {
        const textToTranslate = interaction.options.getString('text');
        const targetLanguage = interaction.options.getString('target');

        try {
            const result = await translate(textToTranslate, { to: targetLanguage });

            await interaction.reply({
                content: `Translated text: ${result.text}`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Translation error:', error);
            await interaction.reply({
                content: 'An error occurred while translating the text.',
                flags: MessageFlags.Ephemeral
            });
        }
    },
};