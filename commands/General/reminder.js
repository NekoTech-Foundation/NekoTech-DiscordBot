const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const Reminder = require('../../models/reminder');
//const fs = require('fs');
//const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

function setEmbedProperties(embed, embedConfig) {
    if (embedConfig.Color) {
        embed.setColor(hexToDecimal(embedConfig.Color));
    }
    
    if (embedConfig.Title) {
        embed.setTitle(embedConfig.Title);
    }
    
    if (embedConfig.Description) {
        if (Array.isArray(embedConfig.Description)) {
            embed.setDescription(embedConfig.Description.join('\n'));
        } else {
            embed.setDescription(embedConfig.Description);
        }
    }
    
    if (embedConfig.Footer?.Text) {
        if (!embedConfig.Footer.Icon || embedConfig.Footer.Icon.trim() === '') {
            embed.setFooter({ text: embedConfig.Footer.Text });
        } else {
            embed.setFooter({ 
                text: embedConfig.Footer.Text,
                iconURL: embedConfig.Footer.Icon
            });
        }
    }
    
    if (embedConfig.Author?.Text) {
        if (!embedConfig.Author.Icon || embedConfig.Author.Icon.trim() === '') {
            embed.setAuthor({ name: embedConfig.Author.Text });
        } else {
            embed.setAuthor({ 
                name: embedConfig.Author.Text,
                iconURL: embedConfig.Author.Icon
            });
        }
    }
    
    if (embedConfig.Image && embedConfig.Image.trim() !== '') {
        embed.setImage(embedConfig.Image);
    }
    
    if (embedConfig.Thumbnail && embedConfig.Thumbnail.trim() !== '') {
        embed.setThumbnail(embedConfig.Thumbnail);
    }
    
    return embed;
}

function parseTimeToMs(timeStr) {
    const regex = /(\d+)([hmd])/;
    const parts = timeStr.match(regex);
    if (!parts) return null;

    const value = parseInt(parts[1], 10);
    const unit = parts[2];

    switch (unit) {
        case 'h': return value * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

function hexToDecimal(hex) {
    return parseInt(hex.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Manage reminders')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Set a new reminder')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The reminder message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('When to remind you (e.g., "10m", "1h", "2d")')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remind')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List your active reminders')),
    category: 'General',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            const reminders = await Reminder.find({
                userId: interaction.user.id,
                sent: false
            }).sort({ reminderTime: 1 });

            if (reminders.length === 0) {
                const embed = new EmbedBuilder();
                setEmbedProperties(embed, {
                    Color: lang.Reminder.Embeds.List.Color,
                    Description: lang.Reminder.Messages.no_reminders || 'You have no active reminders.'
                });

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }

            const reminderList = reminders.map((reminder, index) => {
                const timeLeft = reminder.reminderTime - Date.now();
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                return `${index + 1}. "${reminder.message}" - ${hours}h ${minutes}m remaining`;
            }).join('\n');

            const embed = new EmbedBuilder();
            setEmbedProperties(embed, {
                Color: lang.Reminder.Embeds.List.Color,
                Title: lang.Reminder.Embeds.List.Title || 'Your Active Reminders',
                Description: reminderList,
                Footer: lang.Reminder.Embeds.List.Footer
            });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        const message = interaction.options.getString('message');
        const timeInput = interaction.options.getString('time');
        const delay = parseTimeToMs(timeInput);

        if (/@everyone|@here|<@&\d+>/.test(message)) {
            await interaction.reply({ content: lang.Reminder.Messages.invalid_mentions, flags: MessageFlags.Ephemeral });
            return;
        }

        if (!delay) {
            await interaction.reply({ content: lang.Reminder.Messages.invalid_format, flags: MessageFlags.Ephemeral });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const user = targetUser || interaction.user;

        if (targetUser && targetUser.id !== interaction.user.id) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const hasModeratorRole = config.ModerationRoles.reminder.some(roleId => member.roles.cache.has(roleId));
            const isAdministrator = member.permissions.has(PermissionsBitField.Flags.Administrator);

            if (!hasModeratorRole && !isAdministrator) {
                await interaction.reply({ content: lang.Reminder.Messages.permission_denied, flags: MessageFlags.Ephemeral });
                return;
            }
        }

        const reminderTime = new Date(Date.now() + delay);

        const reminder = new Reminder({
            userId: user.id,
            channelId: interaction.channelId,
            message: message,
            reminderTime: reminderTime,
            sent: false
        });

        await reminder.save();

        const embedConfig = lang.Reminder.Embeds.Reminder;
        if (embedConfig.Description) {
            embedConfig.Description = embedConfig.Description.map(line => 
                line.replace('{user}', user.tag).replace('{time}', timeInput)
            );
        }

        const embed = new EmbedBuilder();
        setEmbedProperties(embed, embedConfig);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};