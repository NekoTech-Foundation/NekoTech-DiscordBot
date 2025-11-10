const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ApplicationCommandOptionType,
    MessageFlags
} = require('discord.js');
const path = require('path');
const { getLang } = require('../../utils/configLoader');

// Helper function to get all commands as a flat, sorted list
function getAllCommands(client) {
    const commandList = [];

    client.slashCommands.forEach(command => {
        if (command.data && typeof command.data.toJSON === 'function') {
            const commandJSON = command.data.toJSON();

            // Main command
            let mainCommandDisplay = `\`/${commandJSON.name}\`: ${commandJSON.description || 'Không có mô tả'}`;
            commandList.push(mainCommandDisplay);

            // Subcommands
            if (commandJSON.options) {
                const subcommands = commandJSON.options.filter(option => option.type === ApplicationCommandOptionType.Subcommand);
                if (subcommands.length > 0) {
                    // Keep parent command's description
                    commandList[commandList.length - 1] = `\`/${commandJSON.name}\`: ${commandJSON.description || 'Không có mô tả'}`;
                    
                    subcommands.forEach(subcommand => {
                        const subcommandDisplay = `  • \`/${commandJSON.name} ${subcommand.name}\`: ${subcommand.description || 'Không có mô tả'}`;
                        commandList.push(subcommandDisplay);
                    });
                }
            }
        }
    });

    // Sort the final list alphabetically
    commandList.sort((a, b) => a.localeCompare(b));
    return commandList;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách tất cả các lệnh của bot'),
    category: 'Chung',

    async execute(interaction, client) {
        try {
            if (!client.commandsReady) {
                return await interaction.reply({
                    content: 'Các lệnh vẫn đang được đăng ký. Vui lòng thử lại sau giây lát.',
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            const lang = getLang();
            const allCommands = getAllCommands(client);
            const itemsPerPage = 10;
            const totalPages = Math.ceil(allCommands.length / itemsPerPage);
            let currentPage = 0;

            // --- Static Header Text ---
            const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
            const staticHeaderText = [
                ` ${interaction.user.username}`,
                `> * KentaBucket là một bot Discord dựa trên discord.js, đáp ứng hầu hết mọi nhu cầu cần thiết của một máy chủ.`,
                `> * Để biết danh sách các lệnh có sẵn, hãy sử dụng /help.`,
                `> * [Server Giải đáp & Hỗ trợ!](https://discord.gg/96hgDj4b4j) - [Hướng dẫn Sử dụng](https://your-docs-link.com) - [Điều khoản Dịch vụ](https://your-tos-link.com) - [Chính sách Bảo mật](https://your-privacy-link.com) - [Invite bot!](${inviteLink})`
            ].join('\n');

            const createPageEmbed = (page) => {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const commandsOnPage = allCommands.slice(start, end);

                const embed = new EmbedBuilder()
                    .setColor('#1769FF')
                    .setDescription(staticHeaderText + '\n\n**Danh sách lệnh:**\n' + commandsOnPage.join('\n'))
                    .setFooter({ text: `Trang ${page + 1} / ${totalPages}` })
                    .setTimestamp();
                
                return embed;
            };

            const createButtons = (page) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                        .setCustomId('previous_page')
                        .setLabel('Trước')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                        new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Sau')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages - 1)
                    );
            };

            const initialEmbed = createPageEmbed(currentPage);
            const initialButtons = createButtons(currentPage);

            const response = await interaction.editReply({
                embeds: [initialEmbed],
                components: [initialButtons]
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                idle: 300000 // 5 minutes of inactivity
            });

            collector.on('collect', async i => {
                if (i.customId === 'next_page') {
                    currentPage++;
                } else if (i.customId === 'previous_page') {
                    currentPage--;
                }

                const newEmbed = createPageEmbed(currentPage);
                const newButtons = createButtons(currentPage);

                await i.update({
                    embeds: [newEmbed],
                    components: [newButtons]
                });
            });

            collector.on('end', async () => {
                try {
                    const finalButtons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                            .setCustomId('previous_page_disabled')
                            .setLabel('Trước')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                            new ButtonBuilder()
                            .setCustomId('next_page_disabled')
                            .setLabel('Sau')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                        );
                    
                    await interaction.editReply({
                        components: [finalButtons]
                    });
                } catch (error) {
                    // Ignore errors if the message was deleted
                    if (error.code !== 10008) {
                        console.error('Lỗi khi cập nhật component sau khi collector kết thúc:', error);
                    }
                }
            });

        } catch (error) {
            console.error(`Đã xảy ra lỗi khi thực thi lệnh help: ${error.message}`);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Đã có lỗi khi cố gắng thực thi lệnh đó!', ephemeral: true });
                } else {
                    await interaction.editReply({ content: 'Đã có lỗi khi cố gắng thực thi lệnh đó!' });
                }
            } catch (replyError) {
                console.error('Không thể gửi tin nhắn lỗi:', replyError);
            }
        }
    }
};