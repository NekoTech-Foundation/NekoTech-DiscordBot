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

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pickupline')
        .setDescription('Get a random pickup line'),
    category: 'Fun',
    async execute(interaction) {
        await interaction.deferReply();


        const getRandomColor = () => {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        };

        try {
            const response = await fetch('https://api.popcat.xyz/pickuplines');
            if (!response.ok) {
                throw new Error('Failed to fetch pickup line, API might be down or busy.');
            }
            const json = await response.json();
            const pickupline = json.pickupline;

            const embed = new EmbedBuilder()
                .setTitle(`💘 Pickup Line`)
                .setDescription(pickupline)
                .setColor(getRandomColor())

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching pickup line:', error);
            await interaction.editReply({
                content: 'Sorry, I couldn\'t fetch a pickup line at the moment. Please try again later.',
            });
        }
    },
};