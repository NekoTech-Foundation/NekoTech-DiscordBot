const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const UmaPlayer = require('./schemas/UmaPlayer');
const UmaMusume = require('./schemas/UmaMusume');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_champions_meeting')
    .setDescription('Participate in the Champions Meeting.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set_defense')
        .setDescription('Set your defense team for the Champions Meeting.')
        .addStringOption(option => option.setName('uma1_name').setDescription('The name of your first Uma Musume.').setRequired(true))
        .addStringOption(option => option.setName('uma2_name').setDescription('The name of your second Uma Musume.').setRequired(true))
        .addStringOption(option => option.setName('uma3_name').setDescription('The name of your third Uma Musume.').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('challenge')
        .setDescription('Challenge another player\'s defense team.')
        .addUserOption(option => option.setName('opponent').setDescription('The player to challenge.').setRequired(true))
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (subcommand === 'set_defense') {
      const uma1Name = interaction.options.getString('uma1_name');
      const uma2Name = interaction.options.getString('uma2_name');
      const uma3Name = interaction.options.getString('uma3_name');

      const umaNames = [uma1Name, uma2Name, uma3Name];
      const defenseTeam = [];

      for (const umaName of umaNames) {
        const targetUma = await UmaMusume.findOne({ ownerId: userId, name: umaName });
        if (!targetUma) {
          return interaction.reply({ content: `Uma Musume with name \"${umaName}\" not found or does not belong to you.`, ephemeral: true });
        }
        defenseTeam.push(targetUma._id);
      }

      let umaPlayer = await UmaPlayer.findOne({ userId: userId });
      if (!umaPlayer) {
        umaPlayer = new UmaPlayer({ userId: userId });
      }

      umaPlayer.defenseTeam = defenseTeam;
      await umaPlayer.save();

      const defenseEmbed = new EmbedBuilder()
        .setTitle('Defense Team Set!')
        .setDescription('Your Champions Meeting defense team has been updated.')
        .setColor('Blue');

      await interaction.reply({ embeds: [defenseEmbed], ephemeral: true });
    } else if (subcommand === 'challenge') {
      // Challenge logic will be implemented later
      await interaction.reply({ content: 'The challenge feature is not yet implemented.', ephemeral: true });
    }
  }
};
