const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const marrySchema = require('../../models/marrySchema.js');

// Cooldown collection
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marry')
    .setDescription('Bên nhau trọn đời...')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Người bạn muốn cưới')
        .setRequired(true)),
  async execute(interaction) {
    const { client } = interaction;
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

      // Check cooldown
      const cooldownAmount = 60000; // 60 seconds
      if (cooldowns.has(interaction.user.id)) {
        const expirationTime = cooldowns.get(interaction.user.id) + cooldownAmount;
        if (Date.now() < expirationTime) {
          const timeLeft = Math.round((expirationTime - Date.now()) / 1000);
          const cooldownEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⏰ Chờ Chút Nhé!')
            .setDescription(`Bạn cần chờ **${timeLeft}** giây nữa mới có thể sử dụng lệnh này.`)
            .setFooter({ text: 'Hãy kiên nhẫn một chút!' })
            .setTimestamp();
          return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        }
      }

      cooldowns.set(interaction.user.id, Date.now());
      setTimeout(() => cooldowns.delete(interaction.user.id), cooldownAmount);

      const husband = interaction.user;
      const wife = interaction.options.getUser('user');

      // Check self-marry
      if (wife.id === husband.id) {
        const selfMarryEmbed = new EmbedBuilder()
          .setColor('#FF6B9D')
          .setTitle('💔 Không Thể!')
          .setDescription('Sao lại tự cưới mình chứ hả??')
          .setFooter({ text: 'Hãy tìm người khác nhé!' })
          .setTimestamp();
        return interaction.reply({ embeds: [selfMarryEmbed], ephemeral: true });
      }

      // Check bot
      if (wife.bot) {
        const botMarryEmbed = new EmbedBuilder()
          .setColor('#FF6B9D')
          .setTitle('🤖 Không Thể!')
          .setDescription('Không thể cưới bot được bạn ơi!')
          .setTimestamp();
        return interaction.reply({ embeds: [botMarryEmbed], ephemeral: true });
      }

      const data = await marrySchema.findOne({ authorid: husband.id });
      const lovedata = await marrySchema.findOne({ authorid: wife.id });

      // Check existing marriage
      if (data || lovedata) {
        if (data && data.wifeid !== wife.id) {
          const hasPartnerEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💍 Đã Có Người Yêu')
            .setDescription('Bạn đã có nửa kia rồi! Đừng tham lam thế chứ!')
            .setFooter({ text: 'Hãy chung thủy nhé!' })
            .setTimestamp();
          return interaction.reply({ embeds: [hasPartnerEmbed], ephemeral: true });
        }
        if (lovedata && lovedata.wifeid !== interaction.user.id) {
          const partnerTakenEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💔 Đã Có Chủ')
            .setDescription('Đối phương đã có nửa kia rồi! Đừng làm trà xanh chứ!')
            .setFooter({ text: 'Tìm người khác đi bạn!' })
            .setTimestamp();
          return interaction.reply({ embeds: [partnerTakenEmbed], ephemeral: true });
        }
        if (data && data.wifeid === wife.id) {
          const alreadyMarriedEmbed = new EmbedBuilder()
            .setColor('#FFB6C1')
            .setTitle('💕 Đã Kết Hôn')
            .setDescription('Hai bạn đã là của nhau rồi mà!')
            .setFooter({ text: 'Hạnh phúc mãi nhé!' })
            .setTimestamp();
          return interaction.reply({ embeds: [alreadyMarriedEmbed], ephemeral: true });
        }
      }

      await handleNewMarriage(interaction, husband, wife);

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

async function handleNewMarriage(interaction, husband, wife) {
  // Proposal embed
  const proposalEmbed = new EmbedBuilder()
    .setColor('#FF69B4')
    .setTitle('💍 Lời Cầu Hôn')
    .setDescription(`**${husband.username}** đang quỳ gối cầu hôn **${wife.username}**!`)
    .addFields(
      { name: '💝 Câu hỏi', value: `${wife.username}, bạn có đồng ý kết hôn với ${husband.username} không?` },
      { name: '⏰ Thời gian', value: 'Bạn có **30 giây** để trả lời!' }
    )
    .setThumbnail(husband.displayAvatarURL())
    .setFooter({ text: 'Hãy suy nghĩ kỹ nhé!' })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('yes')
        .setLabel('Yes, I Do!')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId('no')
        .setLabel('Ơ, Gì z chơi?')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    );

  const kethonmessage = await interaction.reply({ 
    content: `<@${wife.id}>`, 
    embeds: [proposalEmbed], 
    components: [row], 
    fetchReply: true 
  });

  const filter = i => ['yes', 'no'].includes(i.customId) && i.user.id === wife.id;
  const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

  collector.on('collect', async i => {
    if (i.customId === 'yes') {
      const defaultPromise = 'Yêu nhau suốt kiếp';
      const newWife = new marrySchema({ 
        authorid: husband.id, 
        wifeid: wife.id, 
        husbandid: wife.id, 
        together: 1, 
        loihua: defaultPromise 
      });
      const newHusband = new marrySchema({ 
        authorid: wife.id, 
        wifeid: husband.id, 
        husbandid: husband.id, 
        loihua: 'Đầu bạc răng long', 
        together: 1 
      });
      
      await newWife.save();
      await newHusband.save();

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎉 Chúc Mừng!')
        .setDescription(`**${husband.username}** ❤️ **${wife.username}**`)
        .addFields(
          { name: '💒 Tình trạng', value: 'Đã kết hôn', inline: true },
          { name: '💕 Điểm thân mật', value: '1 điểm', inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: `💬 Lời hứa của ${husband.username}`, value: `*"${defaultPromise}"*` },
          { name: `💬 Lời hứa của ${wife.username}`, value: `*"Đầu bạc răng long"*` }
        )
        .setFooter({ text: '💖 Chúc hai bạn hạnh phúc dài lâu! 💖' })
        .setTimestamp();

      await i.update({ embeds: [successEmbed], components: [] });
    } else {
      const rejectEmbed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle('💔 Bị Từ Chối')
        .setDescription(`**${wife.username}** đã từ chối lời cầu hôn của **${husband.username}**...`)
        .setFooter({ text: 'Đừng buồn, hãy thử lại sau nhé!' })
        .setTimestamp();

      await i.update({ embeds: [rejectEmbed], components: [] });
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      const timeoutEmbed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle('⏰ Hết Thời Gian')
        .setDescription('Đã hết thời gian, lời cầu hôn đã bị hủy.')
        .setFooter({ text: 'Hãy thử lại sau nhé!' })
        .setTimestamp();

      kethonmessage.edit({ embeds: [timeoutEmbed], components: [] });
    }
  });
}