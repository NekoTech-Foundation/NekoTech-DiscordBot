const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGenshinProfile, getHonkaiProfile } = require('./trackerUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trackers')
    .setDescription('Theo dõi thông tin người chơi cho các game được hỗ trợ.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('genshin_impact')
        .setDescription('Theo dõi hồ sơ người chơi Genshin Impact.')
        .addStringOption(option =>
          option.setName('uid')
            .setDescription('UID của người chơi Genshin Impact.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('honkai_star_rail')
        .setDescription('Theo dõi hồ sơ người chơi Honkai: Star Rail.')
        .addStringOption(option =>
          option.setName('uid')
            .setDescription('UID của người chơi Honkai: Star Rail.')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const uid = interaction.options.getString('uid');

    await interaction.deferReply();

    if (subcommand === 'genshin_impact') {
      try {
        const profile = await getGenshinProfile(uid);

        if (profile && profile.error) {
          return interaction.editReply({ content: profile.error });
        }

        if (!profile) {
          return interaction.editReply({ content: 'Không thể tìm thấy hồ sơ. UID có thể không hợp lệ hoặc hồ sơ không công khai.' });
        }

        const embed = new EmbedBuilder()
          .setTitle(`Hồ Sơ Genshin Impact - ${profile.username}`)
          .setURL(`https://enka.network/u/${uid}/`)
          .setThumbnail(profile.profilePictureUrl)
          .addFields(
            { name: 'Hạng Mạo Hiểm', value: profile.adventureRank.toString(), inline: true },
            { name: 'Cấp Thế Giới', value: profile.worldLevel.toString(), inline: true },
            { name: 'Thành Tựu', value: profile.achievements.toString(), inline: true },
            { name: 'La Hoàn Thâm Cảnh', value: profile.spiralAbyss, inline: true },
            { name: 'Chữ Ký', value: profile.signature, inline: false },
            { name: 'Hồ Sơ', value: `[Xem profile đầy đủ tại Enka.Network](https://enka.network/u/${uid})`, inline: false }
          )
          .setColor('Blue')
          .setFooter({ text: 'Dữ liệu được cung cấp bởi Enka.Network' });

        await interaction.editReply({ embeds: [embed] });

      } catch (error) {
        console.error('Lỗi khi lấy hồ sơ Genshin Impact:', error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi cố gắng lấy dữ liệu hồ sơ.' });
      }
    } else if (subcommand === 'honkai_star_rail') {
      try {
        const profile = await getHonkaiProfile(uid);

        if (profile && profile.error) {
          return interaction.editReply({ content: profile.error });
        }

        if (!profile) {
          return interaction.editReply({ content: 'Không thể tìm thấy hồ sơ. UID có thể không hợp lệ hoặc hồ sơ không công khai.' });
        }

        const embed = new EmbedBuilder()
          .setTitle(`Hồ Sơ Honkai: Star Rail - ${profile.username}`)
          .setURL(`https://enka.network/hsr/${uid}/`)
          .addFields(
            { name: 'Cấp Khai Phá', value: profile.trailblazeLevel.toString(), inline: true },
            { name: 'Cấp Cân Bằng', value: profile.equilibriumLevel.toString(), inline: true },
            { name: 'Tổng Số Thành Tựu', value: profile.achievements.toString(), inline: true },
            { name: 'Vũ Trụ Mô Phỏng', value: profile.simulatedUniverse.toString(), inline: true },
            { name: 'Chữ Ký', value: profile.signature, inline: false },
            { name: 'Hồ Sơ', value: `[Xem đầy đủ tại Enka.Network](https://enka.network/hsr/${uid})`, inline: false }
          )
          .setColor('Purple')
          .setFooter({ text: 'Dữ liệu được cung cấp bởi Enka.Network' });

        if (profile.profilePictureUrl) {
          embed.setThumbnail(profile.profilePictureUrl);
        }

        await interaction.editReply({ embeds: [embed] });

      } catch (error) {
        console.error('Lỗi khi lấy hồ sơ Honkai: Star Rail:', error);
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi cố gắng lấy dữ liệu hồ sơ.' });
      }
    }
  }
};
