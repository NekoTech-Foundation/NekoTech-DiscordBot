const { EmbedBuilder } = require('discord.js');
const { buttons } = require('../../../../utils/Valorant/components/buttons');
const { DataType } = require('../../../../utils/Valorant/constants/types');
const { getAuthor } = require('../../../../utils/Valorant/functions/getAuthor');
const { getArgs } = require('../../../../utils/Valorant/functions/getArgs');
const { getData } = require('../../../../utils/Valorant/api');
const { handleResponse } = require('../../../../utils/Valorant/functions/handleResponse');

module.exports = {
  async execute(interaction) {
    await interaction.deferReply();
    const playerID = encodeURIComponent(await getArgs(interaction));
    if (!playerID) return;

    const [trackerProfile, trackerOverview] = await Promise.all([
      getData(playerID, DataType.PROFILE),
      getData(playerID, DataType.COMP_OVERVIEW),
    ]);

    const dataSources = [trackerOverview, trackerProfile];
    if (!(await handleResponse(interaction, dataSources))) return;

    const author = getAuthor(trackerProfile.data.data, playerID);

    const weaponObjects = trackerOverview.data.data.filter((item) => item.type === 'weapon');

    weaponObjects.sort((a, b) => b.stats.kills.value - a.stats.kills.value);
    const maxWeaponsToShow = Math.min(weaponObjects.length, 5);
    let topWeapons = weaponObjects.slice(0, maxWeaponsToShow);

    const weaponEmbed = new EmbedBuilder()
      .setColor('#11806A')
      .setAuthor(author)
      .setThumbnail(author.iconURL)
      .setDescription(`\`\`\`grey\n            Top ${maxWeaponsToShow} - Weapon Stats\n\`\`\``)
      .setFooter({ text: 'Competitive Weapons Only' });

    topWeapons.forEach((weapon) => {
      const {
        metadata: { name },
        stats: {
          kills: { displayValue: weaponKills },
          deaths: { displayValue: weaponDeathsBy },
          headshotsPercentage: { displayValue: weaponHeadshotPct },
          damagePerRound: { displayValue: weaponDamageRound },
          roundsPlayed: { displayValue: weaponRoundsPlayed },
          longestKillDistance: { value: weaponLongestKillDistance },
        },
      } = weapon;

      const weaponKillDistanceInMeters = (weaponLongestKillDistance / 100).toFixed(0);

      weaponEmbed.addFields({
        name: `${name}     |     Rounds Used: ${weaponRoundsPlayed}     |     Furthest Kill: ${weaponKillDistanceInMeters} m`,
        value: `\`\`\`ansi\n\u001b[2;34mK:${weaponKills}\u001b[0;0m / \u001b[2;35mD:${weaponDeathsBy}\u001b[0;0m | \u001b[2;36mHS:${weaponHeadshotPct}\u001b[0;0m | \u001b[2;33mDMG/R:${weaponDamageRound}\n\`\`\``,
        inline: false,
      });
    });

    return await interaction.editReply({
      embeds: [weaponEmbed],
      components: [buttons],
    });
  },
};
