/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
                                        
 Thank you for choosing Drako Bot!

 Should you encounter any issues, require assistance, or have suggestions for improving the bot,
 we invite you to connect with us on our Discord server and create a support ticket: 

 http://discord.drakodevelopment.net
 
*/

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
//const yaml = require('js-yaml');
//const fs = require('fs');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removerole')
        .setDescription('Xóa vai trò khỏi người dùng')
        .addUserOption(option => option.setName('user').setDescription('Người dùng để xóa vai trò').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('Vai trò để xóa').setRequired(true)),
    category: 'Moderation',
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const requiredRoles = config.ModerationRoles.removerole;
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
        const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasPermission && !isAdministrator) {
            return interaction.editReply({ content: 'Bạn không có quyền sử dụng lệnh này.', flags: MessageFlags.Ephemeral });
        }

        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const member = interaction.guild.members.cache.get(user.id);

        if (user.id === interaction.user.id) {
            await interaction.editReply({ content: 'Bạn không thể tự xóa vai trò của chính mình.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!canModifyRole(interaction, role)) {
            await interaction.editReply({ content: 'Bạn không thể xóa vai trò có quyền cao hơn hoặc bằng quyền của bạn.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!member.roles.cache.has(role.id)) {
            const noRoleMsg = `Người dùng ${user.tag} không có vai trò ${role.name}`;
            await interaction.editReply({ content: noRoleMsg, flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            await member.roles.remove(role.id);
            await notifyUser(user, role, interaction);
            const responseEmbed = createResponseEmbed(role, interaction);
            await interaction.editReply({ embeds: [responseEmbed] });
        } catch (error) {
            console.error('Lỗi xóa vai trò:', error);
            await interaction.editReply({ content: 'Đã xảy ra lỗi khi xóa vai trò.', flags: MessageFlags.Ephemeral });
        }
    }
};

function canModifyRole(interaction, role) {
    const botHighestRole = interaction.guild.members.cache.get(interaction.client.user.id).roles.highest;
    const userHighestRole = interaction.member.roles.highest;
    return role.rawPosition < botHighestRole.rawPosition && role.rawPosition < userHighestRole.rawPosition;
}

async function notifyUser(user, role, interaction) {
    try {
        const message = `Vai trò ${role.name} của bạn đã bị xóa khỏi máy chủ ${interaction.guild.name}`;
        await user.send(message);
    } catch (error) {
        console.error('Lỗi gửi tin nhắn riêng cho người dùng:', error);
    }
}

function createResponseEmbed(role, interaction) {
    return new EmbedBuilder()
        .setAuthor({ name: 'Đã xóa vai trò', iconURL: 'https://i.imgur.com/7SlmRRa.png' })
        .setColor(config.SuccessEmbedColor)
        .addFields([
            { name: 'Đã xóa bởi', value: interaction.user.toString() },
            { name: 'Đã xóa khỏi', value: interaction.options.getUser('user').toString() },
        ])
        .setFooter({ text: interaction.guild.name })
        .setTimestamp();
}