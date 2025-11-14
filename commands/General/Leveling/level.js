const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const UserData = require('../../../models/UserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

const LEVEL_DEV_IDS = ['1316287191634149377', '727497287777124414'];

const PRESTIGE_TIERS = [
    { key: 'unranked', name: 'Chưa xếp hạng', emoji: '<:unranked_valorant:1438519174304370820>' },
    { key: 'iron', name: 'Sắt', emoji: '<:iron_valorant:1438519250221404200>' },
    { key: 'bronze', name: 'Đồng', emoji: '<:bronze_valorant:1438521385646559232>' },
    { key: 'silver', name: 'Bạc', emoji: '<:silver_valorant:1438521521352998952>' },
    { key: 'gold', name: 'Vàng', emoji: '<:gold_valorant:1438522385472164042>' },
    { key: 'platinum', name: 'Bạch kim', emoji: '<:platinum_valorant:1438866241556058174>' },
    { key: 'diamond', name: 'Kim cương', emoji: '<:diamond_valorant:1438866244307783700>' },
    { key: 'ascendant', name: 'Thăng hoa', emoji: '<:ascendant_valorant:1438866925735116961>' },
    { key: 'immortal', name: 'Bất tử', emoji: '<:immortal_valorant:1438865530906738749>' },
    { key: 'radiant', name: 'Rạng rỡ', emoji: '<:radiant_valorant:1438865529283805226>' }
];

function getPrestigeTier(prestige) {
    if (!prestige || prestige <= 0) {
        return PRESTIGE_TIERS[0];
    }
    if (prestige >= PRESTIGE_TIERS.length) {
        return PRESTIGE_TIERS[PRESTIGE_TIERS.length - 1];
    }
    return PRESTIGE_TIERS[prestige];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Quản lý cấp độ và XP của người dùng')
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('Tăng XP hoặc Cấp độ cho người dùng')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Người dùng để tăng XP hoặc Cấp độ')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Chọn XP hoặc Cấp độ')
                        .setRequired(true)
                        .addChoices(
                            { name: 'XP', value: 'xp' },
                            { name: 'Cấp độ', value: 'level' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription('Số lượng XP hoặc Cấp độ để tăng')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Giảm XP hoặc Cấp độ của người dùng')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Người dùng để giảm XP hoặc Cấp độ')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Chọn XP hoặc Cấp độ')
                        .setRequired(true)
                        .addChoices(
                            { name: 'XP', value: 'xp' },
                            { name: 'Cấp độ', value: 'level' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription('Số lượng XP hoặc Cấp độ để giảm')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Thiết lập XP hoặc Cấp độ của người dùng')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Người dùng để thiết lập XP hoặc Cấp độ')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Chọn XP hoặc Cấp độ')
                        .setRequired(true)
                        .addChoices(
                            { name: 'XP', value: 'xp' },
                            { name: 'Cấp độ', value: 'level' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription('Giá trị XP hoặc Cấp độ cần thiết lập')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Xem cấp độ, XP và hạng danh vọng của bạn')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Người dùng cần kiểm tra (để trống để xem bản thân)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Đặt lại cấp độ và XP của toàn bộ máy chủ')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Chọn nội dung cần đặt lại')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Chỉ XP', value: 'xp' },
                            { name: 'Chỉ Cấp độ', value: 'level' },
                            { name: 'Cả XP và Cấp độ', value: 'both' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('prestige')
                .setDescription('Reset cấp độ & XP để nâng hạng danh vọng')
        ),
    category: 'Chung',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        const isDev = LEVEL_DEV_IDS.includes(interaction.user.id);
        const adminSubcommands = ['give', 'remove', 'set', 'reset'];

        if (adminSubcommands.includes(subcommand) && !isDev) {
            await interaction.reply({
                content: lang.Levels.NoPermission,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (subcommand !== 'check' && subcommand !== 'prestige') {
            const requiredRoles = config.LevelingSystem.Permission;
            const hasPermission =
                interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

            if (!hasPermission) {
                await interaction.reply({
                    content: lang.Levels.NoPermission,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
        }

        if (subcommand === 'reset') {
            const type = interaction.options.getString('type');

            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Xác nhận đặt lại hệ thống cấp độ')
                .setDescription(
                    `Bạn có chắc chắn muốn đặt lại ${type === 'both' ? 'XP và cấp độ' : type} cho toàn bộ người dùng trong máy chủ này?\n\nHành động này **không thể hoàn tác**.`
                )
                .setColor('#FFA500');

            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_level_reset')
                .setLabel('Xác nhận')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_level_reset')
                .setLabel('Hủy')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            const response = await interaction.reply({
                embeds: [confirmEmbed],
                components: [row],
                flags: MessageFlags.Ephemeral
            });

            try {
                const confirmation = await response.awaitMessageComponent({
                    filter: i => i.user.id === interaction.user.id,
                    time: 30000
                });

                if (confirmation.customId === 'cancel_level_reset') {
                    return confirmation.update({
                        content: 'Đã hủy thao tác đặt lại.',
                        embeds: [],
                        components: []
                    });
                }

                if (confirmation.customId === 'confirm_level_reset') {
                    await confirmation.update({
                        content: 'Đang xử lý đặt lại dữ liệu level...',
                        embeds: [],
                        components: []
                    });

                    const updateQuery = {};
                    if (type === 'xp' || type === 'both') {
                        updateQuery.xp = 0;
                    }
                    if (type === 'level' || type === 'both') {
                        updateQuery.level = 0;
                    }

                    try {
                        const result = await UserData.updateMany(
                            { guildId: interaction.guild.id },
                            { $set: updateQuery }
                        );

                        const resultEmbed = new EmbedBuilder()
                            .setDescription(
                                `Đã đặt lại thành công ${type === 'both' ? 'XP và cấp độ' : type} cho **${result.modifiedCount}** người dùng.`
                            )
                            .setColor('#FF0000');

                        return confirmation.editReply({
                            content: '',
                            embeds: [resultEmbed],
                            components: []
                        });
                    } catch (error) {
                        console.error('Lỗi khi đặt lại cấp độ:', error);
                        return confirmation.editReply({
                            content: 'Đã xảy ra lỗi khi đặt lại dữ liệu cấp độ.',
                            embeds: [],
                            components: []
                        });
                    }
                }
            } catch (error) {
                console.error('Lỗi trong quá trình xác nhận reset level:', error);
                await interaction.editReply({
                    content: 'Xác nhận đã hết thời gian hoặc có lỗi xảy ra. Vui lòng thử lại.',
                    embeds: [],
                    components: []
                });
            }
            return;
        }

        const user = interaction.options.getUser('user') || interaction.user;
        let userData = await UserData.findOne({ userId: user.id, guildId: guildId });
        if (!userData) {
            userData = new UserData({
                userId: user.id,
                guildId: guildId,
                xp: 0,
                level: 1,
                prestige: 0
            });
        }

        switch (subcommand) {
            case 'give':
            case 'remove':
            case 'set': {
                const type = interaction.options.getString('type');
                const amount = interaction.options.getInteger('amount');

                if (type === 'xp') {
                    const newXP =
                        subcommand === 'set'
                            ? amount
                            : subcommand === 'give'
                                ? userData.xp + amount
                                : Math.max(0, userData.xp - amount);

                    let currentLevel = userData.level;
                    let currentXP = newXP;
                    let levelChanged = false;

                    while (currentXP >= config.LevelingSystem.XPNeeded * currentLevel) {
                        currentXP -= config.LevelingSystem.XPNeeded * currentLevel;
                        currentLevel += 1;
                        levelChanged = true;
                    }

                    userData.level = currentLevel;
                    userData.xp = currentXP;
                    await userData.save();

                    if (levelChanged) {
                        await interaction.reply({
                            content: lang.Levels.UpdatedXPAndLevel
                                .replace('{user}', user.username)
                                .replace('{xp}', currentXP)
                                .replace('{level}', currentLevel),
                            flags: MessageFlags.Ephemeral
                        });
                    } else {
                        await interaction.reply({
                            content: lang.Levels.UpdatedXP
                                .replace('{user}', user.username)
                                .replace('{xp}', currentXP),
                            flags: MessageFlags.Ephemeral
                        });
                    }
                } else {
                    userData.level =
                        subcommand === 'set'
                            ? amount
                            : subcommand === 'give'
                                ? userData.level + amount
                                : Math.max(1, userData.level - amount);

                    await userData.save();

                    await interaction.reply({
                        content: lang.Levels.UpdatedLevel
                            .replace('{user}', user.username)
                            .replace('{level}', userData.level),
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
            }

            case 'check': {
                if (!userData) {
                    await interaction.reply({
                        content: lang.Levels.DataNotFound.replace('{user}', user.username),
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const xpNeeded =
                    userData.level === 0 ? 70 : userData.level * config.LevelingSystem.XPNeeded;
                const progress =
                    xpNeeded > 0 ? Math.max(0, Math.min(1, userData.xp / xpNeeded)) : 0;
                const barLength = 20;
                const filledLength = Math.round(progress * barLength);
                const progressBar =
                    '▰'.repeat(filledLength) + '▱'.repeat(barLength - filledLength);

                const tier = getPrestigeTier(userData.prestige || 0);

                const fields = [
                    {
                        name: 'Hạng danh vọng',
                        value: `${tier.emoji} ${tier.name} (Prestige ${userData.prestige || 0})`,
                        inline: true
                    },
                    {
                        name: 'Tiến trình cấp độ',
                        value: `${progressBar}\n${userData.xp} / ${xpNeeded} XP`,
                        inline: false
                    }
                ];

                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: `${user.username} • Level ${userData.level}`,
                        iconURL: user.displayAvatarURL()
                    })
                    .setColor('#5865F2')
                    .setDescription(
                        lang.Levels.CurrentLevelAndXP
                            .replace('{user}', user.username)
                            .replace('{level}', userData.level)
                            .replace('{xp}', userData.xp)
                    )
                    .addFields(fields)
                    .setFooter({
                        text: interaction.guild.name,
                        iconURL: interaction.guild.iconURL() || null
                    });

                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
                break;
            }

            case 'prestige': {
                const minPrestigeLevel = config.LevelingSystem.PrestigeLevel || 50;

                if (userData.level < minPrestigeLevel) {
                    await interaction.reply({
                        content: `Bạn cần đạt ít nhất **level ${minPrestigeLevel}** để nâng hạng danh vọng.`,
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                userData.prestige = (userData.prestige || 0) + 1;
                userData.level = 1;
                userData.xp = 0;
                await userData.save();

                const tier = getPrestigeTier(userData.prestige);

                await interaction.reply({
                    content: `🎉 Bạn đã nâng **Hạng danh vọng** lên ${tier.emoji} **${tier.name}** (Prestige ${userData.prestige})! Cấp độ của bạn đã được đặt lại về **1**.`,
                    flags: MessageFlags.Ephemeral
                });
                break;
            }
        }
    }
};

