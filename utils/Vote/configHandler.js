const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ComponentType
} = require('discord.js');
const VotingConfig = require('../../models/VotingConfig');
const { getConfig } = require('../configLoader');
const config = getConfig();

async function handleInteraction(interaction, client) {
    const customId = interaction.customId;
    const guildId = interaction.guild.id;

    // Fetch config
    let votingConfig = await VotingConfig.findOne({ guildId });
    if (!votingConfig) {
        votingConfig = await VotingConfig.create({
            guildId,
            defaultConfig: {
                countingMethod: 'REACTION_COUNT',
                allowedRoles: [],
                blockedRoles: [],
                minAccountAge: 0,
                joinServerTime: 0,
                removeVoteOnLeave: false,
                maxVotesPerUser: 0,
                allowSelfVote: true,
                allowBotVote: false
            }
        });
    }

    if (!customId || customId === 'vote_config_view') {
        await updateConfigView(interaction, votingConfig.defaultConfig);
    }
    else if (customId.startsWith('vote_config_toggle_')) {
        const toggle = customId.replace('vote_config_toggle_', '');
        const currentConfig = votingConfig.defaultConfig;

        switch (toggle) {
            case 'self': currentConfig.allowSelfVote = !currentConfig.allowSelfVote; break;
            case 'bot': currentConfig.allowBotVote = !currentConfig.allowBotVote; break;
            case 'leave': currentConfig.removeVoteOnLeave = !currentConfig.removeVoteOnLeave; break;
            case 'zero': currentConfig.ignoreZeroVote = !currentConfig.ignoreZeroVote; break;
        }

        await VotingConfig.findOneAndUpdate({ guildId }, { defaultConfig: currentConfig });
        await updateConfigView(interaction, currentConfig);
    }
    else if (customId.startsWith('vote_config_modal_')) {
        // Show Modals
        const type = customId.replace('vote_config_modal_', '');
        const modal = new ModalBuilder().setCustomId(`vote_config_submit_${type}`).setTitle('Chỉnh sửa cấu hình');

        let input;
        if (type === 'age') {
            input = new TextInputBuilder().setCustomId('input').setLabel('Tuổi tài khoản tối thiểu (ms)').setStyle(TextInputStyle.Short).setPlaceholder('0 = Không giới hạn. Ví dụ: 86400000 = 1 ngày');
        } else if (type === 'join') {
            input = new TextInputBuilder().setCustomId('input').setLabel('Thời gian vào server (ms)').setStyle(TextInputStyle.Short).setPlaceholder('0 = Không giới hạn');
        } else if (type === 'max') {
            input = new TextInputBuilder().setCustomId('input').setLabel('Số phiếu tối đa mỗi người').setStyle(TextInputStyle.Short).setPlaceholder('0 = Không giới hạn');
        }

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    else if (customId.startsWith('vote_config_submit_')) {
        const type = customId.replace('vote_config_submit_', '');
        const value = parseInt(interaction.fields.getTextInputValue('input'));

        if (isNaN(value) || value < 0) {
            return interaction.reply({ content: 'Vui lòng nhập số hợp lệ (>= 0).', ephemeral: true });
        }

        const currentConfig = votingConfig.defaultConfig;
        switch (type) {
            case 'age': currentConfig.minAccountAge = value; break;
            case 'join': currentConfig.joinServerTime = value; break;
            case 'max': currentConfig.maxVotesPerUser = value; break;
        }

        await VotingConfig.findOneAndUpdate({ guildId }, { defaultConfig: currentConfig });
        await updateConfigView(interaction, currentConfig); // Since modals defer update mostly? No, modals are replies. Need to edit original message? 
        // Modals don't allow editing the message directly in same flow easily without fetching it.
        // Or we can just reply "Updated" and let user click refresh?
        // Better: Reply updated and offer button to going back.
        await interaction.reply({ content: 'Đã cập nhật cấu hình!', ephemeral: true });
    }
    else if (customId === 'vote_config_roles_allowed' || customId === 'vote_config_roles_blocked') {
        const roles = interaction.values; // Array of Role IDs
        const currentConfig = votingConfig.defaultConfig;

        if (customId === 'vote_config_roles_allowed') {
            currentConfig.allowedRoles = roles;
        } else {
            currentConfig.blockedRoles = roles;
        }

        await VotingConfig.findOneAndUpdate({ guildId }, { defaultConfig: currentConfig });
        await updateConfigView(interaction, currentConfig);
    }
}

async function updateConfigView(interaction, configData) {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Cấu Hình Bầu Chọn (Mặc định)')
        .setColor('Blue')
        .addFields(
            { name: 'Self Vote', value: configData.allowSelfVote ? '✅ Allowed' : '❌ Denied', inline: true },
            { name: 'Bot Vote', value: configData.allowBotVote ? '✅ Allowed' : '❌ Denied', inline: true },
            { name: 'Remove on Leave', value: configData.removeVoteOnLeave ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Ignore Zero Views', value: configData.ignoreZeroVote !== false ? '✅ Yes' : '❌ No', inline: true }, // Default true usually
            { name: 'Min Account Age', value: `${configData.minAccountAge} ms`, inline: true },
            { name: 'Min Join Time', value: `${configData.joinServerTime} ms`, inline: true },
            { name: 'Max Votes/User', value: configData.maxVotesPerUser === 0 ? 'Unlimited' : `${configData.maxVotesPerUser}`, inline: true },
            { name: 'Whitelist Roles', value: configData.allowedRoles.length ? `<@&${configData.allowedRoles.join('>, <@&')}>` : 'None (All allowed)', inline: false },
            { name: 'Blacklist Roles', value: configData.blockedRoles.length ? `<@&${configData.blockedRoles.join('>, <@&')}>` : 'None', inline: false }
        );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vote_config_toggle_self').setLabel('Toggle Self Vote').setStyle(configData.allowSelfVote ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('vote_config_toggle_bot').setLabel('Toggle Bot Vote').setStyle(configData.allowBotVote ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('vote_config_toggle_leave').setLabel('Toggle Remove Leave').setStyle(configData.removeVoteOnLeave ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('vote_config_toggle_zero').setLabel('Toggle Ignore Zero').setStyle(configData.ignoreZeroVote !== false ? ButtonStyle.Success : ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vote_config_modal_age').setLabel('Set Min Age').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vote_config_modal_join').setLabel('Set Min Join').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vote_config_modal_max').setLabel('Set Max Votes').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vote_config_view').setLabel('Refresh').setStyle(ButtonStyle.Primary).setEmoji('🔄')
    );

    const row3 = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('vote_config_roles_allowed')
            .setPlaceholder('Select Allowed Roles (Whitelist)')
            .setMinValues(0)
            .setMaxValues(20)
    );

    const row4 = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('vote_config_roles_blocked')
            .setPlaceholder('Select Blocked Roles (Blacklist)')
            .setMinValues(0)
            .setMaxValues(20)
    );

    const payload = { embeds: [embed], components: [row1, row2, row3, row4] };

    if (interaction.replied || interaction.deferred) {
        // If modal submit, we can't edit the original message easily unless we passed it or searched it.
        // But for buttons/selects (component interaction), update() works.
        if (interaction.isMessageComponent()) {
            await interaction.update(payload);
        } else {
            await interaction.editReply(payload);
        }
    } else {
        await interaction.reply(payload);
    }
}

module.exports = { handleInteraction, updateConfigView };
