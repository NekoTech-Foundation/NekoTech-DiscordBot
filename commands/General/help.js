const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ApplicationCommandOptionType,
    PermissionsBitField
} = require('discord.js');

const CATEGORY_EMOJIS = {
    'Fun': '🎲',
    'General': '📘',
    'System': '⚙️',
    'Economy': '💰',
    'Fishing': '🎣',
    'Farming': '🌾',
    'AFK': '💤',
    'Pixiv': '🎨',
    'VoiceMaster': '🔊',
    'Utility': '🛠️',
    'Bypass': '🔗',
    'Giveaway': '🎉',
    'VeSo': '🎫',
    'Translator': '🌐',
    'NoiTu': '🔤',
    'Hentai': '🔞',
    'Weather': '☁️',
    'Marry': '💍',
    'Default': '📁'
};

const CATEGORY_DESCRIPTIONS = {
    'Fun': 'Các trò chơi và giải trí',
    'General': 'Các lệnh thông thường',
    'System': 'Hệ thống và quản lý bot',
    'Economy': 'Hệ thống kinh tế và tiền tệ',
    'Fishing': 'Câu cá thư giãn',
    'Farming': 'Nông trại vui vẻ',
    'AFK': 'Hệ thống treo máy',
    'Pixiv': 'Tìm kiếm ảnh Pixiv',
    'VoiceMaster': 'Tạo phòng voice riêng',
    'Utility': 'Các tiện ích hữu dụng',
    'Bypass': 'Bỏ qua link rút gọn',
    'Giveaway': 'Tổ chức giveaway',
    'VeSo': 'Xổ số kiến thiết',
    'Translator': 'Dịch thuật đa ngôn ngữ',
    'NoiTu': 'Trò chơi nối từ',
    'Weather': 'Thông tin thời tiết',
    'Marry': 'Hệ thống kết hôn',
    'Default': 'Các lệnh khác'
};

function getCategoryEmoji(category) {
    return CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS['Default'];
}

function getCategoryDescription(category) {
    return CATEGORY_DESCRIPTIONS[category] || 'Danh sách lệnh cho ' + category;
}

function getCommandsByCategory(client, category) {
    const commands = [];
    client.slashCommands.forEach(cmd => {
        if ((cmd.category || 'General') === category) {
            commands.push(cmd);
        }
    });
    // Sort commands alphabetically safely
    commands.sort((a, b) => {
        const nameA = a.data?.name || 'unknown';
        const nameB = b.data?.name || 'unknown';
        return nameA.localeCompare(nameB);
    });
    return commands;
}

function getAllCategories(client) {
    const categories = new Set();
    client.slashCommands.forEach(cmd => {
        categories.add(cmd.category || 'General');
    });
    return Array.from(categories).sort();
}

// 1. Dropdown: Select Module (Category)
function createCategorySelectMenu(categories, currentCategory) {
    const options = [
        {
            label: 'Trang chủ',
            value: 'overview',
            description: 'Quay lại xem tổng quan và thống kê',
            emoji: '🏠',
            default: currentCategory === 'overview'
        },
        ...categories.map(cat => ({
            label: cat,
            value: cat,
            description: getCategoryDescription(cat),
            emoji: getCategoryEmoji(cat),
            default: cat === currentCategory
        }))
    ];

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('Chọn module lệnh...')
            .addOptions(options)
    );
}

// 2. Dropdown: Select Command (Detailed View)
function createCommandSelectMenu(commands) {
    // Discord limits Select Menu to 25 items
    // If > 25, we might need a way to search or handle it. 
    // For now, take first 25. Ideally pagination handles list display, but dropdown is hard to paginate.
    const slicedCommands = commands.slice(0, 25);
    
    if (slicedCommands.length === 0) return null;

    const options = slicedCommands.map(cmd => {
        const name = cmd.data?.name || 'unknown';
        const desc = cmd.data?.description || 'No description';
        return {
            label: `/${name}`,
            value: name,
            description: desc.substring(0, 100),
            emoji: '🔹'
        };
    });

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_command_select')
            .setPlaceholder('Chọn lệnh để xem chi tiết...')
            .addOptions(options)
    );
}

