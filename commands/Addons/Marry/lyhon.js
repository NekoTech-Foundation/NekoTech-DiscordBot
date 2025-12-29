const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const marrySchema = require('../../../models/marrySchema.js');

// Cooldown collection
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyhon')
    .setDescription('Đường Ai Nấy Đi...'),
  async execute(interaction) {
    const { client } = interaction;
    try {
      // Check ban
      const BanSchema = require('../../../models/BanSchema');
      const ban = await BanSchema.findOne({ memberid: interaction.user.id });
      if (ban) {
        const banEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Bị Cấm')
          .setDescription('Bạn đã bị cấm sử dụng lệnh này.')
          .setTimestamp();
        return interaction.reply({ embeds: [banEmbed], ephemeral: true });
      }

      // Check cooldown (2 minutes)
      const cooldownAmount = 120000;
      if (cooldowns.has(interaction.user.id)) {
        const expirationTime = cooldowns.get(interaction.user.id) + cooldownAmount;
        if (Date.now() < expirationTime) {
          const timeLeft = Math.round((expirationTime - Date.now()) / 1000);
          const cooldownEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⏰ Hãy Suy Nghĩ Kỹ!')
            .setDescription(`Quyết định ly hôn không thể vội vàng. Bạn cần chờ **${timeLeft}** giây nữa.`)
            .setFooter({ text: 'Hãy cân nhắc thật kỹ!' })
            .setTimestamp();
          return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        }
      }

      cooldowns.set(interaction.user.id, Date.now());
      setTimeout(() => cooldowns.delete(interaction.user.id), cooldownAmount);

      const authorId = interaction.user.id;
      const data = await marrySchema.findOne({ authorid: authorId });

      if (!data) {
        const noMarriageEmbed = new EmbedBuilder()
          .setColor('#808080')
          .setTitle('💔 Độc Thân')
          .setDescription('Đồ F.A, chưa cưới mà đã đòi ly hôn...')
          .setFooter({ text: 'Hãy tìm người yêu trước đã!' })
          .setTimestamp();
        return interaction.reply({ embeds: [noMarriageEmbed], ephemeral: true });
      }

      const wifeId = data.wifeid;
      const partnerData = await marrySchema.findOne({ authorid: wifeId });

      if (!partnerData) {
        await marrySchema.deleteOne({ authorid: authorId });
        const inconsistentEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Dữ Liệu Lỗi')
          .setDescription('Dữ liệu không nhất quán, đã xóa thông tin cưới của bạn.')
          .setTimestamp();
        return interaction.reply({ embeds: [inconsistentEmbed], ephemeral: true });
      }

      const together = data.together || 0;
      const wife = await client.users.fetch(wifeId);

      const lyhonEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💔 Quyết Định Ly Hôn')
        .setDescription('Đây là quyết định rất quan trọng...')
        .addFields(
          { name: '👫 Cặp đôi', value: `<@${authorId}> ❤️ <@${wifeId}>` },
          { name: '💕 Điểm thân mật hiện tại', value: `${together} điểm`, inline: true },
          { name: '⏰ Thời gian quyết định', value: '30 giây', inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '⚠️ Cảnh báo', value: '*Nếu ly hôn, tất cả dữ liệu sẽ bị xóa và không thể khôi phục!*' }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'Hãy quyết định thật kỹ nhé!!' })
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('break')
            .setLabel('Chia Tay')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('💔'),
          new ButtonBuilder()
            .setCustomId('thinkaboutit')
            .setLabel('Suy Nghĩ Lại')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💚')
        );

      const lyhonMessage = await interaction.reply({ 
        embeds: [lyhonEmbed], 
        components: [row], 
        fetchReply: true 
      });

      const filter = i => ["break", "thinkaboutit"].includes(i.customId) && i.user.id === authorId;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

      collector.on('collect', async i => {
        if (i.customId === 'break') {
          // Delete anhcuoi data if exists
          try {
            const anhcuoi = require('../../../models/anhcuoi');
            await anhcuoi.deleteMany({ $or: [{ authorid: authorId }, { authorid: wifeId }] });
          } catch (e) {
            console.error('Error deleting anhcuoi:', e);
          }

          await marrySchema.deleteMany({ $or: [{ authorid: authorId }, { authorid: wifeId }] });

          const breakEmbed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle('💔 Đã Ly Hôn')
            .setDescription('*Đường ai nấy đi, không còn vương vấn...*')
            .addFields(
              { name: '📊 Thống kê cuối', value: `Điểm thân mật đã mất: ${together} điểm` },
              { name: '💭 Lời nhắn', value: '*Có lẽ đây là quyết định tốt nhất cho cả hai...*' }
            )
            .setFooter({ text: 'Chúc cả hai tìm được hạnh phúc mới' })
            .setTimestamp();

          await i.update({ embeds: [breakEmbed], components: [] });
        } else if (i.customId === 'thinkaboutit') {
          const reconsiderEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💚 Vẫn Còn Yêu')
            .setDescription('*Vẫn còn cứu vãn... hãy thử hỏi han vài câu...*')
            .addFields(
              { name: '💕 Tình cảm', value: `Hai bạn vẫn còn ${together} điểm thân mật` },
              { name: '💭 Lời khuyên', value: '*Hãy trò chuyện và chia sẻ với nhau nhiều hơn!*' }
            )
            .setFooter({ text: 'Yêu nhau là phải chiều nhau!' })
            .setTimestamp();

          await i.update({ embeds: [reconsiderEmbed], components: [] });
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('⏰ Hết Thời Gian')
            .setDescription('Đã hết thời gian, không có quyết định nào được đưa ra.')
            .setFooter({ text: 'Có vẻ bạn cần thêm thời gian suy nghĩ...' })
            .setTimestamp();

          lyhonMessage.edit({ embeds: [timeoutEmbed], components: [] });
        }
      });

    } catch (error) {
      console.error(error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Lỗi')
        .setDescription('Đã có lỗi xảy ra, vui lòng thử lại sau.')
        .setTimestamp();
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};
