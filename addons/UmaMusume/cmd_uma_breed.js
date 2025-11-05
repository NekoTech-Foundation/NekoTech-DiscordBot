const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const UmaPlayer = require('./schemas/UmaPlayer');
const UmaMusume = require('./schemas/UmaMusume');
const umaData = require('./umaData');

const statEmojis = {
  speed: '<:speed:1435601053436612740>',
  stamina: '<:stamina:1435601056573685860>',
  power: '<:power:1435601051561492530>',
  guts: '<:guts:1435601048822747167>',
  wit: '<:wit:1435601060004757555>',
};

function getEmoji(statName) {
  return statEmojis[statName] || '';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_breed')
    .setDescription('Lai tạo hai Mã nương của bạn để tạo ra một Mã nương mới.')
    .addStringOption(option => option.setName('father_name').setDescription('Tên của Mã nương cha.').setRequired(true))
    .addStringOption(option => option.setName('mother_name').setDescription('Tên của Mã nương mẹ.').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const fatherName = interaction.options.getString('father_name');
    const motherName = interaction.options.getString('mother_name');

    if (fatherName === motherName) {
      return interaction.reply({ content: 'Bạn không thể lai tạo một Mã nương với chính nó.', ephemeral: true });
    }

    const father = await UmaMusume.findOne({ ownerId: userId, name: fatherName });
    const mother = await UmaMusume.findOne({ ownerId: userId, name: motherName });

    if (!father || !mother) {
      return interaction.reply({ content: 'Một hoặc cả hai Mã nương cha/mẹ không tìm thấy hoặc không thuộc sở hữu của bạn.', ephemeral: true });
    }

    const newUmaName = umaData.filter(u => u.tier === 1)[Math.floor(Math.random() * umaData.filter(u => u.tier === 1).length)].name;

    const baseStats = 100;
    const stats = { speed: 0, stamina: 0, power: 0, guts: 0, wit: 0 };
    let remainingStats = baseStats;
    const statNames = ['speed', 'stamina', 'power', 'guts', 'wit'];

    while (remainingStats > 0) {
      const randomStatIndex = Math.floor(Math.random() * statNames.length);
      stats[statNames[randomStatIndex]]++;
      remainingStats--;
    }

    for (const stat of statNames) {
      stats[stat] += Math.floor((father.stats[stat] + mother.stats[stat]) * 0.1);
    }

    const newUma = new UmaMusume({
      ownerId: userId,
      name: newUmaName,
      tier: 1,
      stats: stats,
      trackAptitude: { turf: 'G', dirt: 'G' },
      distanceAptitude: { sprint: 'G', mile: 'G', medium: 'G', long: 'G' },
      strategyAptitude: { runner: 'G', leader: 'G', betweener: 'G', chaser: 'G' },
      growthRate: { speed: 0, stamina: 0, power: 0, guts: 0, wit: 0 },
      skillPoints: 0,
      skills: [],
    });
    await newUma.save();

    const umaPlayer = await UmaPlayer.findOne({ userId: userId });
    umaPlayer.umas.push(newUma._id);
    await umaPlayer.save();

    const breedEmbed = new EmbedBuilder()
      .setTitle('Một Mã nương mới đã ra đời!')
      .setDescription(`Bạn đã lai tạo thành công một Mã nương mới: ${newUma.name}.`)
      .addFields(
        { name: '<:speed:1435601053436612740> Tốc độ', value: newUma.stats.speed.toString(), inline: true },
        { name: '<:stamina:1435601056573685860> Sức bền', value: newUma.stats.stamina.toString(), inline: true },
        { name: '<:power:1435601051561492530> Sức mạnh', value: newUma.stats.power.toString(), inline: true },
        { name: '<:guts:1435601048822747167> Tinh thần', value: newUma.stats.guts.toString(), inline: true },
        { name: '<:wit:1435601060004757555> Khôn ngoan', value: newUma.stats.wit.toString(), inline: true }
      )
      .setColor('Pink');

    await interaction.reply({ embeds: [breedEmbed] });
  }
};