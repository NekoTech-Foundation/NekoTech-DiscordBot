const { SlashCommandBuilder } = require('@discordjs/builders');
const marrySchema = require('../../models/marrySchema.js');
const anhcuoi = require(`../../models/anhcuoi.js`)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('background')
    .setDescription('Sửa Ảnh Cưới! (aliases: anhcuoi, hinhcuoi)')
    .addStringOption(option =>
      option.setName('link')
        .setDescription('Link ảnh cưới của bạn')
        .setRequired(true)),
  async execute(interaction) {
    try {
      const BanSchema = require('../../models/BanSchema')
      const ban = await BanSchema.findOne({ memberid: interaction.user.id })
      if (ban) {
        return interaction.reply({ content: 'Bạn đã bị cấm sử dụng lệnh này.', ephemeral: true });
      }
      
      let link = interaction.options.getString('link');
      if (!link || !link.startsWith('http')) {
        return interaction.reply({ content: "**Xin hãy nhập link có định dạng: https://**", ephemeral: true });
      }

      const husband = interaction.user;
      const data = await marrySchema.findOne({ authorid: husband.id });
      if (!data) return interaction.reply({ content: `Chưa cưới mà đã đòi chụp hình cưới...`, ephemeral: true });

      await anhcuoi.deleteMany({ $or: [{ authorid: husband.id }, { authorid: data.wifeid }] });

      const newAnhCuoi1 = new anhcuoi({ authorid: husband.id, wifeid: data.wifeid, anhcuoi: link });
      await newAnhCuoi1.save();

      const newAnhCuoi2 = new anhcuoi({ authorid: data.wifeid, wifeid: husband.id, anhcuoi: link });
      await newAnhCuoi2.save();

      await interaction.reply(`<:Yquyxu:941244934797799434> | **${husband.username}** đã thay đổi ảnh cưới : ${link}`);
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "Đã có lỗi xảy ra, vui lòng thử lại sau.", ephemeral: true });
    }
  }
}