// 3. Pagination Buttons
function createPaginationButtons(currentPage, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_prev')
            .setLabel('Trước')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0),
        new ButtonBuilder()
            .setCustomId('help_page_num')
            .setLabel(`${currentPage + 1}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('help_next')
            .setLabel('Tiếp')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages - 1)
    );
}

// --- EMBEDS ---

function createOverviewEmbed(client, categories, interaction) {
    const totalCommands = client.slashCommands.size;
    
    const fields = categories.map(cat => {
        const count = getCommandsByCategory(client, cat).length;
        return {
            name: `${getCategoryEmoji(cat)} ${cat}`,
            value: `${count} lệnh`,
            inline: true
        };
    });

    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

    return new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`📚 Menu Trợ Giúp`)
        .setDescription(
            `**NekoTech** là một bot Discord đa năng, đáp ứng mọi nhu cầu cần thiết.\n\n` +
            `• [Server Giải đáp & Hỗ trợ](https://discord.gg/96hgDj4b4j)\n` +
            `• [Hướng dẫn Sử dụng](https://docs.nekotech.xyz) - [Điều khoản Dịch vụ](https://nekotech.xyz/tos) - [Chính sách Bảo mật](https://nekotech.xyz/privacy) - [Invite bot!](${inviteLink})\n\n` +
            `Để xem hướng dẫn về các lệnh có sẵn, sử dụng dropdown phía dưới.`
        )
        .addFields(fields)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ 
            text: `NekoTech • Tổng: ${totalCommands} lệnh`, 
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
}

function createCommandListEmbed(client, category, interaction, page, itemsPerPage) {
    const allCommands = getCommandsByCategory(client, category);
    const totalPages = Math.ceil(allCommands.length / itemsPerPage);
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const commandsOnPage = allCommands.slice(start, end);

    const description = commandsOnPage.map((cmd, index) => {
        const cmdName = cmd.data?.name || 'unknown';
        const cmdDesc = cmd.data?.description || 'Không có mô tả';
        return `**/${cmdName}**: ${cmdDesc}`;
    }).join('\n');

    return new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`${getCategoryEmoji(category)} Các lệnh ${category}`)
        .setDescription(
            `Chọn một lệnh từ menu thả xuống bên dưới để xem thông tin chi tiết.\n\n` +
            `**Các lệnh khả dụng (${start + 1}-${Math.min(end, allCommands.length)} trong tổng số ${allCommands.length})**\n` +
            `${description}`
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ 
            text: `NekoTech • Tổng: ${allCommands.length} lệnh • Trang ${page + 1}/${totalPages}`, 
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
}

