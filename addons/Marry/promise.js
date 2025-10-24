const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require("discord.js");
const marrySchema = require('../../models/marrySchema.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promise')
    .setDescription('Thề non hẹn biển... (alias: loihua)')
    .addStringOption(option =>
      option.setName('loi_hua')
        .setDescription('Lời hứa của bạn')
        .setRequired(true)),
  async execute(interaction) {
    try {
      const BanSchema = require('../../models/BanSchema');
      const ban = await BanSchema.findOne({ memberid: interaction.user.id });
      if (ban) return interaction.reply({ content: 'Bạn đã bị cấm sử dụng lệnh này.', ephemeral: true });

      const husband = interaction.user;
      const data = await marrySchema.findOne({ authorid: husband.id });

      if (!data) {
        return interaction.reply({ content: `Chưa cưới mà đã thề non hẹn biển...`, ephemeral: true });
      }

      const newPromise = interaction.options.getString('loi_hua');
      if (!newPromise) {
        return interaction.reply({ content: "Bạn muốn hứa điều gì?", ephemeral: true });
      }

      const oldPromise = data.loihua;
      data.loihua = newPromise;
      await data.save();

      await interaction.reply(`<:Yquyxu:941244934797799434> | **${husband.username}** đã thay đổi lời hứa của mình thành: **${newPromise}**`);

    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "Đã có lỗi xảy ra, vui lòng thử lại sau.", ephemeral: true });
    }
  }
};