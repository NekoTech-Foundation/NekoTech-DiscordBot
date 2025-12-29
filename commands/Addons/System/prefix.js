const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../../models/GuildSettings');
const { getConfig } = require('../../../utils/configLoader');
const { loadLang } = require('../../../utils/langLoader');

const config = getConfig();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Manage the bot prefix for this server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a custom prefix for this server')
                .addStringOption(option =>
                    option.setName('new_prefix')
                        .setDescription('The new prefix to set')
                        .setRequired(true)
                        .setMaxLength(5)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset the prefix to default (k)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the current prefix'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const lang = loadLang(guildId);
        const prefixLang = lang.Addons.System.Prefix;

        let guildSettings = await GuildSettings.findOne({ guildId });
        if (!guildSettings) {
            guildSettings = await GuildSettings.create({ guildId });
        }

        if (subcommand === 'set') {
            const newPrefix = interaction.options.getString('new_prefix');

            if (newPrefix.includes(' ')) {
                return interaction.reply({
                    content: prefixLang.Errors.Spaces,
                    ephemeral: true
                });
            }

            guildSettings.prefix = newPrefix;
            await guildSettings.save();

            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Success || '#00FF00')
                .setColor(config.EmbedColors.Success || '#00FF00')
                .setTitle(prefixLang.UI.Updated)
                .setDescription(prefixLang.UI.UpdatedDesc.replace('{prefix}', newPrefix))
                .setFooter({ text: prefixLang.UI.RequestedBy.replace('{user}', interaction.user.tag), iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'reset') {
            guildSettings.prefix = 'k';
            await guildSettings.save();

            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Success || '#00FF00')
                .setColor(config.EmbedColors.Success || '#00FF00')
                .setTitle(prefixLang.UI.Reset)
                .setDescription(prefixLang.UI.ResetDesc)
                .setFooter({ text: prefixLang.UI.RequestedBy.replace('{user}', interaction.user.tag), iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'view') {
            const currentPrefix = guildSettings.prefix || 'k';

            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Default || '#0099ff')
                .setColor(config.EmbedColors.Default || '#0099ff')
                .setTitle(prefixLang.UI.Current)
                .setDescription(prefixLang.UI.CurrentDesc.replace('{prefix}', currentPrefix))
                .setFooter({ text: prefixLang.UI.RequestedBy.replace('{user}', interaction.user.tag), iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    }
};
