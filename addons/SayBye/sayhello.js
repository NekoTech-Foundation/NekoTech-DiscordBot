const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sayhello')
        .setDescription('Sends a message 30 times in a row.'),
    category: 'Fun',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        await interaction.reply({ content: 'Starting to say hello...', flags: MessageFlags.Ephemeral });

        for (let i = 0; i < 30; i++) {
            await interaction.channel.send('https://discord.gg/96hgDj4b4j');
            await sleep(1000); // Wait for 1 second
        }
    }
};