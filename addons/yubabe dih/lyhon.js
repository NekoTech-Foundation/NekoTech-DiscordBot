const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const marrySchema = require('../../models/marrySchema.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyhon')
    .setDescription('Đường Ai Nấy Đi...'),
  async execute(interaction) {
    const { client } = interaction;
    try {
      const BanSchema = require('../../models/BanSchema')
      const ban = await BanSchema.findOne({ memberid: interaction.user.id })
      if (ban) {
        return interaction.reply({ content: 'Bạn đã bị cấm sử dụng lệnh này.', ephemeral: true });
      }

      const authorId = interaction.user.id;
      const data = await marrySchema.findOne({ authorid: authorId });

      if (!data) {
        return interaction.reply({ content: `Đồ F.A`, ephemeral: true });
      }

      const wifeId = data.wifeid;
      const partnerData = await marrySchema.findOne({ authorid: wifeId });

      if (!partnerData) {
        // This case should ideally not happen if the data is consistent
        await marrySchema.deleteOne({ authorid: authorId });
        return interaction.reply({ content: "Dữ liệu không nhất quán, đã xóa thông tin cưới của bạn.", ephemeral: true });
      }

      const ring = data.nhan || partnerData.nhan || "Không có";

      let lyhonEmbed = new EmbedBuilder()
        .setTitle(`❤️ Ôi trời có thật là muốn ly hôn không ? ❤️`)
        .setDescription(`<@!${authorId}> <a:heart:912046879662030969> <@!${wifeId}>\n`)
        .setFooter({ text: `Hãy quyết định thật kỹ nhé!!` });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId('break').setLabel('Chia Tay').setStyle(ButtonStyle.Success).setEmoji('💔')
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId('thinkaboutit')
            .setLabel('Suy Nghĩ')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );

      const lyhonMessage = await interaction.reply({ embeds: [lyhonEmbed], components: [row], fetchReply: true });

      const filter = i => ["break", "thinkaboutit"].includes(i.customId) && i.user.id === authorId;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

      collector.on('collect', async i => {
        if (i.customId === 'break') {
          await marrySchema.deleteMany({ $or: [{ authorid: authorId }, { authorid: wifeId }] });
          await i.update({ content: `<a:broken_heart:949079502959566978> *Đường ai nấy đi, không còn vương vấn* <a:broken_heart:949079502959566978>`, components: [] });
        } else if (i.customId === 'thinkaboutit') {
          await i.update({ content: `💟 Vẫn còn cứu vãn... hãy thử hỏi han vài câu... 💟`, components: [] });
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          lyhonMessage.edit({ content: "Đã hết thời gian, không có quyết định nào được đưa ra.", components: [] });
        }
      });

    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "Đã có lỗi xảy ra, vui lòng thử lại sau.", ephemeral: true });
    }
  }
}