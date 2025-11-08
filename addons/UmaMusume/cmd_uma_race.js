const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

function simulateRace(uma, race) {
  let score = 0;
  score += uma.stats.speed * 1.5;
  score += uma.stats.stamina * (race.distance / 1000);
  score += uma.stats.power;
  score += uma.stats.guts * 0.5;
  score += uma.stats.wit * 0.8;

  if (uma.trackAptitude[race.track] === 'A') score *= 1.1;
  if (uma.trackAptitude[race.track] === 'S') score *= 1.2;

  score *= (Math.random() * 0.2) + 0.9;

  return score;
}

async function handleRaceSelection(interaction, targetUma) {
    const randomRaces = getRandomRaces();
    const userId = interaction.user.id;

    const row = new ActionRowBuilder();
    const raceEmbed = new EmbedBuilder()
        .setTitle(`Choose a race for ${targetUma.name}`)
        .setColor('Purple');

    randomRaces.forEach((race, index) => {
        raceEmbed.addFields({ name: `${race.name} (${race.distance}m ${race.track})`, value: `Rec. Stamina: ${race.stamina}` });
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`race_${index}_${targetUma._id}`)
                .setLabel(race.name)
                .setStyle(ButtonStyle.Primary)
        );
    });

    await interaction.update({ embeds: [raceEmbed], components: [row], content: null });

    const filter = i => i.user.id === userId && i.customId.startsWith('race_');
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async i => {
        const [_, raceIndex, umaId] = i.customId.split('_');
        if (umaId !== targetUma._id.toString()) return;

        const selectedRace = randomRaces[parseInt(raceIndex)];
        const playerScore = simulateRace(targetUma, selectedRace);

        const opponents = Array.from({ length: 11 }, (_, j) => ({
            name: `NPC ${j + 1}`,
            score: playerScore * ((Math.random() * 0.4) + 0.8)
        }));

        const allRacers = [{ name: targetUma.name, score: playerScore }, ...opponents];
        allRacers.sort((a, b) => b.score - a.score);

        const playerRank = allRacers.findIndex(racer => racer.name === targetUma.name) + 1;

        let coinReward = 0;
        let spReward = 0;

        if (playerRank === 1) { coinReward = 1000; spReward = 50; }
        else if (playerRank <= 3) { coinReward = 500; spReward = 25; }
        else if (playerRank <= 5) { coinReward = 200; spReward = 10; }

        await EconomyUserData.findOneAndUpdate(
            { userId },
            { $inc: { money: coinReward } },
            { upsert: true, new: true }
        );

        targetUma.skillPoints += spReward;
        await targetUma.save();

        const resultEmbed = new EmbedBuilder()
            .setTitle(`Race Results: ${selectedRace.name}`)
            .setDescription(`You placed ${playerRank} out of 12!`)
            .addFields(
                { name: 'Coins Gained', value: coinReward.toString(), inline: true },
                { name: 'SP Gained', value: spReward.toString(), inline: true }
            )
            .setColor(playerRank === 1 ? 'Gold' : (playerRank <= 3 ? 'Silver' : '#CD7F32'));

        await i.update({ embeds: [resultEmbed], components: [] });
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            interaction.editReply({ content: 'You did not select a race in time.', embeds: [], components: [] });
        }
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uma_race')
        .setDescription('Select one of your Uma Musume to enter in a race.'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const userUmas = await UmaMusume.find({ ownerId: userId, retired: false });

        if (userUmas.length === 0) {
            return interaction.reply({ content: 'You have no Uma Musume to race.', flags: [64] });
        }

        const options = userUmas.map(uma => ({
            label: uma.name,
            description: `ID: ...${uma._id.toString().slice(-5)}`,
            value: uma._id.toString(),
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('uma_race_select')
            .setPlaceholder('Select an Uma Musume to race')
            .addOptions(options.slice(0, 25));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const message = await interaction.reply({
            content: 'Please select an Uma Musume to race.',
            components: [row],
            flags: [64],
        });

        const filter = i => i.customId === 'uma_race_select' && i.user.id === userId;
        const collector = message.createMessageComponentCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async i => {
            const selectedUmaId = i.values[0];
            const targetUma = await UmaMusume.findById(selectedUmaId);
            if (!targetUma) {
                return i.update({ content: 'Error selecting Uma Musume.', components: [], embeds: [] });
            }
            await handleRaceSelection(i, targetUma);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ content: 'You did not make a selection in time.', components: [] });
            }
        });
    }
};