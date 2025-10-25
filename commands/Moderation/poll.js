const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const Poll = require('../../models/poll');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

function getNumberEmoji(number) {
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return numberEmojis[number - 1];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Tạo một cuộc thăm dò ý kiến cho người dùng bỏ phiếu')
        .addStringOption(option => option
            .setName('question')
            .setDescription('Câu hỏi của cuộc thăm dò')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('choices')
            .setDescription('Các lựa chọn của cuộc thăm dò (phân tách bằng dấu phẩy)')
            .setRequired(true)
        )
        .addBooleanOption(option => option
            .setName('multivote')
            .setDescription('Cho phép người dùng bỏ phiếu cho nhiều lựa chọn')
            .setRequired(false)
        ),
    category: 'Moderation',
    async execute(interaction, client) {
        const requiredRoles = config.ModerationRoles.poll;
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
        const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasPermission && !isAdministrator) {
            return interaction.reply({ content: 'Bạn không có quyền sử dụng lệnh này.', flags: MessageFlags.Ephemeral });
        }

        const question = interaction.options.getString('question');
        const choicesString = interaction.options.getString('choices');
        const choices = choicesString.split(',').map(choice => choice.trim());
        const multiVote = interaction.options.getBoolean('multivote') || false;

        if (choices.length < 2 || choices.length > 10) {
            return interaction.reply({ content: 'Bạn phải cung cấp từ 2 đến 10 lựa chọn.', flags: MessageFlags.Ephemeral });
        }

        const userDisplayName = interaction.member.displayName;
        const userIcon = interaction.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
        const guildIcon = interaction.guild.iconURL({ format: 'png', dynamic: true, size: 1024 });

        const pollEmbed = new EmbedBuilder()
            .setAuthor({ name: `${interaction.guild.name}`, iconURL: guildIcon })
            .setTitle(question)
            .setColor(config.EmbedColors)
            .setFooter({ text: `Cuộc thăm dò được tạo bởi ${userDisplayName}`, iconURL: userIcon });

        let description = '';
        choices.forEach((choice, index) => {
            const emoji = getNumberEmoji(index + 1);
            description += `${emoji} ${choice} (0 phiếu)\n`;
        });
        pollEmbed.setDescription(description);

        try {
            const message = await interaction.reply({ embeds: [pollEmbed], fetchReply: true });

            const pollData = {
                messageId: message.id,
                channelId: message.channel.id,
                question: question,
                authorId: interaction.user.id,
                choices: choices.map((choice, index) => ({
                    name: choice,
                    votes: 0,
                    emoji: getNumberEmoji(index + 1),
                })),
                multiVote: multiVote
            };

            for (let i = 0; i < choices.length; i++) {
                await message.react(pollData.choices[i].emoji);
            }

            const poll = new Poll(pollData);
            await poll.save();

            client.polls.set(message.id, pollData);
        } catch (error) {
            console.error('Không thể gửi tin nhắn cuộc thăm dò:', error);
            await interaction.reply({ content: 'Đã xảy ra lỗi khi tạo cuộc thăm dò.', flags: MessageFlags.Ephemeral });
        }
    }
};