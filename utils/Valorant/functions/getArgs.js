const ValorantAccount = require('../../../models/ValorantAccount');
const { noAccountEmbed, errorEmbed } = require('../components/embeds');
const { buttons, helpButtons } = require('../components/buttons');

async function getArgs(interaction) {
  // Use findOne for efficient lookup by discordId
  const account = await ValorantAccount.findOne({ discordId: interaction.user.id });

  // Logic: If user provides an option, use it. If not, fallback to linked account.
  // Original logic checked account existence first, which might block usage if someone just wants to query a specific user without linking.
  // However, looking at original code:
  // if (account.length < 1) ... returns noAccountEmbed.
  // This implies the bot FORCES linking to use commands without args? 
  // Wait, line 15: let args = interaction.options.getString('username-tag') || account[0]?.valorantAccount;
  // If line 7 checks (account.length < 1), then it forces linking even if args are provided?
  // Let's re-read the original logic.
  // Original:
  // const account = await Account.find...
  // if (account.length < 1) { return ... noAccountEmbed ... }
  // This explicitly BLOCKS usage if not linked.
  // AND THEN it sets args.

  // We should probably allow usage if args are provided, even if not linked?
  // But to adhere to "refactoring" and not "changing logic behaviors" unnecessarily unless requested...
  // The error message says: "Please connect your VALORANT account ... to view player statistics."
  // Ideally, if I type /stats username#tag, I shouldn't need a linked account.
  // But the original code forced it. 
  // Let's IMPROVE it as we are "refining".

  const providedArgs = interaction.options.getString('username-tag');

  if (providedArgs) {
    if (providedArgs.includes('@')) {
      // Handle mentions: <@123456>
      try {
        const mentionedID = providedArgs.replace(/\D/g, '');
        const taggedAccount = await ValorantAccount.findOne({ discordId: mentionedID });
        if (!taggedAccount) {
          return await interaction.editReply({
            embeds: [noAccountEmbed], // Or a specific "User not linked" embed
            components: [buttons],
            ephemeral: true,
          });
        }
        return taggedAccount.valorantAccount;
      } catch (error) {
        return await interaction.editReply({
          embeds: [errorEmbed],
          components: [helpButtons],
          ephemeral: true,
        });
      }
    }
    return providedArgs;
  }

  // If no args provided,  // Check if there is an account linked
  if (!account) { // Removed `&& !args` as `args` is not defined here and `providedArgs` is already checked
    await interaction.editReply({
      embeds: [noAccountEmbed()],
      components: [buttons],
      ephemeral: true,
    });
    return false;
  }
  return account.valorantAccount;
}

module.exports = { getArgs };
