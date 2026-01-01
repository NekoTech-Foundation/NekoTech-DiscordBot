const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Verification = require('../../../models/verificationSchema');
const { getConfig, getLang } = require('../../../utils/configLoader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verification')
        .setDescription('Manage the verification system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configure the verification system')
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The role to give after verification')
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send the verification panel (leave empty to create new)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('The verification mode')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Button (Simple Click)', value: 'BUTTON' },
                            { name: 'Captcha (Visual Puzzle)', value: 'CAPTCHA' }
                        ))
                .addRoleOption(option =>
                    option.setName('unverified_role')
                        .setDescription('Role to give on join (removed after verify)')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Send/Update the verification panel in the configured channel')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View current verification settings')
        ),
    
    async execute(interaction, lang) {
        const client = interaction.client;
        const subcommand = interaction.options.getSubcommand();
        const config = getConfig();
        // const lang = getLang(); // lang passed from handler

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: lang.Global.Permissions, flags: MessageFlags.Ephemeral });
        }

        let data = await Verification.findOne({ guildID: interaction.guildId });
        if (!data) {
            data = await Verification.create({ guildID: interaction.guildId });
        }

        if (subcommand === 'setup') {
            const role = interaction.options.getRole('role');
            const channel = interaction.options.getChannel('channel');
            const mode = interaction.options.getString('mode') || 'BUTTON';
            const unverifiedRole = interaction.options.getRole('unverified_role');

            data.roleID = role.id;
            data.mode = mode;
            if (unverifiedRole) data.unverifiedRoleID = unverifiedRole.id;
            
            let targetChannel = channel;

            // If no channel provided, create one
            if (!targetChannel) {
                try {
                    targetChannel = await interaction.guild.channels.create({
                        name: 'verify',
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: [PermissionFlagsBits.SendMessages],
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                            },
                        ],
                        topic: 'Verify to gain access to the server!'
                    });
                } catch (e) {
                    return interaction.reply({ content: `Failed to create channel: ${e.message}`, flags: MessageFlags.Ephemeral });
                }
            }
            
            data.channelID = targetChannel.id;
            await data.save();

            // Send success message and hint to use /verification panel
            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Success)
                .setTitle('Verification Setup Complete')
                .setDescription(`
**Channel:** ${targetChannel}
**Verified Role:** ${role}
**Mode:** ${mode}
${unverifiedRole ? `**Unverified Role:** ${unverifiedRole}` : ''}

Use \`/verification panel\` to post the verification message.
                `);
            
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'panel') {
            if (!data.channelID) {
                return interaction.reply({ content: 'Please run `/verification setup` first!', flags: MessageFlags.Ephemeral });
            }

            const channel = interaction.guild.channels.cache.get(data.channelID);
            if (!channel) {
                return interaction.reply({ content: 'Configured channel not found. Please run setup again.', flags: MessageFlags.Ephemeral });
            }

            // Construct Panel
            const embed = new EmbedBuilder()
                .setTitle(config.VerificationSettings?.VerificationEmbed?.Title || 'Server Verification')
                .setDescription(config.VerificationSettings?.VerificationEmbed?.Description || 'Click the button below to verify yourself and gain access to the server.')
                .setColor(config.EmbedColors.Default);
            
            if (config.VerificationSettings?.VerificationEmbed?.Image) {
                embed.setImage(config.VerificationSettings.VerificationEmbed.Image);
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('verifyButton')
                        .setLabel(config.VerificationSettings?.VerificationButton?.Name || 'Verify')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji(config.VerificationSettings?.VerificationButton?.Emoji || '✅')
                );

            try {
                // Check if we can edit existing message
                if (data.msgID) {
                    const msg = await channel.messages.fetch(data.msgID).catch(() => null);
                    if (msg) {
                        await msg.edit({ embeds: [embed], components: [row] });
                        return interaction.reply({ content: `Updated verification panel in ${channel}.`, flags: MessageFlags.Ephemeral });
                    }
                }

                const msg = await channel.send({ embeds: [embed], components: [row] });
                data.msgID = msg.id;
                await data.save();
                
                return interaction.reply({ content: `Sent verification panel to ${channel}.`, flags: MessageFlags.Ephemeral });

            } catch (error) {
                console.error(error);
                return interaction.reply({ content: 'Failed to send panel. Check permissions.', flags: MessageFlags.Ephemeral });
            }
        }

        if (subcommand === 'info') {
             const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Default)
                .setTitle('Verification Settings')
                .addFields(
                    { name: 'Channel', value: data.channelID ? `<#${data.channelID}>` : 'Not Set', inline: true },
                    { name: 'Verified Role', value: data.roleID ? `<@&${data.roleID}>` : 'Not Set', inline: true },
                    { name: 'Mode', value: data.mode || 'BUTTON', inline: true },
                    { name: 'Unverified Role', value: data.unverifiedRoleID ? `<@&${data.unverifiedRoleID}>` : 'None', inline: true },
                );
            return interaction.reply({ embeds: [embed] });
        }
    }
};
