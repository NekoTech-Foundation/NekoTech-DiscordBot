const { SlashCommandBuilder, ChannelType, PermissionsBitField, MessageFlags } = require('discord.js');
const ChannelStat = require('../../models/channelStatSchema');
const Ticket = require('../../models/tickets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channelstats')
        .setDescription('Manage channel statistics')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a channel stat')
                .addStringOption(option =>
                    option.setName('channelname')
                        .setDescription('The name of the channel with {stats} placeholder')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of the stat')
                        .setRequired(true)
                        .addChoices(
                            { name: 'MemberCount', value: 'MemberCount' },
                            { name: 'NitroBoosterCount', value: 'NitroBoosterCount' },
                            { name: 'ServerCreationDate', value: 'ServerCreationDate' },
                            { name: 'TotalRolesCount', value: 'TotalRolesCount' },
                            { name: 'TotalEmojisCount', value: 'TotalEmojisCount' },
                            { name: 'TotalChannelsCount', value: 'TotalChannelsCount' },
                            { name: 'OnlineMembersCount', value: 'OnlineMembersCount' },
                            { name: 'ServerRegion', value: 'ServerRegion' },
                            { name: 'TotalBannedMembers', value: 'TotalBannedMembers' },
                            { name: 'TotalMembersWithRole', value: 'TotalMembersWithRole' },
                            { name: 'OnlineMembersWithRole', value: 'OnlineMembersWithRole' },
                            { name: 'TotalTickets', value: 'TotalTickets' },
                            { name: 'OpenTickets', value: 'OpenTickets' },
                            { name: 'ClosedTickets', value: 'ClosedTickets' },
                            { name: 'DeletedTickets', value: 'DeletedTickets' }
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The voice channel to update')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to count (required for role-based stats)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a channel stat')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The voice channel stat to remove')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice))),
    category: 'Utility',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();
        const channelName = interaction.options.getString('channelname');
        const type = interaction.options.getString('type');
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const guildId = interaction.guild.id;

        if (subcommand === 'add') {
            if (!channelName.includes('{stats}')) {
                return interaction.reply({ content: 'The channel name must include the {stats} placeholder.', flags: MessageFlags.Ephemeral });
            }

            if ((type === 'TotalMembersWithRole' || type === 'OnlineMembersWithRole') && !role) {
                return interaction.reply({ content: 'You must specify a role for this stat type.', flags: MessageFlags.Ephemeral });
            }

            try {
                const existingStat = await ChannelStat.findOne({ guildId: guildId, channelId: channel.id });
                if (existingStat) {
                    return interaction.reply({ content: `This channel already has a stat set.`, flags: MessageFlags.Ephemeral });
                }

                let newChannelName = channelName;

                if (['TotalTickets', 'OpenTickets', 'ClosedTickets', 'DeletedTickets'].includes(type)) {
                    const ticketCount = await Ticket.countDocuments({ 
                        guildId,
                        ...(type === 'OpenTickets' && { status: 'open' }),
                        ...(type === 'ClosedTickets' && { status: 'closed' }),
                        ...(type === 'DeletedTickets' && { status: 'deleted' })
                    });
                    
                    const formattedCount = new Intl.NumberFormat('en-US').format(ticketCount);
                    newChannelName = channelName.replace('{stats}', formattedCount);
                } else if (type === 'ServerRegion') {
                    const region = interaction.guild.preferredLocale || 'en-US';
                    newChannelName = channelName.replace('{stats}', region);
                } else if (type === 'ServerCreationDate') {
                    const creationDate = interaction.guild.createdAt;
                    const formattedDate = creationDate.toLocaleDateString('en-US', { 
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    newChannelName = channelName.replace('{stats}', formattedDate);
                }

                await channel.setName(newChannelName).catch(console.error);

                const newStat = new ChannelStat({
                    guildId: guildId,
                    type: type,
                    channelId: channel.id,
                    channelName: channelName,
                    roleId: role ? role.id : null
                });
                await newStat.save();
                await interaction.reply({ content: `Added stat for channel **${channel.name}** with type **${type}**${role ? ` and role **${role.name}**` : ''}.`, flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Failed to add the channel stat. Please try again later.', flags: MessageFlags.Ephemeral });
            }
        } else if (subcommand === 'remove') {
            try {
                const stat = await ChannelStat.findOneAndDelete({ guildId: guildId, channelId: channel.id });
                if (stat) {
                    await interaction.reply({ content: `Removed stat for channel **${channel.name}**.`, flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: `Stat for channel **${channel.name}** not found.`, flags: MessageFlags.Ephemeral });
                }
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Failed to remove the channel stat. Please try again later.', flags: MessageFlags.Ephemeral });
            }
        }
    },
};
