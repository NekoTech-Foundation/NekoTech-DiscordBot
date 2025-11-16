const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require("discord.js");
const marrySchema = require('../../models/marrySchema.js');

// Cooldown collection
const cooldowns = new Map();

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

      // Check cooldown (1 hour)
      const cooldownAmount = 3600000;
      if (cooldowns.has(interaction.user.id)) {
        const expirationTime = cooldowns.get(interaction.user.id) + cooldownAmount;
        if (Date.now() < expirationTime) {
          const timeLeft = Math.round((expirationTime - Date.now()) / 60000);
          const cooldownEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⏰ Chưa Thể Đổi Lời Hứa')
            .setDescription(`Lời hứa không thể thay đổi liên tục. Bạn cần chờ **${timeLeft}** phút nữa.`)
            .setFooter({ text: 'Lời hứa cần sự nghiêm túc!' })
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
          .setDescription('Chưa cưới mà đã thề non hẹn biển...')
          .setFooter({ text: 'Hãy dùng /marry để cưới ai đó trước!' })
          .setTimestamp();
        return interaction.reply({ embeds: [noMarriageEmbed], ephemeral: true });
      }

      const newPromise = interaction.options.getString('loi_hua');
      
      // Check promise length
      if (newPromise.length > 100) {
        const tooLongEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Quá Dài')
          .setDescription('Lời hứa không được vượt quá 100 ký tự!')
          .setFooter({ text: 'Hãy ngắn gọn và ý nghĩa hơn!' })
          .setTimestamp();
        return interaction.reply({ embeds: [tooLongEmbed], ephemeral: true });
      }

      const oldPromise = data.loihua || 'Chưa có lời hứa';
      data.loihua = newPromise;
      await data.save();

      const wife = await interaction.client.users.fetch(data.wifeid);

      const promiseEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💍 Lời Hứa Mới')
        .setDescription(`**${husband.username}** đã thay đổi lời hứa dành cho **${wife.username}**`)
        .addFields(
          { name: '📜 Lời hứa cũ', value: `*"${oldPromise}"*` },
          { name: '✨ Lời hứa mới', value: `*"${newPromise}"*` },
          { name: '💝 Thông điệp', value: 'Hãy giữ lời hứa của mình nhé!' }
        )
        .setThumbnail(husband.displayAvatarURL())
        .setFooter({ text: '💖 Lời hứa là để giữ, không phải để quên!' })
        .setTimestamp();

      await interaction.reply({ embeds: [promiseEmbed] });

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