function createCommandDetailEmbed(command, interaction) {
    const data = command.data || {};
    const name = data.name || 'Undefined';
    const description = data.description || 'No description';
    
    // Determine Permissions
    let perms = 'Mọi người';
    if (data.default_member_permissions) {
        // This is a bitmask, difficult to decode easily into text without a helper, 
        // but we can check if it exists.
        perms = 'Hạn chế (Xem Discord)';
    }

    const isNSFW = data.nsfw ? 'Có' : 'Không';
    const isGuildOnly = !data.dm_permission ? 'Có' : 'Không (Cả DM)';

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setTitle(`/${name}`)
        .setDescription(description)
        .addFields(
            { name: 'Phiên bản Slash', value: `/${name}`, inline: true },
            { name: 'Phiên bản Prefix', value: 'Không khả dụng', inline: true }, // Assuming migrated to slash
            { name: '\u200B', value: '\u200B', inline: false }, // Spacer
            { name: 'Chỉ Server', value: isGuildOnly, inline: true },
            { name: 'NSFW', value: isNSFW, inline: true },
            { name: 'Danh mục', value: command.category || 'General', inline: true }
        );

    // Subcommands
    if (data.options && data.options.length > 0) {
        const subcommands = [];
        data.options.forEach(opt => {
            if (opt.type === ApplicationCommandOptionType.Subcommand) {
                const required = opt.options?.some(o => o.required) ? '*' : ''; 
                subcommands.push(`🥗 **/${name} ${opt.name}**: ${opt.description}`);
            } else if (opt.type === ApplicationCommandOptionType.SubcommandGroup) {
                 subcommands.push(`📁 **[Group] ${opt.name}**: ${opt.description}`);
            }
        });

        if (subcommands.length > 0) {
            embed.addFields({ name: 'Các lệnh con', value: subcommands.join('\n') });
        }
    }

    embed.setFooter({ text: 'Lưu ý: Đây là một khối lệnh.' });
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách lệnh hoặc hướng dẫn chi tiết')
        .addStringOption(option => 
            option.setName('command')
                .setDescription('Tên lệnh cần xem chi tiết')
                .setRequired(false)
                .setAutocomplete(true)
        ),
    category: 'General',

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const choices = Array.from(client.slashCommands.keys());
        const filtered = choices.filter(choice => choice.startsWith(focusedValue));
        await interaction.respond(
            filtered.slice(0, 25).map(choice => ({ name: choice, value: choice }))
        );
    },

    async execute(interaction, client) {
        await interaction.deferReply();

        const commandName = interaction.options.getString('command');

        if (commandName) {
            const command = client.slashCommands.get(commandName.toLowerCase());
            if (!command) {
                return interaction.editReply(`❌ Không tìm thấy lệnh \`${commandName}\`.`);
            }
            const embed = createCommandDetailEmbed(command, interaction);
            return interaction.editReply({ embeds: [embed] });
        }

        // --- STATE MANAGEMENT ---
        // We need to track: Current Category, Current Page
        // Initial State:
        const categories = getAllCategories(client);
        let currentCategory = 'overview';
        let currentPage = 0;
        const itemsPerPage = 8; // As per screenshot '1-8'

        // Render Initial View (Overview)
        const renderView = () => {
             if (currentCategory === 'overview') {
                 const embed = createOverviewEmbed(client, categories, interaction);
                 const row1 = createCategorySelectMenu(categories, currentCategory);
                 return { embeds: [embed], components: [row1] };
             } else {
                 const embed = createCommandListEmbed(client, currentCategory, interaction, currentPage, itemsPerPage);
                 const row1 = createCategorySelectMenu(categories, currentCategory);
                 
                 const row2 = createCommandSelectMenu(getCommandsByCategory(client, currentCategory));
                 
                 const totalItems = getCommandsByCategory(client, currentCategory).length;
                 const totalPages = Math.ceil(totalItems / itemsPerPage);
                 
                 const components = [row1];
                 if (row2) components.push(row2);
                 if (totalPages > 1) {
                     const row3 = createPaginationButtons(currentPage, totalPages);
                     components.push(row3);
                 }
                 
                 return { embeds: [embed], components: components };
             }
        };

        const initialPayload = renderView();
        const response = await interaction.editReply(initialPayload);

        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 600000 // 10 minutes
        });

        collector.on('collect', async i => {
            const id = i.customId;

            if (id === 'help_category_select') {
                const selected = i.values[0];
                currentCategory = selected;
                currentPage = 0; // Reset page on category switch
            } 
            else if (id === 'help_prev') {
                if (currentPage > 0) currentPage--;
            }
            else if (id === 'help_next') {
                const totalItems = getCommandsByCategory(client, currentCategory).length;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                if (currentPage < totalPages - 1) currentPage++;
            }
            else if (id === 'help_command_select') {
                 const cmdName = i.values[0];
                 const command = client.slashCommands.get(cmdName.toLowerCase());
                 if (command) {
                     const embed = createCommandDetailEmbed(command, interaction);
                     // Keep Category Dropdown, remove Command Dropdown/Pagination temporarily? 
                     // Or just reply ephemerally? 
                     // GlitchBucket likely replaces the embed.
                     // IMPORTANT: To go back, user needs to re-select category or use back button?
                     // Screenshot doesn't show "Back" from detail. 
                     // Let's replace the Main Embed with Detail Embed, 
                     // and keep Category Dropdown so they can switch away or back to list.
                     // The requirement "Dropdowns remain available" is key.
                     
                     // If we show detail, what happens to pagination buttons?
                     // They should probably be hidden or specific to detail.
                     // Let's just show Detail Embed + Category Select.
                     
                     const row1 = createCategorySelectMenu(categories, currentCategory);
                     await i.update({ embeds: [embed], components: [row1] });
                     return; 
                 }
            }

            // Re-render
            const payload = renderView();
            await i.update(payload);
        });

        collector.on('end', () => {
             interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};