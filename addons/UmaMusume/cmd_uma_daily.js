const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const UmaPlayer = require('./schemas/UmaPlayer');

const dailyCooldown = 22 * 60 * 60 * 1000; // 22 hours
const energyReward = 100;
const ticketReward = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_daily')
    .setDescription('Nhận năng lượng và vé huấn luyện hàng ngày của bạn.'),
  async execute(interaction) {
    const userId = interaction.user.id;

    let umaPlayer = await UmaPlayer.findOne({ userId: userId });
    if (!umaPlayer) {
      umaPlayer = new UmaPlayer({ userId: userId });
    }

    const now = new Date();
    if (now - umaPlayer.daily < dailyCooldown) {
      const remainingTime = Math.ceil((dailyCooldown - (now - umaPlayer.daily)) / 1000 / 60 / 60);
      return interaction.reply({ content: `Bạn đã nhận phần thưởng hàng ngày. Bạn có thể nhận lại sau ${remainingTime} giờ nữa.`, ephemeral: true });
    }

    umaPlayer.energy += energyReward;
    umaPlayer.trainingTickets += ticketReward;
    umaPlayer.daily = now;
    await umaPlayer.save();

    const dailyEmbed = new EmbedBuilder()
      .setTitle('Đã nhận phần thưởng hàng ngày!')
      .setDescription('Bạn đã nhận được năng lượng và vé huấn luyện hàng ngày.')
      .addFields(
        { name: 'Năng lượng nhận được', value: energyReward.toString(), inline: true },
        { name: 'Vé huấn luyện nhận được', value: ticketReward.toString(), inline: true }
      )
      .setColor('Gold');

    await interaction.reply({ embeds: [dailyEmbed] });
  }
};