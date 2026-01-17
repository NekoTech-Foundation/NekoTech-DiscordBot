const ValorantAccount = require('../../../../models/ValorantAccount');
const { buttons } = require('../../../../utils/Valorant/components/buttons');
const { unlinkEmbed } = require('../../../../utils/Valorant/components/embeds');

module.exports = {
  async execute(interaction) {
    await interaction.deferReply();

    // Check if the user has a linked account and delete it
    // SQLiteModel wrapper deleteMany returns { deletedCount: N }
    const result = await ValorantAccount.deleteMany({ discordId: interaction.user.id });

    if (result.deletedCount > 0) {
      return await interaction.editReply({
        embeds: [unlinkEmbed()],
        components: [buttons],
      });
    } else {
      const getLang = () => global.lang?.Valorant || {};
      const msg = getLang().Errors?.UnlinkFailed || 'No VALORANT account linked to your Discord ID was found.';
      return await interaction.editReply({
        content: msg,
        components: [buttons],
      });
    }
  },
};
