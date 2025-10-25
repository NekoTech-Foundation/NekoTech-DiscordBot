const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Báo cáo tin nhắn')
        .setType(ApplicationCommandType.Message),
    category: 'Moderation',
    async execute(interaction) {
        try {
            const message = interaction.targetMessage;
            
            const modal = new ModalBuilder()
                .setCustomId('report_modal')
                .setTitle('Báo cáo tin nhắn');

            const reasonInput = new TextInputBuilder()
                .setCustomId('report_reason')
                .setLabel('Tại sao bạn báo cáo tin nhắn này?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Nhập lý do của bạn ở đây...')
                .setRequired(true)
                .setMaxLength(1000);

            const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);

            const filter = (i) => i.customId === 'report_modal';
            try {
                const submission = await interaction.awaitModalSubmit({ filter, time: 300000 }); // 5 minutes timeout
                
                const reason = submission.fields.getTextInputValue('report_reason');
                const reportedUser = message.author;
                const reportingUser = interaction.user;
                
                if (!config.Report?.LogsChannelID || config.Report.LogsChannelID === "CHANNEL_ID") {
                    await submission.reply({ 
                        content: 'Tính năng báo cáo hiện đang bị tắt.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const channel = interaction.guild.channels.cache.get(config.Report.LogsChannelID);
                if (!channel) {
                    await submission.reply({ 
                        content: 'Tính năng báo cáo hiện đang bị tắt.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(config.Report.Embed.Title)
                    .setDescription(
                        config.Report.Embed.Description
                            .join('\n')
                            .replace('{user}', `<@${reportedUser.id}>`)
                            .replace('{message}', message.content || '*Không có nội dung tin nhắn*')
                            .replace('{timestamp}', new Date().toLocaleString())
                            .replace('{reportingUser}', `<@${reportingUser.id}>`)
                            .replace('{reason}', reason)
                            .replace('{channel}', `<#${message.channel.id}>`)
                            .replace('{messageUrl}', message.url)
                    )
                    .setColor(config.Report.Embed.Color)
                    .setTimestamp();

                if (config.Report.Embed.Footer.Text) {
                    embed.setFooter({ text: config.Report.Embed.Footer.Text });
                }

                const guildIcon = interaction.guild.iconURL();
                if (guildIcon && config.Report.Embed.Thumbnail.includes('{guildIcon}')) {
                    embed.setThumbnail(guildIcon);
                }

                await channel.send({ embeds: [embed] });
                await submission.reply({ 
                    content: 'Cảm ơn bạn đã báo cáo. Các quản trị viên đã được thông báo.', 
                    flags: MessageFlags.Ephemeral 
                });

            } catch (error) {
                if (error.code === 'InteractionCollectorError') {
                    return;
                } else {
                    console.error('Lỗi trong gửi modal báo cáo:', error);
                }
            }

        } catch (error) {
            console.error('Lỗi trong lệnh báo cáo:', error);
        }
    }
};