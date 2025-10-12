const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, Colors, MessageFlags } = require('discord.js');
const BotActivity = require('../../models/BotActivity');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botactivity')
        .setDescription('Manage the bot activity settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add or update a bot activity status')
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('The status message to display (supports placeholders)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('activity_type')
                        .setDescription('The activity type (WATCHING, PLAYING, etc.)')
                        .setRequired(true)
                        .addChoices(
                            { name: 'WATCHING', value: 'WATCHING' },
                            { name: 'PLAYING', value: 'PLAYING' },
                            { name: 'COMPETING', value: 'COMPETING' },
                            { name: 'STREAMING', value: 'STREAMING' }
                        ))
                .addStringOption(option =>
                    option.setName('status_type')
                        .setDescription('The bot\'s online status (online, dnd, idle, invisible)')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Online', value: 'online' },
                            { name: 'Do Not Disturb', value: 'dnd' },
                            { name: 'Idle', value: 'idle' },
                            { name: 'Invisible', value: 'invisible' }
                        ))
                .addStringOption(option =>
                    option.setName('streaming_url')
                        .setDescription('The streaming URL (only needed if activity type is STREAMING)')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a bot activity status by its index')
                .addIntegerOption(option =>
                    option.setName('index')
                        .setDescription('The index of the status to remove (1-based index)')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all current bot activity statuses')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('placeholders')
                .setDescription('List all available placeholders for bot activities')
    ),
    category: 'Utility',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setTitle('Permission Denied')
                    .setDescription('You do not have the required permissions to use this command.')
                    .setFooter({ text: 'Manage Guild permission required.' })
                ],
                flags: MessageFlags.Ephemeral
            });
        }

        const subCommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        let botActivityData = await BotActivity.findOne({ guildId });

        if (!botActivityData) {
            botActivityData = new BotActivity({ guildId });
        }

        if (subCommand === 'add') {
            const status = interaction.options.getString('status');
            const activityType = interaction.options.getString('activity_type');
            const statusType = interaction.options.getString('status_type');
            const streamingURL = interaction.options.getString('streaming_url');

            botActivityData.activities.push({
                status,
                activityType,
                statusType,
                streamingURL: activityType === 'STREAMING' ? streamingURL : null
            });

            await botActivityData.save();

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle('Bot Activity Added')
                    .setDescription(`A new bot activity status has been successfully added.`)
                    .addFields(
                        { name: 'Status', value: `\`${status}\``, inline: true },
                        { name: 'Activity Type', value: `\`${activityType}\``, inline: true },
                        { name: 'Status Type', value: `\`${statusType}\``, inline: true }
                    )
                    .setFooter({ text: 'Bot activity management' })
                ],
                flags: MessageFlags.Ephemeral
            });

        } else if (subCommand === 'remove') {
            const index = interaction.options.getInteger('index') - 1;

            if (index < 0 || index >= botActivityData.activities.length) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setTitle('Invalid Index')
                        .setDescription('The provided index is invalid. Please provide a valid status index.')
                        .setFooter({ text: 'Use the list command to see current statuses.' })
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }

            const removedActivity = botActivityData.activities.splice(index, 1);
            await botActivityData.save();

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(Colors.Orange)
                    .setTitle('Bot Activity Removed')
                    .setDescription(`The bot activity status has been successfully removed.`)
                    .addFields(
                        { name: 'Removed Status', value: `\`${removedActivity[0].status}\``, inline: true },
                        { name: 'Activity Type', value: `\`${removedActivity[0].activityType}\``, inline: true }
                    )
                    .setFooter({ text: 'Bot activity management' })
                ],
                flags: MessageFlags.Ephemeral
            });

        } else if (subCommand === 'list') {
            if (botActivityData.activities.length === 0) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(Colors.Yellow)
                        .setTitle('No Bot Activities')
                        .setDescription('No bot activity statuses are currently configured.')
                        .setFooter({ text: 'Use the add command to configure a new status.' })
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }

            const embed = new EmbedBuilder()
                .setColor(Colors.Blurple)
                .setTitle('Configured Bot Activity Statuses')
                .setDescription('Below are the current bot activity statuses for this server:');

            botActivityData.activities.forEach((activity, index) => {
                let activityDetails = `**Status ${index + 1}:** \`${activity.status}\`\n`;
                activityDetails += `**Type:** ${activity.activityType} | **Presence:** ${activity.statusType}`;

                if (activity.activityType === 'STREAMING' && activity.streamingURL) {
                    activityDetails += ` | **URL:** [Link](${activity.streamingURL})`;
                }

                embed.addFields({ name: '\u200B', value: activityDetails });
            });

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } else if (subCommand === 'placeholders') {
            const placeholderList = `
**Available Placeholders:**
\`{total-users}\` - Total members in the server
\`{total-channels}\` - Total channels in the server
\`{total-messages}\` - Total messages sent
\`{online-members}\` - Number of online members
\`{uptime}\` - Bot's uptime
\`{total-boosts}\` - Number of server boosts
\`{total-cases}\` - Total moderation cases handled
\`{total-suggestions}\` - Total suggestions submitted
\`{times-bot-started}\` - Number of times the bot has started
\`{open-tickets}\` - Number of open tickets
\`{closed-tickets}\` - Number of closed tickets
\`{deleted-tickets}\` - Number of deleted tickets
\`{total-tickets}\` - Total tickets created`;

            const embed = new EmbedBuilder()
                .setColor(Colors.Blurple)
                .setTitle('Bot Activity Placeholders')
                .setDescription(placeholderList)
                .setFooter({ text: 'Use these placeholders in your bot activities' });

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    },
};