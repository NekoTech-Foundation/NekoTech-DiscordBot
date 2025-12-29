const AutoReact = require('../../models/autoReact');
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoreact')
        .setDescription('Manage AutoReact settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new AutoReact')
                .addStringOption(option =>
                    option.setName('keyword')
                        .setDescription('The keyword to react to')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('The emoji to react with')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an existing AutoReact')
                .addStringOption(option =>
                    option.setName('identifier')
                        .setDescription('The keyword or ID of the AutoReact to remove')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all current AutoReacts')
    ),
    category: 'Utility',
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.editReply({ content: 'You do not have permission to use this command.' });
        }

        const guildId = interaction.guild.id;
        let autoReactData = await AutoReact.findOne({ guildId });

        if (!autoReactData) {
            autoReactData = await AutoReact.create({ guildId, reactions: [] });
        }

        const subCommand = interaction.options.getSubcommand();

        if (subCommand === 'add') {
            const keyword = interaction.options.getString('keyword');
            const emoji = interaction.options.getString('emoji');

            const validEmoji = validateEmoji(interaction, emoji);
            if (!validEmoji) {
                return interaction.editReply({ content: `❌ The emoji "${emoji}" is not valid or not accessible by the bot. Please try another emoji.` });
            }

            const reactionCount = autoReactData.reactions.length;
            const newId = reactionCount + 1;

            autoReactData.reactions.push({
                id: newId,
                keyword,
                emoji,
                whitelistRoles: [],
                whitelistChannels: []
            });

            await autoReactData.save();

            const embed = new EmbedBuilder()
                .setTitle('AutoReact Added')
                .setDescription('A new AutoReact has been successfully added.')
                .addFields(
                    { name: 'ID', value: `${newId}`, inline: true },
                    { name: 'Keyword', value: keyword, inline: true },
                    { name: 'Emoji', value: emoji, inline: true }
                )
                .setColor('#57F287');

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else if (subCommand === 'remove') {
            const identifier = interaction.options.getString('identifier');
            let found = false;

            if (isNaN(identifier)) {
                autoReactData.reactions = autoReactData.reactions.filter(reaction => reaction.keyword.toLowerCase() !== identifier.toLowerCase());
                found = true;
            } else {
                const id = parseInt(identifier);
                const beforeLength = autoReactData.reactions.length;
                autoReactData.reactions = autoReactData.reactions.filter(reaction => reaction.id !== id);
                found = beforeLength !== autoReactData.reactions.length;
            }

            if (found) {
                await autoReactData.save();
                const embed = new EmbedBuilder()
                    .setTitle('AutoReact Removed')
                    .setDescription(`The AutoReact with identifier "${identifier}" has been successfully removed.`)
                    .setColor('#ED4245');

                return interaction.editReply({ embeds: [embed] });
            } else {
                return interaction.editReply({ content: `❌ No AutoReact found with the identifier "${identifier}". Please check and try again.` });
            }

        } else if (subCommand === 'list') {
            if (autoReactData.reactions.length === 0) {
                return interaction.editReply({ content: 'No AutoReacts are set.' });
            }

            const listFields = await Promise.all(
                autoReactData.reactions.map(async (reaction) => {
                    const isValid = validateEmoji(interaction, reaction.emoji);
                    return [
                        { name: `ID: ${reaction.id}`, value: '\u200b', inline: true },
                        { name: `Keyword: "${reaction.keyword}"`, value: `Emoji: "${reaction.emoji}"`, inline: true },
                        { name: `Status`, value: isValid ? '🟢 Valid' : '🔴 Invalid/Inaccessible', inline: true }
                    ];
                })
            );

            const flattenedFields = listFields.flat();

            const embed = new EmbedBuilder()
                .setTitle('Auto Reacts List')
                .setDescription('Here are the currently configured AutoReacts for this server:')
                .addFields(flattenedFields)
                .setColor('#5865F2')
                .setFooter({ text: 'Use /autoreact add to add more reactions.' });

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    },
};

function validateEmoji(interaction, emoji) {
    const customEmoji = emoji.match(/<:\w+:(\d+)>/);
    if (customEmoji) {
        const emojiId = customEmoji[1];
        const guildEmoji = interaction.client.emojis.cache.get(emojiId);
        if (guildEmoji && guildEmoji.available) {
            return true;
        } else {
            return false;
        }
    }

    const unicodeEmojiRegex = /\p{Emoji}/u;
    if (unicodeEmojiRegex.test(emoji)) {
        return true;
    }

    return false;
}