const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription(`Example addon command`),
    async execute(interaction, client) {
        await interaction.reply({ 
            content: `This is a test command from the example addon.`, 
            flags: MessageFlags.Ephemeral
        });
    }
}