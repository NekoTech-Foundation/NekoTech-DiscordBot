const ServerStats = require('../../../models/ServerStats');
const { fetchServerStats, createStatsEmbed } = require('./cmd_server_stats.js');

module.exports = {
    onLoad: (client) => {
        console.log('ServerStats addon loaded. Starting refresh interval.');
        setInterval(async () => {
            const allStatsSetups = await ServerStats.find();

            for (const setup of allStatsSetups) {
                try {
                    const guild = await client.guilds.fetch(setup.guildId);
                    const channel = await guild.channels.fetch(setup.channelId);
                    const message = await channel.messages.fetch(setup.messageId);

                    const stats = await fetchServerStats(guild);
                    const embed = createStatsEmbed(stats, guild);

                    await message.edit({ embeds: [embed] });
                } catch (error) {
                    console.error(`Failed to refresh server stats for guild ${setup.guildId}:`, error);
                    // If the channel or message is deleted, we should probably remove the setup from the DB
                    if (error.code === 10003 || error.code === 10008) {
                        await ServerStats.findByIdAndDelete(setup._id);
                        console.log(`Removed stale server stats setup for guild ${setup.guildId}`);
                    }
                }
            }
        }, 24 * 60 * 60 * 1000); // 24 hours
    }
};
