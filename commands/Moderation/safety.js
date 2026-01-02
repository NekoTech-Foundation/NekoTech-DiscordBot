const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const guildData = require('../../models/guildDataSchema');
const SafetyManager = require('../../utils/SafetyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('safety')
        .setDescription('Configure safety systems (AntiNuke, AntiHoist)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup(group =>
            group.setName('antinuke')
                .setDescription('Configure AntiNuke settings')
                .addSubcommand(sub =>
                    sub.setName('toggle')
                        .setDescription('Enable or disable AntiNuke')
                        .addBooleanOption(option => option.setName('enabled').setDescription('Enable?').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('limit')
                        .setDescription('Set limits for AntiNuke actions')
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Action type')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Ban', value: 'ban' },
                                    { name: 'Kick', value: 'kick' },
                                    { name: 'Channel Delete', value: 'channelDelete' },
                                    { name: 'Role Delete', value: 'roleDelete' }
                                )
                        )
                        .addIntegerOption(option => option.setName('threshold').setDescription('Max actions allowed').setRequired(true))
                        .addIntegerOption(option => option.setName('period').setDescription('Time period in seconds (default 60)').setRequired(false))
                )
        )
        .addSubcommandGroup(group =>
            group.setName('antihoist')
                .setDescription('Configure AntiHoist settings')
                .addSubcommand(sub =>
                    sub.setName('toggle')
                        .setDescription('Enable or disable AntiHoist')
                        .addBooleanOption(option => option.setName('enabled').setDescription('Enable?').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('action')
                        .setDescription('Set AntiHoist action')
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Action to take')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Change Nickname', value: 'nickname' },
                                    { name: 'Kick User', value: 'kick' }
                                )
                        )
                )
        )
        .addSubcommandGroup(group =>
            group.setName('whitelist')
                .setDescription('Manage whitelist for Safety systems')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Add user or role to whitelist')
                        .addUserOption(option => option.setName('user').setDescription('User to whitelist'))
                        .addRoleOption(option => option.setName('role').setDescription('Role to whitelist'))
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Remove user or role from whitelist')
                        .addUserOption(option => option.setName('user').setDescription('User to remove'))
                        .addRoleOption(option => option.setName('role').setDescription('Role to remove'))
                )

        )
        .addSubcommandGroup(group =>
            group.setName('commands')
                .setDescription('Manage command availability')
                .addSubcommand(sub =>
                    sub.setName('disable')
                        .setDescription('Disable a command in this server')
                        .addStringOption(option => option.setName('command').setDescription('Name of the command to disable').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('enable')
                        .setDescription('Enable a disabled command')
                        .addStringOption(option => option.setName('command').setDescription('Name of the command to enable').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('List all disabled commands')
                )
        ),
    category: 'Moderation',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        let data = await guildData.findOne({ guildID: guildId });
        if (!data) data = await guildData.create({ guildID: guildId });
        // Ensure safety object exists
        await SafetyManager.getGuildSettings(guildId); 
        // Re-fetch to get the initialized object
        data = await guildData.findOne({ guildID: guildId });

        if (group === 'antinuke') {
            if (subcommand === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                data.safety.antinuke.enabled = enabled;
                await data.save();
                return interaction.editReply(`AntiNuke has been **${enabled ? 'ENABLED' : 'DISABLED'}**.`);
            } else if (subcommand === 'limit') {
                const type = interaction.options.getString('type');
                const threshold = interaction.options.getInteger('threshold');
                const period = interaction.options.getInteger('period') || 60;

                data.safety.antinuke.limits[type] = {
                    threshold: threshold,
                    period: period * 1000
                };
                await data.save();
                return interaction.editReply(`Set limit for **${type}** to **${threshold}** actions per **${period}** seconds.`);
            }
        } else if (group === 'antihoist') {
            if (subcommand === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                data.safety.antihoist.enabled = enabled;
                await data.save();
                return interaction.editReply(`AntiHoist has been **${enabled ? 'ENABLED' : 'DISABLED'}**.`);
            } else if (subcommand === 'action') {
                const action = interaction.options.getString('type');
                data.safety.antihoist.action = action;
                await data.save();
                return interaction.editReply(`AntiHoist action set to **${action}**.`);
            }
        } else if (group === 'whitelist') {
            const user = interaction.options.getUser('user');
            const role = interaction.options.getRole('role');
            const target = subcommand === 'add' ? 'added to' : 'removed from';

            if (user) {
                const list = data.safety.antinuke.whitelistedUsers;
                if (subcommand === 'add' && !list.includes(user.id)) list.push(user.id);
                else if (subcommand === 'remove') {
                    const index = list.indexOf(user.id);
                    if (index > -1) list.splice(index, 1);
                }
                data.safety.antinuke.whitelistedUsers = list; // Mongoose should detect change
                data.markModified('safety.antinuke.whitelistedUsers');
            }

            if (role) {
                const list = data.safety.antinuke.whitelistedRoles;
                if (subcommand === 'add' && !list.includes(role.id)) list.push(role.id);
                else if (subcommand === 'remove') {
                    const index = list.indexOf(role.id);
                    if (index > -1) list.splice(index, 1);
                }
                data.safety.antinuke.whitelistedRoles = list;
                data.markModified('safety.antinuke.whitelistedRoles');
            }

            await data.save();
            return interaction.editReply(`Successfully ${target} whitelist.`);
        } else if (group === 'commands') {
            const commandName = interaction.options.getString('command');

            if (subcommand === 'list') {
                const disabled = data.safety.disabledCommands || [];
                if (disabled.length === 0) {
                    return interaction.editReply('✅ No commands are disabled in this server.');
                }
                const embed = new EmbedBuilder()
                    .setTitle('🚫 Disabled Commands')
                    .setDescription(disabled.map(c => `• \`/${c}\``).join('\n'))
                    .setColor('#FF0000');
                return interaction.editReply({ embeds: [embed] });
            }

            // Validation: Prevent disabling vital commands
            const vitalCommands = ['safety', 'ping', 'help'];
            if (vitalCommands.includes(commandName)) {
                return interaction.editReply(`❌ You cannot disable the \`/${commandName}\` command as it is vital for server management.`);
            }

            // Validation: Check if command exists
            const cmd = interaction.client.slashCommands.get(commandName);
            if (!cmd) {
                return interaction.editReply(`❌ Command \`/${commandName}\` does not exist.`);
            }

            let disabled = data.safety.disabledCommands || [];
            
            if (subcommand === 'disable') {
                if (disabled.includes(commandName)) {
                    return interaction.editReply(`ℹ️ Command \`/${commandName}\` is already disabled.`);
                }
                disabled.push(commandName);
                if (!data.safety.disabledCommands) data.safety.disabledCommands = [];
                data.safety.disabledCommands = disabled;
                data.markModified('safety.disabledCommands'); // Ensure array change is detected
                await data.save();
                return interaction.editReply(`🚫 Command \`/${commandName}\` has been **DISABLED** in this server.`);
            } else if (subcommand === 'enable') {
                if (!disabled.includes(commandName)) {
                    return interaction.editReply(`ℹ️ Command \`/${commandName}\` is not disabled.`);
                }
                disabled = disabled.filter(c => c !== commandName);
                data.safety.disabledCommands = disabled;
                data.markModified('safety.disabledCommands');
                await data.save();
                return interaction.editReply(`✅ Command \`/${commandName}\` has been **ENABLED**.`);
            }
        }
    }
};
