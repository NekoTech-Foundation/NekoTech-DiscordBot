const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require("discord.js");
const marrySchema = require('../../models/marrySchema.js');

// Cooldown collection
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('together')
    .setDescription('Tình cảm nồng đậm... (aliases: yeuem, yeuanh, iuem, iuanh, loveyou, iuxop)'),
  async execute(interaction) {
    try {
      // Check ban
      const BanSchema = require('../../models/BanSchema');
      const ban = await BanSchema.findOne({ memberid: interaction.user.id });
      if (ban) {
        const banEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Bị Cấm')
          .setDescription('Bạn đã bị cấm sử dụng lệnh này.')
          .setTimestamp();
        return interaction.reply({ embeds: [banEmbed], ephemeral: true });
      }

      // Check cooldown (30 seconds)
      const cooldownAmount = 30000;
      if (cooldowns.has(interaction.user.id)) {
        const expirationTime = cooldowns.get(interaction.user.id) + cooldownAmount;
        if (Date.now() < expirationTime) {
          const timeLeft = Math.round((expirationTime - Date.now()) / 1000);
          const cooldownEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⏰ Đợi Một Chút!')
            .setDescription(`Bạn cần chờ **${timeLeft}** giây nữa để thể hiện tình cảm tiếp.`)
            .setFooter({ text: 'Đừng vội, tình yêu cần thời gian!' })
            .setTimestamp();
          return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        }
      }

      cooldowns.set(interaction.user.id, Date.now());
      setTimeout(() => cooldowns.delete(interaction.user.id), cooldownAmount);

      const husband = interaction.user;
      const data = await marrySchema.findOne({ authorid: husband.id });

      if (!data) {
        const noMarriageEmbed = new EmbedBuilder()
          .setColor('#FF6B9D')
          .setTitle('💔 Chưa Có Người Yêu')
          .setDescription('Yêu thì cưới đi chời! Nói suông...')
          .setFooter({ text: 'Dùng /marry để cưới ai đó trước nhé!' })
          .setTimestamp();
        return interaction.reply({ embeds: [noMarriageEmbed], ephemeral: true });
      }

      const wifeId = data.wifeid;
      const lovedata = await marrySchema.findOne({ authorid: wifeId });

      if (!lovedata) {
        const noDataEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Lỗi Dữ Liệu')
          .setDescription('Dữ liệu người ấy của bạn không tìm thấy.')
          .setTimestamp();
        return interaction.reply({ embeds: [noDataEmbed], ephemeral: true });
      }

      const currentAffection = data.together || 0;
      const newAffection = currentAffection + 1;

      data.together = newAffection;
      lovedata.together = newAffection;

      await data.save();
      await lovedata.save();

      // Get affection level
      let level = '🤍 Mới Quen';
      let color = '#FFFFFF';
      if (newAffection >= 500) {
        level = '💖 Linh Hồn Song Sinh';
        color = '#FF1493';
      } else if (newAffection >= 300) {
        level = '💗 Yêu Đắm Say';
        color = '#FF69B4';
      } else if (newAffection >= 150) {
        level = '💕 Tình Cảm Sâu Đậm';
        color = '#FF85C1';
      } else if (newAffection >= 50) {
        level = '💓 Đang Yêu';
        color = '#FFA5D2';
      } else if (newAffection >= 10) {
        level = '💗 Thích Nhau';
        color = '#FFC0CB';
      }

      // Custom messages for specific users
      const customMessages = {
        "715020568017109122": `Òi oi, đã thơm má nhau`,
        "696893548863422494": `u là trời, đã vừa đấm vừa xoa`,
        "620860299356143657": `Òi oi, đã thơm má nhau`
      };

      const actionText = customMessages[husband.id] || 'đã nói lời yêu';

      const affectionEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle('💝 Tình Cảm Thăng Hoa!')
        .setDescription(`**${husband.username}** ${actionText} với **<@${wifeId}>**!`)
        .addFields(
          { name: '💕 Điểm Thân Mật', value: `**${newAffection}** điểm`, inline: true },
          { name: '🏆 Cấp Độ', value: level, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }
        )
        .setFooter({ text: '💖 Hãy tiếp tục nuôi dưỡng tình cảm nhé!' })
        .setTimestamp();

      await interaction.reply({ embeds: [affectionEmbed] });

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