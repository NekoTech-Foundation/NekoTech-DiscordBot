const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags
} = require('discord.js');
const suggestionActions = require('../../events/Suggestions/suggestionActions');
const SuggestionBlacklist = require('../../models/SuggestionBlacklist');
const { getConfig, getLang } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

async function openQuestionModal(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('suggestionModal')
            .setTitle(lang.Suggestion.ModalTitle || 'Gửi đề xuất của bạn!');

        const suggestionInput = new TextInputBuilder()
            .setCustomId('suggestionText')
            .setLabel(lang.Suggestion.ModalQuestion || 'Đề xuất của bạn là gì?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(suggestionInput);
        modal.addComponents(firstActionRow);

        Object.entries(config.SuggestionSettings.AdditionalModalInputs || {}).forEach(
            ([, inputConfig]) => {
                const additionalInput = new TextInputBuilder()
                    .setCustomId(inputConfig.ID)
                    .setLabel(inputConfig.Question)
                    .setPlaceholder(inputConfig.Placeholder)
                    .setStyle(
                        inputConfig.Style === 'Paragraph'
                            ? TextInputStyle.Paragraph
                            : TextInputStyle.Short
                    )
                    .setRequired(inputConfig.Required)
                    .setMaxLength(inputConfig.maxLength);

                const actionRow = new ActionRowBuilder().addComponents(additionalInput);
                modal.addComponents(actionRow);
            }
        );

        await interaction.showModal(modal);
    } catch (error) {
        console.error('Lỗi trong openQuestionModal: ', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: lang.Suggestion.Error || 'Đã xảy ra lỗi.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

const command = new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Quản lý các đề xuất');

const useQuestionModal = config.SuggestionSettings.UseQuestionModal;

if (!useQuestionModal) {
    command.addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Tạo một đề xuất mới')
            .addStringOption(option =>
                option
                    .setName('text')
                    .setDescription('Nội dung đề xuất')
                    .setRequired(true)
            )
    );
} else {
    command.addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Tạo một đề xuất mới')
    );
}

command
    .addSubcommand(subcommand =>
        subcommand
            .setName('accept')
            .setDescription('Chấp nhận một đề xuất')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('ID của đề xuất cần chấp nhận')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('reason')
                    .setDescription('Lý do chấp nhận đề xuất')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('deny')
            .setDescription('Từ chối một đề xuất')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('ID của đề xuất cần từ chối')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('reason')
                    .setDescription('Lý do từ chối đề xuất')
                    .setRequired(false)
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName('blacklist')
            .setDescription('Quản lý danh sách đen đề xuất')
            .addSubcommand(sub =>
                sub
                    .setName('add')
                    .setDescription('Thêm người dùng vào danh sách đen')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('Người dùng cần đưa vào danh sách đen')
                            .setRequired(true)
                    )
            )
            .addSubcommand(sub =>
                sub
                    .setName('remove')
                    .setDescription('Xóa người dùng khỏi danh sách đen')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('Người dùng cần xóa khỏi danh sách đen')
                            .setRequired(true)
                    )
            )
    );

async function checkBlacklistWords(content) {
    const patterns = config.BlacklistWords?.Patterns || [];
    const blacklistRegex = patterns.map(pattern => convertSimplePatternToRegex(pattern));
    return blacklistRegex.some(regex => regex.test(content));
}

