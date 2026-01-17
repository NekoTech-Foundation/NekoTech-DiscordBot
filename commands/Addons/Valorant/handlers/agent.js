const { EmbedBuilder } = require('discord.js');
const { buttons } = require('../../../../utils/Valorant/components/buttons');
const { DataType } = require('../../../../utils/Valorant/constants/types');
const { getAuthor } = require('../../../../utils/Valorant/functions/getAuthor');
const { getArgs } = require('../../../../utils/Valorant/functions/getArgs');
const { getData } = require('../../../../utils/Valorant/api');
const { handleResponse } = require('../../../../utils/Valorant/functions/handleResponse');
const assets = require('../../../../utils/Valorant/assets.json');

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

    const agentStats = trackerOverview.data.data.filter((item) => item.type === 'agent');

    agentStats.sort((a, b) => b.stats.timePlayed.value - a.stats.timePlayed.value);
    const maxAgentsToShow = Math.min(agentStats.length, 5);
    const topAgents = agentStats.slice(0, maxAgentsToShow);

    const agentEmbed = new EmbedBuilder()
      .setColor('#11806A')
      .setAuthor(author)
      .setThumbnail(author.iconURL)
      .setDescription(`\`\`\`grey\n            Top ${maxAgentsToShow} - Agents Played\n\`\`\``)
      .setFooter({ text: 'Competitive Agents Only' });

    topAgents.forEach((agent) => {
      const {
        metadata: { name },
        stats: {
          timePlayed: { displayValue: agentTimePlayed },
          kills: { displayValue: agentKills },
          deaths: { displayValue: agentDeaths },
          assists: { displayValue: agentAssists },
          kDRatio: { displayValue: agentKDRatio },
          damagePerRound: { displayValue: agentDamageRound },
          matchesWinPct: { displayValue: agentWinRate },
        },
      } = agent;

      const agentEmoji = assets.agentEmojis[name]?.emoji || ':white_small_square:';

      agentEmbed.addFields({
        name: `${name} ${agentEmoji}    |    Time Played: ${agentTimePlayed}    |    Win Rate: ${agentWinRate}`,
        value: `\`\`\`ansi\n\u001b[2;34mK:${agentKills}\u001b[0;0m / \u001b[2;35mD:${agentDeaths}\u001b[0;0m / \u001b[2;36mA:${agentAssists}\u001b[0;0m / \u001b[2;32mR:${agentKDRatio}\u001b[0;0m | \u001b[2;33mDMG/R:${agentDamageRound} \n\`\`\``,
        inline: false,
      });
    });

    return await interaction.editReply({
      embeds: [agentEmbed],
      components: [buttons],
    });
  },
};
