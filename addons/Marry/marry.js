const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const marrySchema = require('../../models/marrySchema.js');
const anhcuoi = require('../../models/anhcuoi.js');

// Cooldown collections for each subcommand
const cooldowns = {
  propose: new Map(),
  together: new Map(),
  divorce: new Map(),
  promise: new Map(),
  background: new Map()
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marry')
    .setDescription('Hệ thống kết hôn và quản lý tình cảm')
    .addSubcommand(subcommand =>
      subcommand
        .setName('propose')
        .setDescription('Cầu hôn người bạn yêu thương')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Người bạn muốn cưới')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('together')
        .setDescription('Thể hiện tình cảm với nửa kia'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('divorce')
        .setDescription('Ly hôn - đường ai nấy đi'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('promise')
        .setDescription('Thay đổi lời hứa của bạn')
        .addStringOption(option =>
          option.setName('loi_hua')
            .setDescription('Lời hứa mới của bạn')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('background')
        .setDescription('Thay đổi ảnh cưới')
        .addStringOption(option =>
          option.setName('link')
            .setDescription('Link ảnh cưới (https://...)')
            .setRequired(true))),

  async execute(interaction) {
    try {
      // Check ban for all subcommands
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

      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'propose':
          await handlePropose(interaction);
          break;
        case 'together':
          await handleTogether(interaction);
          break;
        case 'divorce':
          await handleDivorce(interaction);
          break;
        case 'promise':
          await handlePromise(interaction);
          break;
        case 'background':
          await handleBackground(interaction);
          break;
      }

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

// ==================== PROPOSE SUBCOMMAND ====================
async function handlePropose(interaction) {
  const cooldownAmount = 60000; // 60 seconds
  if (!checkCooldown(interaction, 'propose', cooldownAmount)) return;

  const husband = interaction.user;
  const wife = interaction.options.getUser('user');

  // Validation checks
  if (wife.id === husband.id) {
    const selfMarryEmbed = new EmbedBuilder()
      .setColor('#FF6B9D')
      .setTitle('💔 Không Thể!')
      .setDescription('Sao lại tự cưới mình chứ hả??')
      .setFooter({ text: 'Hãy tìm người khác nhé!' })
      .setTimestamp();
    return interaction.reply({ embeds: [selfMarryEmbed], ephemeral: true });
  }

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

  // Check existing marriages
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

  // Proposal process
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

// ==================== TOGETHER SUBCOMMAND ====================
async function handleTogether(interaction) {
  const cooldownAmount = 30000; // 30 seconds
  if (!checkCooldown(interaction, 'together', cooldownAmount)) return;

  const husband = interaction.user;
  const data = await marrySchema.findOne({ authorid: husband.id });

  if (!data) {
    const noMarriageEmbed = new EmbedBuilder()
      .setColor('#FF6B9D')
      .setTitle('💔 Chưa Có Người Yêu')
      .setDescription('Yêu thì cưới đi chời! Nói suông...')
      .setFooter({ text: 'Dùng /marry propose để cưới ai đó trước nhé!' })
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
}

// ==================== DIVORCE SUBCOMMAND ====================
async function handleDivorce(interaction) {
  const cooldownAmount = 120000; // 2 minutes
  if (!checkCooldown(interaction, 'divorce', cooldownAmount)) return;

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
  const wife = await interaction.client.users.fetch(wifeId);

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
      try {
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
}

// ==================== PROMISE SUBCOMMAND ====================
async function handlePromise(interaction) {
  const cooldownAmount = 3600000; // 1 hour
  if (!checkCooldown(interaction, 'promise', cooldownAmount)) return;

  const husband = interaction.user;
  const data = await marrySchema.findOne({ authorid: husband.id });

  if (!data) {
    const noMarriageEmbed = new EmbedBuilder()
      .setColor('#FF6B9D')
      .setTitle('💔 Chưa Có Người Yêu')
      .setDescription('Chưa cưới mà đã thề non hẹn biển...')
      .setFooter({ text: 'Hãy dùng /marry propose để cưới ai đó trước!' })
      .setTimestamp();
    return interaction.reply({ embeds: [noMarriageEmbed], ephemeral: true });
  }

  const newPromise = interaction.options.getString('loi_hua');
  
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
}

// ==================== BACKGROUND SUBCOMMAND ====================
async function handleBackground(interaction) {
  const cooldownAmount = 1800000; // 30 minutes
  if (!checkCooldown(interaction, 'background', cooldownAmount)) return;

  let link = interaction.options.getString('link');
  
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

  const husband = interaction.user;
  const data = await marrySchema.findOne({ authorid: husband.id });
  
  if (!data) {
    const noMarriageEmbed = new EmbedBuilder()
      .setColor('#FF6B9D')
      .setTitle('💔 Chưa Kết Hôn')
      .setDescription('Chưa cưới mà đã đòi chụp hình cưới...')
      .setFooter({ text: 'Hãy dùng /marry propose để cưới ai đó trước!' })
      .setTimestamp();
    return interaction.reply({ embeds: [noMarriageEmbed], ephemeral: true });
  }

  const wife = await interaction.client.users.fetch(data.wifeid);

  await anhcuoi.deleteMany({ $or: [{ authorid: husband.id }, { authorid: data.wifeid }] });

  const newAnhCuoi1 = new anhcuoi({ authorid: husband.id, wifeid: data.wifeid, anhcuoi: link });
  await newAnhCuoi1.save();

  const newAnhCuoi2 = new anhcuoi({ authorid: data.wifeid, wifeid: husband.id, anhcuoi: link });
  await newAnhCuoi2.save();

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
}

// ==================== HELPER FUNCTIONS ====================
function checkCooldown(interaction, type, cooldownAmount) {
  if (cooldowns[type].has(interaction.user.id)) {
    const expirationTime = cooldowns[type].get(interaction.user.id) + cooldownAmount;
    if (Date.now() < expirationTime) {
      const timeLeft = Math.round((expirationTime - Date.now()) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      
      let timeString = '';
      if (minutes > 0) {
        timeString = `**${minutes}** phút ${seconds > 0 ? `**${seconds}** giây` : ''}`;
      } else {
        timeString = `**${seconds}** giây`;
      }

      const cooldownEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⏰ Chờ Một Chút!')
        .setDescription(`Bạn cần chờ ${timeString} nữa để sử dụng lệnh này.`)
        .setFooter({ text: 'Hãy kiên nhẫn một chút!' })
        .setTimestamp();
      
      interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
      return false;
    }
  }

  cooldowns[type].set(interaction.user.id, Date.now());
  setTimeout(() => cooldowns[type].delete(interaction.user.id), cooldownAmount);
  return true;
}