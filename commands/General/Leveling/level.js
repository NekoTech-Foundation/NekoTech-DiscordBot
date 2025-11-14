const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const UserData = require('../../../models/UserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

const LEVEL_DEV_IDS = ['1316287191634149377', '727497287777124414'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Quản lý cấp độ và XP của người dùng')
        .addSubcommand(subcommand =>
            subcommand.setName('give')
                .setDescription('Tặng XP hoặc Cấp độ cho người dùng')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng để tặng XP hoặc Cấp độ')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Chọn XP hoặc Cấp độ')
                        .setRequired(true)
                        .addChoices(
                            { name: 'XP', value: 'xp' },
                            { name: 'Cấp độ', value: 'level' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số lượng XP hoặc Cấp độ để tặng')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Xóa XP hoặc Cấp độ của người dùng')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng để xóa XP hoặc Cấp độ')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Chọn XP hoặc Cấp độ')
                        .setRequired(true)
                        .addChoices(
                            { name: 'XP', value: 'xp' },
                            { name: 'Cấp độ', value: 'level' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số lượng XP hoặc Cấp độ để xóa')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('set')
                .setDescription('Thiết lập XP hoặc Cấp độ của người dùng')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng để thiết lập XP hoặc Cấp độ')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Chọn XP hoặc Cấp độ')
                        .setRequired(true)
                        .addChoices(
                            { name: 'XP', value: 'xp' },
                            { name: 'Cấp độ', value: 'level' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Thiết lập số lượng XP hoặc Cấp độ')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('check')
                .setDescription('Kiểm tra XP và cấp độ của người dùng')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng để kiểm tra XP và cấp độ')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName('reset')
                .setDescription('Đặt lại cấp độ và XP của tất cả người dùng trong máy chủ')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Chọn nội dung cần đặt lại')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Chỉ XP', value: 'xp' },
                            { name: 'Chỉ Cấp độ', value: 'level' },
                            { name: 'Cả XP và Cấp độ', value: 'both' }
                        ))),
    category: 'Chung',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Chỉ cho phép 2 ID dev dùng các lệnh quản trị level
        const isDev = LEVEL_DEV_IDS.includes(interaction.user.id);
        const adminSubcommands = ['give', 'remove', 'set', 'reset'];

        if (adminSubcommands.includes(subcommand) && !isDev) {
            await interaction.reply({
                content: lang.Levels.NoPermission,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (subcommand !== 'check') {
            const requiredRoles = config.LevelingSystem.Permission;
            const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

            if (!hasPermission) {
                await interaction.reply({ content: lang.Levels.NoPermission, flags: MessageFlags.Ephemeral });
                return;
            }
        }

        if (subcommand === 'reset') {
            const type = interaction.options.getString('type');
            
            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Xác nhận Đặt lại Hệ thống Cấp độ')
                .setDescription(`Bạn có chắc chắn muốn đặt lại ${type === 'both' ? 'cả XP và cấp độ' : type} cho tất cả người dùng trong máy chủ này?\n\nHành động này không thể hoàn tác!`)
                .setColor('#FFA500');

            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_level_reset')
                .setLabel('Xác nhận Đặt lại')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_level_reset')
                .setLabel('Hủy')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
                .addComponents(confirmButton, cancelButton);

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
                        content: 'Việc đặt lại đã bị hủy.',
                        embeds: [],
                        components: []
                    });
                }

                if (confirmation.customId === 'confirm_level_reset') {
                    await confirmation.update({
                        content: 'Đang xử lý việc đặt lại...',
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
                            .setDescription(`Đã đặt lại thành công ${type === 'both' ? 'XP và cấp độ' : type} cho ${result.modifiedCount} người dùng.`)
                            .setColor('#FF0000');

                        return confirmation.editReply({
                            content: '',
                            embeds: [resultEmbed]
                        });
                    } catch (error) {
                        console.error('Lỗi khi đặt lại cấp độ:', error);
                        return confirmation.editReply({
                            content: 'Đã xảy ra lỗi khi đặt lại cấp độ.',
                            embeds: []
                        });
                    }
                }
            } catch (error) {
                if (error.code === 'InteractionCollectorError') {
                    await interaction.editReply({
                        content: 'Xác nhận đã hết thời gian. Vui lòng thử lại.',
                        embeds: [],
                        components: []
                    });
                } else {
                    console.error('Lỗi trong việc xử lý xác nhận:', error);
                    await interaction.editReply({
                        content: 'Đã xảy ra lỗi khi xử lý xác nhận.',
                        embeds: [],
                        components: []
                    });
                }
            }
            return;
        }

        const user = interaction.options.getUser('user') || interaction.user;
        let userData = await UserData.findOne({ userId: user.id, guildId: guildId });
        if (!userData) {
            userData = new UserData({ userId: user.id, guildId: guildId, xp: 0, level: 1 });
        }

        switch (subcommand) {
            case 'give':
            case 'remove':
            case 'set':
                const type = interaction.options.getString('type');
                const amount = interaction.options.getInteger('amount');

                if (type === 'xp') {
                    let newXP = (subcommand === 'set') ? amount : 
                               (subcommand === 'give') ? userData.xp + amount : 
                               Math.max(0, userData.xp - amount);

                    let currentLevel = userData.level;
                    let currentXP = newXP;
                    let levelChanged = false;
                    
                    while (currentXP >= config.LevelingSystem.XPNeeded * currentLevel) {
                        currentXP -= config.LevelingSystem.XPNeeded * currentLevel;
                        currentLevel++;
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
                    userData.level = (subcommand === 'set') ? amount : 
                                   (subcommand === 'give') ? userData.level + amount : 
                                   Math.max(1, userData.level - amount);

                    await userData.save();
                    await interaction.reply({
                        content: lang.Levels.UpdatedLevel
                            .replace('{user}', user.username)
                            .replace('{level}', userData.level),
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
            case 'check':
                if (!userData) {
                    await interaction.reply({
                        content: lang.Levels.DataNotFound.replace('{user}', user.username),
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                // Tính XP cần cho level tiếp theo (theo logic handleXP)
                const xpNeeded = userData.level === 0 ? 70 : userData.level * config.LevelingSystem.XPNeeded;
                const progress = Math.max(0, Math.min(1, xpNeeded > 0 ? userData.xp / xpNeeded : 0));
                const barLength = 20;
                const filledLength = Math.round(progress * barLength);
                const progressBar = '▰'.repeat(filledLength) + '▱'.repeat(barLength - filledLength);

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
                    .addFields(
                        {
                            name: 'Ti?n tr�nh',
                            value: `${progressBar}\n${userData.xp} / ${xpNeeded} XP`,
                            inline: false
                        }
                    )
                    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() || null });

                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
                break;
        }
    }
};
