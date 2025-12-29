const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require("discord.js");
const marrySchema = require('../../models/marrySchema.js');
const anhcuoi = require(`../../models/anhcuoi.js`);

// Cooldown collection
const cooldowns = new Map();

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

      // Check cooldown (30 minutes)
      const cooldownAmount = 1800000;
      if (cooldowns.has(interaction.user.id)) {
        const expirationTime = cooldowns.get(interaction.user.id) + cooldownAmount;
        if (Date.now() < expirationTime) {
          const timeLeft = Math.round((expirationTime - Date.now()) / 60000);
          const cooldownEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⏰ Chờ Một Chút!')
            .setDescription(`Bạn cần chờ **${timeLeft}** phút nữa để đổi ảnh cưới.`)
            .setFooter({ text: 'Không nên thay đổi quá thường xuyên!' })
            .setTimestamp();
          return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        }
      }

      cooldowns.set(interaction.user.id, Date.now());
      setTimeout(() => cooldowns.delete(interaction.user.id), cooldownAmount);
      
      let link = interaction.options.getString('link');
      
      // Validate URL
      if (!link || !link.startsWith('http')) {
        const invalidUrlEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Link Không Hợp Lệ')
          .setDescription('Xin hãy nhập link có định dạng: **https://**')
          .addFields(
            { name: '📝 Ví dụ', value: '`https://i.imgur.com/example.png`' }
          )
          .setFooter({ text: 'Link phải bắt đầu bằng http hoặc https' })
          .setTimestamp();
        return interaction.reply({ embeds: [invalidUrlEmbed], ephemeral: true });
      }

      // Check if URL is an image
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      const isImage = imageExtensions.some(ext => link.toLowerCase().includes(ext)) || 
                      link.includes('imgur.com') || 
                      link.includes('cdn.discordapp.com') ||
                      link.includes('media.discordapp.net');

      if (!isImage) {
        const notImageEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Cảnh Báo')
          .setDescription('Link có vẻ không phải là ảnh. Vẫn muốn tiếp tục?')
          .addFields(
            { name: '💡 Gợi ý', value: 'Hãy sử dụng link từ Imgur, Discord hoặc các trang lưu trữ ảnh khác' }
          )
          .setFooter({ text: 'Link đã được lưu nhưng có thể không hiển thị đúng' })
          .setTimestamp();
      }

      const husband = interaction.user;
      const data = await marrySchema.findOne({ authorid: husband.id });
      
      if (!data) {
        const noMarriageEmbed = new EmbedBuilder()
          .setColor('#FF6B9D')
          .setTitle('💔 Chưa Kết Hôn')
          .setDescription('Chưa cưới mà đã đòi chụp hình cưới...')
          .setFooter({ text: 'Hãy dùng /marry để cưới ai đó trước!' })
          .setTimestamp();
        return interaction.reply({ embeds: [noMarriageEmbed], ephemeral: true });
      }

      const wife = await interaction.client.users.fetch(data.wifeid);

      // Delete old wedding photos
      await anhcuoi.deleteMany({ $or: [{ authorid: husband.id }, { authorid: data.wifeid }] });

      // Save new wedding photos
      // Save new wedding photos
      const newAnhCuoi1 = await anhcuoi.create({ authorid: husband.id, wifeid: data.wifeid, anhcuoi: link });

      const newAnhCuoi2 = await anhcuoi.create({ authorid: data.wifeid, wifeid: husband.id, anhcuoi: link });

      const successEmbed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('📸 Ảnh Cưới Mới!')
        .setDescription(`**${husband.username}** đã thay đổi ảnh cưới của hai bạn!`)
        .addFields(
          { name: '👫 Cặp đôi', value: `${husband.username} ❤️ ${wife.username}` },
          { name: '🔗 Link ảnh', value: `[Xem ảnh cưới](${link})` }
        )
        .setImage(link)
        .setFooter({ text: '💖 Chúc hai bạn luôn hạnh phúc!' })
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed] });

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