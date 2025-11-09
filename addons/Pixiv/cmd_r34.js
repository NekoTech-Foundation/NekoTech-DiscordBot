const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const { getConfig } = require('../../utils/configLoader.js');

const config = getConfig();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('r34')
        .setDescription('Search for images on Rule34.')
        .addStringOption(option =>
            option.setName('tags')
                .setDescription('The tags to search for, separated by spaces (e.g., "yoruichi_shihouin blonde").')
                .setRequired(true))
        .setNSFW(true),
    category: 'Fun',
    async execute(interaction) {
        const tagsString = interaction.options.getString('tags');
        
        await interaction.deferReply();

        try {
            const params = new URLSearchParams({
                page: 'dapi',
                s: 'post',
                q: 'index',
                json: 1,
                tags: tagsString,
                limit: 100,
                user_id: config.API_Keys.Rule34.UserID,
                api_key: config.API_Keys.Rule34.ApiKey
            });

            const response = await fetch(`https://api.rule34.xxx/index.php?${params}`);
            
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const posts = await response.json();

            if (!posts || posts.length === 0) {
                return await interaction.editReply({ content: 'No results found for the given tags.' });
            }

            let currentIndex = Math.floor(Math.random() * posts.length);

            const createEmbed = (post) => {
                return new EmbedBuilder()
                    .setTitle(`Result for: ${tagsString}`)
                    .setImage(post.file_url)
                    .setColor(config.EmbedColors)
                    .setFooter({ text: `Score: ${post.score} | Rating: ${post.rating} | Image ${currentIndex + 1}/${posts.length}` })
                    .setURL(`https://rule34.xxx/index.php?page=post&s=view&id=${post.id}`);
            };

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('r34_prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('r34_next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                );

            const reply = await interaction.editReply({ 
                embeds: [createEmbed(posts[currentIndex])], 
                components: [row] 
            });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async i => {
                await i.deferUpdate();
                if (i.customId === 'r34_next') {
                    currentIndex = (currentIndex + 1) % posts.length;
                } else if (i.customId === 'r34_prev') {
                    currentIndex = (currentIndex - 1 + posts.length) % posts.length;
                }

                await interaction.editReply({
                    embeds: [createEmbed(posts[currentIndex])],
                    components: [row]
                });
            });

            collector.on('end', collected => {
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('r34_prev_disabled')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('r34_next_disabled')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true)
                    );
                interaction.editReply({ components: [disabledRow] });
            });

        } catch (error) {
            console.error('Error fetching from Rule34:', error);
            await interaction.editReply({ content: 'An error occurred while fetching data from Rule34.' });
        }
    }
};
