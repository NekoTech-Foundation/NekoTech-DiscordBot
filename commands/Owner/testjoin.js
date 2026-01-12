const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const guildCreate = require('../../events/guildCreate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testjoin')
        .setDescription('Test the guild join embed event')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: 'Owner',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Simulate the client and guild objects
        const client = interaction.client;
        const guild = interaction.guild;

        // Call the event handler directly
        try {
            await guildCreate(client, guild);
            await interaction.editReply('Simulated guild join event! Check the system channel or the first available text channel.');
        } catch (error) {
            console.error(error);
            await interaction.editReply(`Error simulating event: ${error.message}`);
        }
    }
};
