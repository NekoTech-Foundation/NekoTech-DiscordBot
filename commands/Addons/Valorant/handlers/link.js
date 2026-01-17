const ValorantAccount = require('../../../../models/ValorantAccount');
const { buttons } = require('../../../../utils/Valorant/components/buttons');
const { linkEmbed } = require('../../../../utils/Valorant/components/embeds');

module.exports = {
  async execute(interaction) {
    const args = interaction.options.getString('username-tag');
    const playerID = encodeURI(args).toLowerCase();

    if (!playerID.includes('#')) {
      const getLang = () => global.lang?.Valorant || {};
      const msg = getLang().Errors?.InvalidTag || 'You have entered an invalid Valorant username and tag!';
      return await interaction.reply(msg);
    }

    await interaction.deferReply();

    const accounts = await ValorantAccount.find({ discordId: interaction.user.id });

    // Check if the user has a linked account and delete it
    if (accounts.length > 0) {
      await ValorantAccount.deleteMany({ discordId: interaction.user.id });
    }
    // Add linked account to Discord ID
    try {
      await ValorantAccount.create({
        username: interaction.user.username,
        discordId: interaction.user.id,
        valorantAccount: playerID,
      });

      await interaction.editReply({
        embeds: [linkEmbed(args)],
        components: [buttons],
      });
    } catch (error) {
      console.log(error);
      const getLang = () => global.lang?.Valorant || {};
      const msg = getLang().Errors?.FailedLink || 'Failed to link Valorant account to your Discord ID';
      return await interaction.editReply({
        content: msg,
        components: [buttons],
      });
    }
  },
};