function convertSimplePatternToRegex(simplePattern) {
    let regexPattern = simplePattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`, 'i');
}

module.exports = {
    data: command,
    category: 'General',
    async execute(interaction, client) {
        try {
            if (!config.SuggestionSettings.Enabled) {
                await interaction.reply({
                    content:
                        lang.Suggestion.SuggestionsDisabled ||
                        'Tính năng đề xuất hiện đang bị tắt.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'create') {
                const allowedRoles = config.SuggestionSettings.AllowedRoles || [];
                const hasAllowedRole =
                    allowedRoles.length === 0 ||
                    allowedRoles.some(roleId => interaction.member.roles.cache.has(roleId));

                if (!hasAllowedRole) {
                    await interaction.reply({
                        content:
                            lang.NoPermsMessage || 'Bạn không có quyền sử dụng lệnh này.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const isBlacklisted = await SuggestionBlacklist.findOne({
                    userId: interaction.user.id
                });
                if (isBlacklisted) {
                    await interaction.reply({
                        content:
                            lang.Suggestion.BlacklistMessage ||
                            'Bạn đang trong danh sách đen và không thể tạo đề xuất.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                if (useQuestionModal) {
                    await openQuestionModal(interaction);
                } else {
                    const suggestionText = interaction.options.getString('text');

                    if (
                        config.SuggestionSettings.blockBlacklistWords &&
                        (await checkBlacklistWords(suggestionText))
                    ) {
                        const blacklistMessage =
                            lang.BlacklistWords && lang.BlacklistWords.Message
                                ? lang.BlacklistWords.Message.replace(
                                      /{user}/g,
                                      `${interaction.user}`
                                  )
                                : 'Đề xuất của bạn chứa các từ bị cấm.';
                        await interaction.reply({
                            content: blacklistMessage,
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    }

                    try {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        await suggestionActions.createSuggestion(
                            client,
                            interaction,
                            suggestionText
                        );
                        await interaction.editReply({
                            content:
                                lang.Suggestion.SuggestionCreated ||
                                'Đề xuất đã được tạo thành công.'
                        });
                    } catch (error) {
                        console.error('Lỗi khi tạo đề xuất:', error);
                        if (!interaction.replied) {
                            await interaction.reply({
                                content: lang.Suggestion.Error || 'Đã xảy ra lỗi.',
                                flags: MessageFlags.Ephemeral
                            });
                        } else {
                            await interaction.editReply({
                                content: lang.Suggestion.Error || 'Đã xảy ra lỗi.'
                            });
                        }
                    }
                }
            } else if (subcommand === 'accept' || subcommand === 'deny') {
                const acceptDenyRoles =
                    config.SuggestionSettings.SuggestionAcceptDenyRoles || [];
                const hasAcceptDenyRole = acceptDenyRoles.some(roleId =>
                    interaction.member.roles.cache.has(roleId)
                );

                if (!hasAcceptDenyRole) {
                    await interaction.reply({
                        content: lang.NoPermsMessage || 'Bạn không có quyền sử dụng lệnh này.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const suggestionId = interaction.options.getString('id');
                const reason =
                    interaction.options.getString('reason') ||
                    lang.Suggestion.Reason ||
                    'Không có lý do được cung cấp';

                if (subcommand === 'accept') {
                    await suggestionActions.acceptSuggestion(
                        client,
                        interaction,
                        suggestionId,
                        reason
                    );
                } else {
                    await suggestionActions.denySuggestion(
                        client,
                        interaction,
                        suggestionId,
                        reason
                    );
                }
            } else if (
                interaction.options.getSubcommandGroup() === 'blacklist' &&
                (subcommand === 'add' || subcommand === 'remove')
            ) {
                const action = subcommand;
                const user = interaction.options.getUser('user');
                const acceptDenyRoles =
                    config.SuggestionSettings.SuggestionAcceptDenyRoles || [];
                const hasAcceptDenyRole = acceptDenyRoles.some(roleId =>
                    interaction.member.roles.cache.has(roleId)
                );

                if (!hasAcceptDenyRole) {
                    await interaction.reply({
                        content: lang.NoPermsMessage || 'Bạn không có quyền sử dụng lệnh này.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                if (action === 'add') {
                    await SuggestionBlacklist.updateOne(
                        { userId: user.id },
                        { userId: user.id },
                        { upsert: true }
                    );
                    await interaction.reply({
                        content: `${user} đã được thêm vào danh sách đen.`,
                        flags: MessageFlags.Ephemeral
                    });
                } else if (action === 'remove') {
                    await SuggestionBlacklist.deleteOne({ userId: user.id });
                    await interaction.reply({
                        content: `${user} đã được xóa khỏi danh sách đen.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        } catch (error) {
            console.error('Lỗi trong lệnh suggestion: ', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: lang.Suggestion.Error || 'Đã xảy ra lỗi.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};

