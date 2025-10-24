const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const marrySchema = require('../../models/marrySchema.js');

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
      const BanSchema = require('../../models/BanSchema');
      const ban = await BanSchema.findOne({ memberid: interaction.user.id });
      if (ban) return interaction.reply({ content: 'Bạn đã bị cấm sử dụng lệnh này.', ephemeral: true });

      const husband = interaction.user;
      const data = await marrySchema.findOne({ authorid: husband.id });
      const wife = interaction.options.getUser('user');

      if (wife.id === husband.id) {
        return interaction.reply({ content: 'Sao lại tự cưới mình chứ hả??', ephemeral: true });
      }

      const lovedata = await marrySchema.findOne({ authorid: wife.id });

      if (data || lovedata) {
        if (data && data.wifeid !== wife.id) {
          return interaction.reply({ content: `Bạn đã có nửa kia rồi! Đừng tham lam thế chứ!`, ephemeral: true });
        }
        if (lovedata && lovedata.wifeid !== interaction.user.id) {
          return interaction.reply({ content: `Đối phương đã có nửa kia rồi! Đừng làm trà xanh chứ!`, ephemeral: true });
        }
        if (data && data.wifeid === wife.id) {
          return interaction.reply({ content: `Hai bạn đã là của nhau rồi mà!`, ephemeral: true });
        }
      }

      await handleNewMarriage(interaction, husband, wife);

    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "Đã có lỗi xảy ra, vui lòng thử lại sau.", ephemeral: true });
    }
  }
};

async function sendMarryInfo(client, interaction, data, husband) {
  const hinhcuoi = await require('../../models/anhcuoi').findOne({ authorid: husband.id });
  let hinhcuoia = hinhcuoi ? hinhcuoi.anhcuoi : 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/e7781e25-3bf5-4185-aad7-ec93d0b5e1b0/d7fa2wq-cf60174b-9a41-44de-bb2f-605cde85dad5.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcL2U3NzgxZTI1LTNiZjUtNDE4NS1hYWQ3LWVjOTNkMGI1ZTFiMFwvZDdmYTJ3cS1jZjYwMTc0Yi05YTQxLTQ0ZGUtYmIyZi02MDVjZGU4NWRhZDUuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.vX_oTdMeJ4D5xWpqNQV4NOjiJW4ahpQWZ4Fyp4xX8x8';
  const wifefind = await client.users.fetch(data.wifeid);

  const loveEmbed = new EmbedBuilder()
    .setTitle(`💖 𝓢𝓸 𝓢𝔀𝓮𝓮𝓽 💖`)
    .setDescription(`**__${husband.username}__** <a:heart:950735238177366076> **__${wifefind.username}__**\n<a:heart:912046879662030969> **Điểm thân mật : **${data.together || 0}** điểm`)
    .addFields({ name: `𝑴𝒊𝒏𝒉 𝒄𝒉𝒖̛́𝒏𝒈 𝒄𝒉𝒐 𝒍𝒐̛̀𝒊 𝒏𝒐́𝒊:`, value: `<a:FW_bluetick:911688322638807050> **${data.loihua}**\n<a:GTI_tick:911420037678649354> **${(await marrySchema.findOne({ authorid: data.wifeid })).loihua}**` })
    .setFooter({ text: `💖 Chúc hai bạn hạnh phúc dài lâu! 💖`, iconURL: husband.displayAvatarURL() })
    .setColor('#FFCCCC')
    .setImage(hinhcuoia)
    .setTimestamp();

  await interaction.reply({ content: `Hạnh Phúc Có Đôi, Bên Nhau Mãi Mãi...`, embeds: [loveEmbed] });
}

async function handleNewMarriage(interaction, husband, wife) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('yes').setLabel('Yes, I Do').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('no').setLabel('0, Gì z chời?').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

  const kethonmessage = await interaction.reply({ content: `<@!${wife.id}>, <@!${husband.id}> đã ngỏ ý muốn cưới bạn... Bạn có 30s để trả lời họ!`, components: [row], fetchReply: true });

  const filter = i => ['yes', 'no'].includes(i.customId) && i.user.id === wife.id;
  const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

  collector.on('collect', async i => {
    if (i.customId === 'yes') {
      const defaultPromise = 'Yêu nhau suốt kiếp';
      const newWife = new marrySchema({ authorid: husband.id, wifeid: wife.id, husbandid: wife.id, together: 1, loihua: defaultPromise });
      const newHusband = new marrySchema({ authorid: wife.id, wifeid: husband.id, husbandid: husband.id, loihua: 'Đầu bạc răng long', together: 1 });
      await newWife.save();
      await newHusband.save();
      await i.update({ content: `<a:heart:912046879662030969>**Chúc mừng hai bạn đã thuộc về nhau**<a:heart:912046879662030969>`, components: [] });
    } else {
      await i.update({ content: `Lêu lêu **${husband.username}** tỏ tình bị người ta từ chối!`, components: [] });
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      kethonmessage.edit({ content: 'Đã hết thời gian, lời cầu hôn đã bị hủy.', components: [] });
    }
  });
}