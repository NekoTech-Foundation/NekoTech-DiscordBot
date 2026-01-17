const { getData } = require('../../../../utils/Valorant/api');
const { Overview } = require('../../../../utils/Valorant/constants/overview');
const { DataType } = require('../../../../utils/Valorant/constants/types');
const { getAuthor } = require('../../../../utils/Valorant/functions/getAuthor');
const { getArgs } = require('../../../../utils/Valorant/functions/getArgs');
const { handlePages } = require('../../../../utils/Valorant/functions/handlePages');
const { createEmbed } = require('../../../../utils/Valorant/functions/createEmbed');
const { handleResponse } = require('../../../../utils/Valorant/functions/handleResponse');

module.exports = {
    async execute(interaction) {
        await interaction.deferReply();
        const playerID = encodeURIComponent(await getArgs(interaction));
        if (!playerID) return;

        const [trackerProfile, trackerOverview] = await Promise.all([
            getData(playerID, DataType.PROFILE),
            getData(playerID, DataType.SNOWBALL_OVERVIEW),
        ]);

        const dataSources = [trackerOverview, trackerProfile];
        if (!(await handleResponse(interaction, dataSources))) return;

        const profileOverview = trackerOverview.data.data[0].stats;
        const author = getAuthor(trackerProfile.data.data, playerID);
        const stats = Overview(profileOverview);

        const embeds = [
            createEmbed(
                'Snowball Fight Stats',
                [
                    { name: 'KDR', value: '```ansi\n\u001b[2;36m' + stats.kdrRatio + '\n```', inline: true },
                    { name: 'Kills', value: '```ansi\n\u001b[2;36m' + stats.kills + '\n```', inline: true },
                    { name: 'Deaths', value: '```ansi\n\u001b[2;36m' + stats.deaths + '```', inline: true },
                    { name: 'Assists', value: '```ansi\n\u001b[2;36m' + stats.assists + '\n```', inline: true },
                    { name: 'Win %', value: '```ansi\n\u001b[2;36m' + stats.winRatePct + '\n```', inline: true },
                    {
                        name: 'Playtime',
                        value: '```ansi\n\u001b[2;36m' + stats.timePlayed + '\n```',
                        inline: true,
                    },
                    { name: 'Matches', value: '```ansi\n\u001b[2;36m' + (stats.matchesWon + stats.matchesLost + stats.matchesTied) + '\n```', inline: true },
                    { name: 'Wins', value: '```ansi\n\u001b[2;36m' + stats.matchesWon + '\n```', inline: true },
                ],
                author
            ),
        ];

        handlePages(interaction, embeds, author);
    },
};
