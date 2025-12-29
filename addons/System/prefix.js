const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const { getConfig, getLang } = require('../../utils/configLoader');

const config = getConfig();
const lang = getLang();

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

        let guildSettings = await GuildSettings.findOne({ guildId });
        if (!guildSettings) {
            guildSettings = await GuildSettings.create({ guildId });
        }

        if (subcommand === 'set') {
            const newPrefix = interaction.options.getString('new_prefix');

            if (newPrefix.includes(' ')) {
                return interaction.reply({
                    content: 'Prefix cannot contain spaces.',
                    ephemeral: true
                });
            }

            guildSettings.prefix = newPrefix;
            await guildSettings.save();

            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Success || '#00FF00')
                .setTitle('Prefix Updated')
                .setDescription(`The prefix for this server has been set to \`${newPrefix}\``)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'reset') {
            guildSettings.prefix = 'k';
            await guildSettings.save();

            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Success || '#00FF00')
                .setTitle('Prefix Reset')
                .setDescription(`The prefix for this server has been reset to default: \`k\``)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'view') {
            const currentPrefix = guildSettings.prefix || 'k';

            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Default || '#0099ff')
                .setTitle('Current Prefix')
                .setDescription(`The current prefix for this server is: \`${currentPrefix}\``)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    }
};
