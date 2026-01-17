const ValorantAccount = require('../../../../models/ValorantAccount');
const { buttons } = require('../../../../utils/Valorant/components/buttons');
const { linkedEmbed, noLinkEmbed } = require('../../../../utils/Valorant/components/embeds');

module.exports = {
  async execute(interaction) {
    await interaction.deferReply();
    const accounts = await ValorantAccount.find({ discordId: interaction.user.id });

    if (accounts.length > 0) {
      const ID = accounts[0].valorantAccount;
      const linkedAccount = decodeURI(ID);

      return await interaction.editReply({
        embeds: [linkedEmbed(linkedAccount)],
        components: [buttons],
      });
    } else {
      return await interaction.editReply({
        embeds: [noLinkEmbed()],
        components: [buttons],
      });
    }
  },
};
