const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const UmaPlayer = require('./schemas/UmaPlayer');
const UmaMusume = require('./schemas/UmaMusume');
const EconomyUserData = require('../../models/EconomyUserData');

// Simplified race simulation (can be the same as in cmd_uma_race.js)
function simulateRace(uma, race) {
  let score = 0;
  score += uma.stats.speed * 1.5;
  score += uma.stats.stamina * (race.distance / 1000);
  score += uma.stats.power;
  score += uma.stats.guts * 0.5;
  score += uma.stats.wit * 0.8;

  // Aptitude bonus
  if (uma.trackAptitude[race.track] === 'A') score *= 1.1;
  if (uma.trackAptitude[race.track] === 'S') score *= 1.2;

  // Add some randomness
  score *= (Math.random() * 0.2) + 0.9; // between 0.9 and 1.1

  return score;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_pvp')
    .setDescription('Challenge another player to a race.')
    .addStringOption(option => option.setName('name').setDescription('The name of your Uma Musume.').setRequired(true))
    .addUserOption(option => option.setName('opponent').setDescription('The player you want to challenge.').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const opponentUser = interaction.options.getUser('opponent');
    const opponentId = opponentUser.id;
    const umaName = interaction.options.getString('name');

    if (userId === opponentId) {
      return interaction.reply({ content: 'You cannot challenge yourself!', ephemeral: true });
    }

    const userUma = await UmaMusume.findOne({ ownerId: userId, name: umaName });

    if (!userUma) {
      return interaction.reply({ content: `Your Uma Musume with name \"${umaName}\" was not found.`, ephemeral: true });
    }

    const opponentPlayer = await UmaPlayer.findOne({ userId: opponentId }).populate('favoriteUma');

    if (!opponentPlayer || !opponentPlayer.favoriteUma) {
      return interaction.reply({ content: `${opponentUser.username} has not set a favorite Uma Musume to race with.`, ephemeral: true });
    }

    const opponentUma = opponentPlayer.favoriteUma;

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accept_pvp')
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('decline_pvp')
          .setLabel('Decline')
          .setStyle(ButtonStyle.Danger)
      );

    const challengeEmbed = new EmbedBuilder()
      .setTitle('PvP Challenge!')
      .setDescription(`${interaction.user.username} has challenged you to a race!`)
      .addFields(
        { name: 'Your Opponent', value: `${interaction.user.username} with ${userUma.name}` },
        { name: 'Your Uma Musume', value: `${opponentUma.name}` }
      )
      .setColor('Fuchsia');

    const message = await interaction.reply({ content: `${opponentUser}`, embeds: [challengeEmbed], components: [row] });

    const filter = i => (i.customId === 'accept_pvp' || i.customId === 'decline_pvp') && i.user.id === opponentId;
    const collector = message.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'decline_pvp') {
        return i.update({ content: 'The challenge has been declined.', embeds: [], components: [] });
      }

      // Race starts
      const race = { distance: 2000, track: 'turf' }; // Simplified race for now

      const userScore = simulateRace(userUma, race);
      const opponentScore = simulateRace(opponentUma, race);

      const winner = userScore > opponentScore ? userUma : opponentUma;
      const loser = userScore > opponentScore ? opponentUma : userUma;
      const winnerUser = userScore > opponentScore ? interaction.user : opponentUser;

      let winnerEconomy = await EconomyUserData.findOne({ userId: winnerUser.id });
      if (!winnerEconomy) {
        winnerEconomy = new EconomyUserData({ userId: winnerUser.id });
      }
      winnerEconomy.money += 250; // Small reward for winning
      await winnerEconomy.save();

      const resultEmbed = new EmbedBuilder()
        .setTitle('PvP Race Result!')
        .setDescription(`${winner.name} (${winnerUser.username}) has defeated ${loser.name}!`)
        .setColor('Gold');

      await i.update({ embeds: [resultEmbed], components: [] });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: 'The challenge was not answered in time.', embeds: [], components: [] });
      }
    });
  }
};