const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require("discord.js");
const marrySchema = require('../../models/marrySchema.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('together')
    .setDescription('Tình cảm nồng đậm... (aliases: yeuem, yeuanh, iuem, iuanh, loveyou, iuxop)'),
  async execute(interaction) {
    try {
      const BanSchema = require('../../models/BanSchema');
      const ban = await BanSchema.findOne({ memberid: interaction.user.id });
      if (ban) return interaction.reply({ content: 'Bạn đã bị cấm sử dụng lệnh này.', ephemeral: true });

      const husband = interaction.user;
      const data = await marrySchema.findOne({ authorid: husband.id });

      if (!data) {
        return interaction.reply({ content: `Yêu thì cưới đi chời! Nói suông...`, ephemeral: true });
      }

      const wifeId = data.wifeid;
      const lovedata = await marrySchema.findOne({ authorid: wifeId });

      if (!lovedata) {
        // Data inconsistency
        return interaction.reply({ content: "Dữ liệu người ấy của bạn không tìm thấy.", ephemeral: true });
      }

      const currentAffection = data.together || 0;
      const newAffection = currentAffection + 1;

      data.together = newAffection;
      lovedata.together = newAffection;

      await data.save();
      await lovedata.save();

      const customMessages = {
        "715020568017109122": `>>> **Òi oi, <@${husband.id}> đã thơm má <@${wifeId}> được __${newAffection}__ lần gòi kìa !**`,
        "696893548863422494": `u là trời, <@${husband.id}> đã vừa đấm vừa xoa <@${wifeId}> được **__${newAffection}__** lần rồi kìa !`,
        "620860299356143657": `>>> **Òi oi, <@${husband.id}> đã thơm má <@${wifeId}> được __${newAffection}__ lần gòi kìa !**`
      };

      const response = customMessages[husband.id] || `Dữ vậy chời... <@${husband.id}> đã nói lời yêu với <@${wifeId}>! Hai bạn được **${newAffection}** điểm thân mật~ <a:heart:912046879662030969> `;

      await interaction.reply(response);

    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "Đã có lỗi xảy ra, vui lòng thử lại sau.", ephemeral: true });
    }
  }
};