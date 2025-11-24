const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ApplicationCommandOptionType
} = require('discord.js');
const { getLang } = require('../../utils/configLoader');

// Lấy tất cả commands dưới dạng list
function getAllCommands(client) {
    const commandList = [];

    client.slashCommands.forEach(command => {
        if (!command.data || typeof command.data.toJSON !== 'function') return;

        const commandJSON = command.data.toJSON();
        const commandInfo = {
            name: commandJSON.name,
            description: commandJSON.description || 'Không có mô tả',
            subcommands: []
        };

        // Lấy subcommands nếu có
        if (commandJSON.options) {
            const subcommands = commandJSON.options.filter(
                option => option.type === ApplicationCommandOptionType.Subcommand
            );
            commandInfo.subcommands = subcommands.map(sub => ({
                name: sub.name,
                description: sub.description || 'Không có mô tả'
            }));
        }

        commandList.push(commandInfo);
    });

    // Sắp xếp theo alphabet
    commandList.sort((a, b) => a.name.localeCompare(b.name));
    return commandList;
}

// Tạo embed cho từng trang
function createPageEmbed(client, interaction, commands, page) {
    const itemsPerPage = 7;
    const totalPages = Math.ceil(commands.length / itemsPerPage);
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const commandsOnPage = commands.slice(start, end);

    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

    let description = `Chào **${interaction.user.username}**! 👋\n\n`;
    description += `> **KentaBucket** là bot Discord đa năng, đáp ứng hầu hết mọi nhu cầu của máy chủ.\n`;
    description += `> Để xem chi tiết một lệnh, sử dụng: \`/help lệnh:<tên_lệnh>\`\n\n`;
    description += `🔗 [Support](https://discord.gg/96hgDj4b4j) • [Hướng dẫn](https://your-docs-link.com) • [Điều khoản](https://your-tos-link.com) • [Mời Bot](${inviteLink})\n\n`;
    description += `**━━━━━━━━━━━━━━━━━━━━**\n\n`;

    commandsOnPage.forEach(cmd => {
        description += `**\`/${cmd.name}\`** - ${cmd.description}\n`;

        if (cmd.subcommands.length > 0) {
            cmd.subcommands.forEach(sub => {
                description += `  ├ \`${sub.name}\` - ${sub.description}\n`;
            });
        }
    });

    return new EmbedBuilder()
        .setColor('#1769FF')
        .setTitle('📖 Danh sách lệnh')
        .setDescription(description)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({
            text: `Trang ${page + 1}/${totalPages} • Tổng ${commands.length} lệnh`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
}

// Tạo embed cho lệnh cụ thể
function createCommandEmbed(client, commandName) {
    const command = client.slashCommands.get(commandName.toLowerCase());

    if (!command) return null;

    const commandJSON = command.data.toJSON();
    let description = `**📝 Mô tả:**\n${commandJSON.description || 'Không có mô tả'}\n\n`;
    description += `**💡 Cách dùng:** \`/${commandJSON.name}\`\n\n`;

    if (commandJSON.options && commandJSON.options.length > 0) {
        description += `**⚙️ Tùy chọn:**\n`;
        commandJSON.options.forEach(option => {
            const required = option.required ? '`[Bắt buộc]`' : '`[Tùy chọn]`';

            if (option.type === ApplicationCommandOptionType.Subcommand) {
                description += `\n**/${commandJSON.name} ${option.name}**\n`;
                description += `└ ${option.description}\n`;

                if (option.options && option.options.length > 0) {
                    option.options.forEach(subOpt => {
                        const subRequired = subOpt.required ? '`[Bắt buộc]`' : '`[Tùy chọn]`';
                        description += `  • \`${subOpt.name}\` ${subRequired} - ${subOpt.description}\n`;
                    });
                }
            } else {
                description += `• \`${option.name}\` ${required} - ${option.description}\n`;

                if (option.choices && option.choices.length > 0) {
                    description += `  Giá trị: ${option.choices.map(c => `\`${c.name}\``).join(', ')}\n`;
                }
            }
        });
    }

    return new EmbedBuilder()
        .setColor('#1769FF')
        .setTitle(`📘 Chi tiết: /${commandJSON.name}`)
        .setDescription(description)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: 'Nhấn nút bên dưới để quay lại danh sách' })
        .setTimestamp();
}

// Tạo buttons phân trang
function createPaginationButtons(currentPage, totalPages, disabled = false) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('previous_page')
                .setLabel('◀ Trước')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage === 0),
            new ButtonBuilder()
                .setCustomId('page_number')
                .setLabel(`${currentPage + 1} / ${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Sau ▶')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage >= totalPages - 1)
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Xem danh sách lệnh và hướng dẫn')
        .addStringOption(option =>
            option
                .setName('lệnh')
                .setDescription('Tên lệnh cần xem chi tiết')
                .setRequired(false)
        ),
    category: 'Chung',

    async execute(interaction, client) {
        try {
            // Kiểm tra commands đã ready
            if (!client.commandsReady) {
                return await interaction.reply({
                    content: '⏳ Các lệnh vẫn đang được đăng ký. Vui lòng thử lại sau.',
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            const commandQuery = interaction.options.getString('lệnh');

            // Nếu tìm kiếm lệnh cụ thể
            if (commandQuery) {
                const commandEmbed = createCommandEmbed(client, commandQuery);

                if (!commandEmbed) {
                    return await interaction.editReply({
                        content: `❌ Không tìm thấy lệnh \`${commandQuery}\`\n💡 Dùng \`/help\` để xem tất cả lệnh.`
                    });
                }

                const backButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_list')
                            .setLabel('↩ Quay lại danh sách')
                            .setStyle(ButtonStyle.Success)
                    );

                const response = await interaction.editReply({
                    embeds: [commandEmbed],
                    components: [backButton]
                });

                const collector = response.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 300000
                });

                collector.on('collect', async i => {
                    if (i.customId === 'back_to_list') {
                        const commands = getAllCommands(client);
                        const embed = createPageEmbed(client, interaction, commands, 0);
                        const buttons = createPaginationButtons(0, Math.ceil(commands.length / 7));

                        await i.update({
                            embeds: [embed],
                            components: [buttons]
                        });

                        collector.stop();
                        startMainCollector(response, interaction, client);
                    }
                });

                return;
            }

            // Hiển thị danh sách lệnh
            const commands = getAllCommands(client);
            const itemsPerPage = 7;
            const totalPages = Math.ceil(commands.length / itemsPerPage);
            let currentPage = 0;

            const initialEmbed = createPageEmbed(client, interaction, commands, currentPage);
            const initialButtons = createPaginationButtons(currentPage, totalPages);

            const response = await interaction.editReply({
                embeds: [initialEmbed],
                components: [initialButtons]
            });

            startMainCollector(response, interaction, client);

        } catch (error) {
            console.error(`Lỗi khi thực thi lệnh help:`, error);
            const errorMessage = '❌ Đã có lỗi xảy ra!';

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.editReply({ content: errorMessage });
                }
            } catch (replyError) {
                console.error('Không thể gửi tin nhắn lỗi:', replyError);
            }
        }
    }
};

// Collector chính cho pagination
function startMainCollector(response, interaction, client) {
    const commands = getAllCommands(client);
    const itemsPerPage = 7;
    const totalPages = Math.ceil(commands.length / itemsPerPage);
    let currentPage = 0;

    const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        idle: 300000 // 5 phút
    });

    collector.on('collect', async i => {
        try {
            if (i.customId === 'previous_page') {
                currentPage--;
            } else if (i.customId === 'next_page') {
                currentPage++;
            }

            const newEmbed = createPageEmbed(client, interaction, commands, currentPage);
            const newButtons = createPaginationButtons(currentPage, totalPages);

            await i.update({
                embeds: [newEmbed],
                components: [newButtons]
            });
        } catch (error) {
            console.error('Lỗi khi xử lý pagination:', error);
        }
    });

    collector.on('end', async () => {
        try {
            const disabledButtons = createPaginationButtons(currentPage, totalPages, true);
            await interaction.editReply({
                components: [disabledButtons]
            });
        } catch (error) {
            if (error.code !== 10008) {
                console.error('Lỗi khi vô hiệu hóa buttons:', error);
            }
        }
    });
}
