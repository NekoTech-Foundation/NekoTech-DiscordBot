const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ApplicationCommandOptionType
} = require('discord.js');
const { loadLang } = require('../../utils/langLoader');

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
function createPageEmbed(client, interaction, commands, page, helpLang) {
    const itemsPerPage = 7;
    const totalPages = Math.ceil(commands.length / itemsPerPage);
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const commandsOnPage = commands.slice(start, end);

    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

    let description = helpLang.UI.Greeting.replace('{user}', interaction.user.username);
    description += helpLang.UI.Desc;
    description += helpLang.UI.Links.replace('{invite}', inviteLink);

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
        .setTitle(helpLang.UI.Title)
        .setDescription(description)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({
            text: helpLang.UI.PageFooter
                .replace('{current}', page + 1)
                .replace('{total}', totalPages)
                .replace('{count}', commands.length),
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
}

// Tạo embed cho lệnh cụ thể
function createCommandEmbed(client, commandName, helpLang) {
    const command = client.slashCommands.get(commandName.toLowerCase());

    if (!command) return null;

    const commandJSON = command.data.toJSON();
    let description = helpLang.UI.CommandDesc.replace('{desc}', commandJSON.description || helpLang.UI.NoDesc);
    description += helpLang.UI.Usage.replace('{usage}', `/${commandJSON.name}`);

    if (commandJSON.options && commandJSON.options.length > 0) {
        description += helpLang.UI.Options;
        commandJSON.options.forEach(option => {
            const required = option.required ? helpLang.UI.Required : helpLang.UI.Optional;

            if (option.type === ApplicationCommandOptionType.Subcommand) {
                description += `\n**/${commandJSON.name} ${option.name}**\n`;
                description += `└ ${option.description}\n`;

                if (option.options && option.options.length > 0) {
                    option.options.forEach(subOpt => {
                        const subRequired = subOpt.required ? helpLang.UI.Required : helpLang.UI.Optional;
                        description += `  • \`${subOpt.name}\` ${subRequired} - ${subOpt.description}\n`;
                    });
                }
            } else {
                description += `• \`${option.name}\` ${required} - ${option.description}\n`;

                if (option.choices && option.choices.length > 0) {
                    description += helpLang.UI.Values.replace('{values}', option.choices.map(c => `\`${c.name}\``).join(', '));
                }
            }
        });
    }

    return new EmbedBuilder()
        .setColor('#1769FF')
        .setTitle(helpLang.UI.DetailTitle.replace('{command}', commandJSON.name))
        .setDescription(description)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: helpLang.UI.BackFooter })
        .setTimestamp();
}

// Tạo buttons phân trang
function createPaginationButtons(currentPage, totalPages, disabled = false) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('previous_page')
                .setLabel('◀')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage === 0),
            new ButtonBuilder()
                .setCustomId('page_number')
                .setLabel(`${currentPage + 1} / ${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('▶')
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
        const lang = loadLang(interaction.guild.id);
        const helpLang = lang.Addons.Help;

        try {
            // Kiểm tra commands đã ready
            if (!client.commandsReady) {
                return await interaction.reply({
                    content: helpLang.Errors.NotReady,
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            const commandQuery = interaction.options.getString('lệnh');

            // Nếu tìm kiếm lệnh cụ thể
            if (commandQuery) {
                const commandEmbed = createCommandEmbed(client, commandQuery, helpLang);

                if (!commandEmbed) {
                    return await interaction.editReply({
                        content: helpLang.Errors.NotFound.replace('{command}', commandQuery)
                    });
                }

                const backButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_list')
                            .setLabel(helpLang.UI.ButtonBack)
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
                        const embed = createPageEmbed(client, interaction, commands, 0, helpLang);
                        const buttons = createPaginationButtons(0, Math.ceil(commands.length / 7));

                        await i.update({
                            embeds: [embed],
                            components: [buttons]
                        });

                        collector.stop();
                        startMainCollector(response, interaction, client, helpLang);
                    }
                });

                return;
            }

            // Hiển thị danh sách lệnh
            const commands = getAllCommands(client);
            const itemsPerPage = 7;
            const totalPages = Math.ceil(commands.length / itemsPerPage);
            let currentPage = 0;

            const initialEmbed = createPageEmbed(client, interaction, commands, currentPage, helpLang);
            const initialButtons = createPaginationButtons(currentPage, totalPages);

            const response = await interaction.editReply({
                embeds: [initialEmbed],
                components: [initialButtons]
            });

            startMainCollector(response, interaction, client, helpLang);

        } catch (error) {
            console.error(`Lỗi khi thực thi lệnh help:`, error);
            const errorMessage = helpLang.Errors.Generic;

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
function startMainCollector(response, interaction, client, helpLang) {
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

            const newEmbed = createPageEmbed(client, interaction, commands, currentPage, helpLang);
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
