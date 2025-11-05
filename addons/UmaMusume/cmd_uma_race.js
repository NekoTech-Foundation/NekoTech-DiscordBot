const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const UmaPlayer = require('./schemas/UmaPlayer');
const UmaMusume = require('./schemas/UmaMusume');
const umaRaces = require('./umaRaces');
const EconomyUserData = require('../../models/EconomyUserData');

function getRandomRaces() {
  const races = [];
  for (let i = 0; i < 3; i++) {
    races.push(umaRaces[Math.floor(Math.random() * umaRaces.length)]);
  }
  return races;
}

// Simplified race simulation
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
    .setName('uma_race')
    .setDescription('Enter your Uma Musume in a race.')
    .addStringOption(option => option.setName('id').setDescription('The ID of the Uma Musume to race.').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const umaId = interaction.options.getString('id');

    const targetUma = await UmaMusume.findOne({ ownerId: userId, _id: { $regex: new RegExp(umaId + '$', 'i') } });

    if (!targetUma) {
      return interaction.reply({ content: 'Uma Musume not found or does not belong to you. Please use the last 5 characters of the ID.', ephemeral: true });
    }

    const randomRaces = getRandomRaces();

    const row = new ActionRowBuilder();
    const raceEmbed = new EmbedBuilder()
      .setTitle(`Choose a race for ${targetUma.name}`)
      .setColor('Purple');

    randomRaces.forEach((race, index) => {
      raceEmbed.addFields({ name: `${race.name} (${race.distance}m ${race.track})`, value: `Rec. Stamina: ${race.stamina}` });
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`race_${index}`)
          .setLabel(race.name)
          .setStyle(ButtonStyle.Primary)
      );
    });

    const message = await interaction.reply({ embeds: [raceEmbed], components: [row], ephemeral: true });

    const filter = i => i.user.id === userId && i.customId.startsWith('race_');
    const collector = message.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      const raceIndex = parseInt(i.customId.split('_')[1]);
      const selectedRace = randomRaces[raceIndex];

      const playerScore = simulateRace(targetUma, selectedRace);

      // Generate NPC opponents
      const opponents = [];
      for (let j = 0; j < 11; j++) {
        const opponentScore = (playerScore * ((Math.random() * 0.4) + 0.8)); // opponent score is between 80% and 120% of player score
        opponents.push({ name: `NPC ${j + 1}`, score: opponentScore });
      }

      const allRacers = [{ name: targetUma.name, score: playerScore }, ...opponents];
      allRacers.sort((a, b) => b.score - a.score);

      const playerRank = allRacers.findIndex(racer => racer.name === targetUma.name) + 1;

      let coinReward = 0;
      let spReward = 0;

      if (playerRank === 1) {
        coinReward = 1000;
        spReward = 50;
      } else if (playerRank <= 3) {
        coinReward = 500;
        spReward = 25;
      } else if (playerRank <= 5) {
        coinReward = 200;
        spReward = 10;
      }

      let playerEconomy = await EconomyUserData.findOne({ userId: userId });
      if (!playerEconomy) {
        playerEconomy = new EconomyUserData({ userId: userId });
      }
      playerEconomy.money += coinReward;
      await playerEconomy.save();

      targetUma.skillPoints += spReward;
      await targetUma.save();

      const resultEmbed = new EmbedBuilder()
        .setTitle(`Race Results: ${selectedRace.name}`)
        .setDescription(`You placed ${playerRank} out of 12!`)
        .addFields(
          { name: 'Coins Gained', value: coinReward.toString(), inline: true },
          { name: 'SP Gained', value: spReward.toString(), inline: true }
        )
        .setColor(playerRank === 1 ? 'Gold' : (playerRank <= 3 ? 'Silver' : 'Bronze'));

      await i.update({ embeds: [resultEmbed], components: [] });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: 'You did not select a race in time.', embeds: [], components: [] });
      }
    });
  }
};