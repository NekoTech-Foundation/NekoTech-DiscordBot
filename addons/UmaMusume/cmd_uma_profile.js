const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const UmaPlayer = require('./schemas/UmaPlayer');
const UmaMusume = require('./schemas/UmaMusume');
const EconomyUserData = require('../../models/EconomyUserData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_profile')
    .setDescription('Xem hồ sơ Uma Musume của bạn.')
    .addUserOption(option => option.setName('user').setDescription('Người dùng mà bạn muốn xem hồ sơ.').setRequired(false)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const targetId = targetUser.id;

    const umaPlayer = await UmaPlayer.findOne({ userId: targetId }).populate('favoriteUma');
    const playerEconomy = await EconomyUserData.findOne({ userId: targetId });

    if (!umaPlayer) {
      return interaction.reply({ content: `${targetUser.username} chưa chơi game Uma Musume.`, ephemeral: true });
    }

    const totalUmas = await UmaMusume.countDocuments({ ownerId: targetId });

    const profileEmbed = new EmbedBuilder()
      .setTitle(`Hồ sơ của ${targetUser.username}`)
      .addFields(
        { name: 'Xu', value: (playerEconomy?.money || 0).toString(), inline: true },
        { name: 'Tổng số Mã nương', value: totalUmas.toString(), inline: true },
        { name: 'Mã nương yêu thích', value: umaPlayer.favoriteUma ? `${umaPlayer.favoriteUma.name} (#${umaPlayer.favoriteUma._id.toString().slice(-5)})` : 'Chưa đặt', inline: false }
      )
      .setColor('Green');

    await interaction.reply({ embeds: [profileEmbed] });
  }
};
