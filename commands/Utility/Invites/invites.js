const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Invite = require('../../../models/inviteSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Check and manage invites')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Check how many invites a user has')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to check invites for')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add invites to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to add invites to')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('The amount of invites to add')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove invites from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove invites from')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('The amount of invites to remove')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset a user\'s invites to 0')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to reset invites for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset-all')
                .setDescription('Reset all invites in the server to 0')
                .addStringOption(option =>
                    option.setName('confirm')
                        .setDescription('Type "confirm" to reset all invites')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: 'Utility',
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guildId = interaction.guild.id;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand !== 'user' && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({ content: 'You need Administrator permissions to use this command.', flags: MessageFlags.Ephemeral });
        }

        if (subcommand === 'user') {
            const user = interaction.options.getUser('user') || interaction.user;

            try {
                const userInvites = await Invite.find({ guildID: guildId, inviterID: user.id });
                const inviteCount = userInvites.reduce((acc, invite) => acc + invite.uses, 0);

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`Invite Stats for ${user.tag}`)
                    .setDescription(`<@${user.id}> has ${inviteCount} invite(s).`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error('Error fetching invite data:', error);
                return interaction.editReply({ content: 'There was an error fetching the invite data.', flags: MessageFlags.Ephemeral });
            }
        }

        if (subcommand === 'reset-all') {
            const confirmation = interaction.options.getString('confirm');
            
            if (confirmation.toLowerCase() !== 'confirm') {
                return interaction.editReply({ 
                    content: 'You must type "confirm" to reset all invites in the server.',
                    flags: MessageFlags.Ephemeral 
                });
            }

            try {
                const result = await Invite.updateMany(
                    { guildID: guildId },
                    { $set: { uses: 0 } }
                );

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Server Invites Reset')
                    .setDescription(`Successfully reset invites for ${result.modifiedCount} users.`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error('Error resetting all invites:', error);
                return interaction.editReply({ 
                    content: 'There was an error resetting all invites.',
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

        const targetUser = interaction.options.getUser('user');
        
        try {
            let userInvites = await Invite.findOne({ guildID: guildId, inviterID: targetUser.id });
            const amount = interaction.options.getInteger('amount');
            let message = '';

            const generateInviteCode = () => {
                return `ADMIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            };

            if (!userInvites) {
                userInvites = new Invite({
                    inviteCode: generateInviteCode(),
                    guildID: guildId,
                    inviterID: targetUser.id,
                    uses: 0
                });
            }

            switch (subcommand) {
                case 'add':
                    userInvites.uses += amount;
                    message = `Added ${amount} invite(s) to ${targetUser.tag}`;
                    break;

                case 'remove':
                    const removeAmount = Math.min(amount, userInvites.uses);
                    userInvites.uses = Math.max(0, userInvites.uses - removeAmount);
                    message = `Removed ${removeAmount} invite(s) from ${targetUser.tag}`;
                    break;

                case 'reset':
                    userInvites.uses = 0;
                    message = `Reset invites for ${targetUser.tag}`;
                    break;
            }

            await userInvites.save();

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Invite Management')
                .setDescription(message)
                .addFields({ name: 'Current Invites', value: userInvites.uses.toString() })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Error managing invites:', error);
            return interaction.editReply({ content: 'There was an error managing the invites.', flags: MessageFlags.Ephemeral });
        }
    }
};