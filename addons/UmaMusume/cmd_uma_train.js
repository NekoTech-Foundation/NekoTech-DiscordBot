const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const UmaPlayer = require('./schemas/UmaPlayer');
const UmaMusume = require('./schemas/UmaMusume');

const trainCooldown = 5 * 60 * 1000; // 5 minutes

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
    .setName('uma_train')
    .setDescription('Huấn luyện Mã nương của bạn.')
    .addStringOption(option => option.setName('name').setDescription('Tên của Mã nương để huấn luyện.').setRequired(true))
    .addStringOption(option =>
      option.setName('stat')
        .setDescription('Chỉ số để huấn luyện.')
        .setRequired(true)
        .addChoices(
          { name: 'Tốc độ', value: 'speed' },
          { name: 'Sức bền', value: 'stamina' },
          { name: 'Sức mạnh', value: 'power' },
          { name: 'Tinh thần', value: 'guts' },
          { name: 'Khôn ngoan', value: 'wit' }
        )),
  async execute(interaction) {
    const userId = interaction.user.id;
    const umaName = interaction.options.getString('name');
    const statToTrain = interaction.options.getString('stat');

    const umaPlayer = await UmaPlayer.findOne({ userId: userId });
    if (!umaPlayer) {
      return interaction.reply({ content: 'Bạn chưa có hồ sơ. Dùng `/uma gacha` để bắt đầu.', ephemeral: true });
    }

    const now = new Date();
    if (now - umaPlayer.lastTrain < trainCooldown) {
      const remainingTime = Math.ceil((trainCooldown - (now - umaPlayer.lastTrain)) / 1000 / 60);
      return interaction.reply({ content: `Bạn cần đợi ${remainingTime} phút nữa để huấn luyện lại.`, ephemeral: true });
    }

    if (umaPlayer.energy < 10 && umaPlayer.trainingTickets < 1) {
      return interaction.reply({ content: 'Bạn không có đủ năng lượng hoặc vé huấn luyện để huấn luyện.', ephemeral: true });
    }

    const targetUma = await UmaMusume.findOne({ ownerId: userId, name: umaName });

    if (!targetUma) {
      return interaction.reply({ content: `Không tìm thấy Mã nương có tên \"${umaName}\" hoặc không thuộc sở hữu của bạn.`, ephemeral: true });
    }

    let energyUsed = 0;
    let ticketsUsed = 0;

    if (umaPlayer.energy >= 10) {
      umaPlayer.energy -= 10;
      energyUsed = 10;
    } else {
      umaPlayer.trainingTickets -= 1;
      ticketsUsed = 1;
    }

    umaPlayer.lastTrain = now;
    await umaPlayer.save();

    const rand = Math.random();
    let successRate = 'Thành công!';
    let statIncrease = 10;
    let secondaryStatIncrease = 3;
    let spGained = 5;

    if (rand < 0.1) { // 10% chance of failure
      successRate = 'Thất bại!';
      statIncrease = 0;
      secondaryStatIncrease = 0;
      spGained = 0;
    } else if (rand < 0.3) { // 20% chance of great success (0.1 + 0.2 = 0.3)
      successRate = 'Thành công lớn!';
      statIncrease = 20;
      secondaryStatIncrease = 6;
      spGained = 10;
    }

    targetUma.stats[statToTrain] += statIncrease;

    const secondaryStats = ['speed', 'stamina', 'power', 'guts', 'wit'].filter(s => s !== statToTrain);
    const randomSecondaryStat = secondaryStats[Math.floor(Math.random() * secondaryStats.length)];
    targetUma.stats[randomSecondaryStat] += secondaryStatIncrease;

    targetUma.skillPoints += spGained;
    await targetUma.save();

    const trainEmbed = new EmbedBuilder()
      .setTitle(`Huấn luyện ${targetUma.name}`)
      .setDescription(successRate)
      .addFields(
        { name: `${getEmoji(statToTrain)} Chỉ số được huấn luyện: ${statToTrain.charAt(0).toUpperCase() + statToTrain.slice(1)}`, value: `+${statIncrease}`, inline: true },
        { name: `${getEmoji(randomSecondaryStat)} Chỉ số phụ: ${randomSecondaryStat.charAt(0).toUpperCase() + randomSecondaryStat.slice(1)}`, value: `+${secondaryStatIncrease}`, inline: true },
        { name: 'Điểm kỹ năng nhận được', value: `+${spGained}`, inline: true },
        { name: 'Năng lượng đã dùng', value: energyUsed.toString(), inline: true },
        { name: 'Vé huấn luyện đã dùng', value: ticketsUsed.toString(), inline: true }
      )
      .setColor(successRate === 'Thất bại!' ? 'Red' : (successRate === 'Thành công lớn!' ? 'Gold' : 'Green'));

    await interaction.reply({ embeds: [trainEmbed] });
  }
};