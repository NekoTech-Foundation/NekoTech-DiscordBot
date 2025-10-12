const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const Invite = require('../../../models/inviteSchema');
const UserData = require('../../../models/UserData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inviter')
        .setDescription('Displays who invited a specified user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check inviter for')
                .setRequired(false)),
    category: 'Utility',
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const user = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        try {
            const inviteData = await Invite.findOne({ guildID: guildId, 'joinedUsers.userID': user.id });

            if (!inviteData) {
                return interaction.editReply({ content: 'Could not find the inviter for this user.', flags: MessageFlags.Ephemeral });
            }

            const inviter = await interaction.client.users.fetch(inviteData.inviterID);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`Inviter Information`)
                .setDescription(`${user.tag} was invited by ${inviter.tag}.`)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Error fetching inviter data:', error);
            return interaction.editReply({ content: 'There was an error fetching the inviter data.', flags: MessageFlags.Ephemeral });
        }
    }
};