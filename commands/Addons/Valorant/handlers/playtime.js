const { EmbedBuilder } = require('discord.js');
const { buttons } = require('../../../../utils/Valorant/components/buttons');
const { DataType } = require('../../../../utils/Valorant/constants/types');
const { getArgs } = require('../../../../utils/Valorant/functions/getArgs');
const { getAuthor } = require('../../../../utils/Valorant/functions/getAuthor');
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
        const stats = trackerOverview.data.data[0].stats;

        // Check if timePlayed exists
        const timePlayed = stats.timePlayed ? stats.timePlayed.displayValue : 'N/A';
        const matchesPlayed = stats.matchesPlayed ? stats.matchesPlayed.displayValue : 'N/A';

        const embed = new EmbedBuilder()
            .setColor('#FF4655')
            .setAuthor(author)
            .setTitle('Total Playtime')
            .setDescription(`**Time Played:** ${timePlayed}\n**Matches Played:** ${matchesPlayed}`)
            .setFooter({ text: 'Valorant Tracker' });

        await interaction.editReply({
            embeds: [embed],
            components: [buttons],
        });
    },
};
