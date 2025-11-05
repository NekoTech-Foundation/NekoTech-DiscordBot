const { SlashCommandBuilder } = require('@discordjs/builders');
const UmaPlayer = require('./schemas/UmaPlayer');
const UmaMusume = require('./schemas/UmaMusume');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_set_favorite')
    .setDescription('Đặt Mã nương yêu thích của bạn.')
    .addStringOption(option => option.setName('name').setDescription('Tên của Mã nương để đặt làm yêu thích.').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const umaName = interaction.options.getString('name');

    const targetUma = await UmaMusume.findOne({ ownerId: userId, name: umaName });

    if (!targetUma) {
      return interaction.reply({ content: 'Không tìm thấy Mã nương hoặc không thuộc sở hữu của bạn. Vui lòng sử dụng tên chính xác.', ephemeral: true });
    }

    const umaPlayer = await UmaPlayer.findOne({ userId: userId });
    if (!umaPlayer) {
      return interaction.reply({ content: 'Bạn chưa có hồ sơ. Dùng `/uma gacha` để bắt đầu.', ephemeral: true });
    }

    umaPlayer.favoriteUma = targetUma._id;
    await umaPlayer.save();

    await interaction.reply({ content: `Bạn đã đặt ${targetUma.name} làm Mã nương yêu thích của mình!`, ephemeral: true });
  }
};