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
const { getLang } = require('../../utils/langLoader');

// Define category mapping and metadata completely here
// Map internal folder/category names to Display Names and Emojis
const CATEGORY_MAP = {
    // Core
    'General': { name: 'Chung', emoji: '📘', description: 'Các lệnh thông tin chung' },
    'Chung': { mapTo: 'General' }, // Maps 'Chung' back to 'General' to merge them

    'System': { name: 'Hệ thống', emoji: '⚙️', description: 'Cấu hình và quản lý bot' },
    'Admin': { mapTo: 'System' },
    'Owner': { name: 'Owner', emoji: '👑', description: 'Lệnh dành riêng cho Owner' },

    // Features
    'Economy': { name: 'Kinh tế', emoji: '💰', description: 'Hệ thống tiền tệ và cửa hàng' },
    'Fishing': { name: 'Câu cá', emoji: '🎣', description: 'Tính năng câu cá giải trí' },
    'Farming': { name: 'Nông trại', emoji: '🌾', description: 'Trồng trọt và chăn nuôi' },
    'Minigame': { name: 'Giải trí', emoji: '🎲', description: 'Các trò chơi nhỏ vui nhộn' },
    'Fun': { mapTo: 'Minigame' },

    // Media
    'Music': { name: 'Âm nhạc', emoji: '🎵', description: 'Nghe nhạc chất lượng cao' },
    'Pixiv': { name: 'Pixiv', emoji: '🎨', description: 'Tìm kiếm và tải ảnh Anime' },
    'Hentai': { name: 'NSFW', emoji: '🔞', description: 'Nội dung người lớn (Yêu cầu kênh NSFW)' },

    // Utilities
    'Utility': { name: 'Tiện ích', emoji: '🛠️', description: 'Các công cụ hữu ích' },
    'TienIch': { mapTo: 'Utility' },
    'Utilities': { mapTo: 'Utility' },
    'Weather': { name: 'Thời tiết', emoji: '☁️', description: 'Tra cứu thông tin thời tiết' },
    'VeSo': { name: 'Xổ số', emoji: '🎫', description: 'Thử vận may với vé số' },
    'Translator': { name: 'Dịch thuật', emoji: '🌐', description: 'Dịch ngôn ngữ đa năng' },
    'NoiTu': { name: 'Nối từ', emoji: '🔤', description: 'Minigame nối từ tiếng Việt' },

    // Addons
    'VoiceMaster': { name: 'Voice Master', emoji: '🔊', description: 'Quản lý kênh voice tạm thời' },
    'Addons': { name: 'Addons', emoji: '🧩', description: 'Các tính năng mở rộng khác' },
    'Giveaway': { name: 'Giveaway', emoji: '🎉', description: 'Tổ chức sự kiện tặng quà' },

    // Fallback
    'Default': { name: 'Khác', emoji: '📁', description: 'Các lệnh chưa phân loại' },
    'unknown': { mapTo: 'Default' }
};

function normalizeCategory(category) {
    if (!category) return 'Default';

    // Check if it's a mapping key
    if (CATEGORY_MAP[category] && CATEGORY_MAP[category].mapTo) {
        return CATEGORY_MAP[category].mapTo;
    }

    // If exact match exists
    if (CATEGORY_MAP[category]) {
        return category;
    }

    // Default return original if no mapping found (will use Default metadata if missing)
    return 'Default';
}

function getCategoryInfo(category) {
    const normalized = normalizeCategory(category);
    return CATEGORY_MAP[normalized] || CATEGORY_MAP['Default'];
}

function getCommandsByCategory(client, categoryKey) {
    const commands = [];
    client.slashCommands.forEach(cmd => {
        // Normalize cmd.category
        const cmdCat = normalizeCategory(cmd.category || 'Default');
        if (cmdCat === categoryKey) {
            commands.push(cmd);
        }
    });
    commands.sort((a, b) => (a.data.name).localeCompare(b.data.name));
    return commands;
}

function getAllCategories(client) {
    const categories = new Set();
    client.slashCommands.forEach(cmd => {
        const normalized = normalizeCategory(cmd.category || 'Default');
        categories.add(normalized);
    });
    // Sort categories: "General" first, others alphabetical, "Owner" last maybe?
    return Array.from(categories).sort((a, b) => {
        if (a === 'General') return -1;
        if (b === 'General') return 1;
        return a.localeCompare(b);
    });
}

// UI Components
function createCategorySelectMenu(categories, currentCategory) {
    const options = [
        {
            label: 'Trang chủ',
            value: 'overview',
            description: 'Quay lại màn hình chính',
            emoji: '🏠',
            default: currentCategory === 'overview'
        }
    ];

    categories.forEach(cat => {
        const info = getCategoryInfo(cat);
        options.push({
            label: info.name,
            value: cat,
            description: info.description,
            emoji: info.emoji,
            default: cat === currentCategory
        });
    });

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('Chọn danh mục lệnh...')
            .addOptions(options)
    );
}

function createCommandSelectMenu(commands) {
    // Only show first 25 commands in dropdown (limitation)
    // For categories with >25 commands, pagination handles the list view
    const sliced = commands.slice(0, 25);

    if (sliced.length === 0) return null;

    const options = sliced.map(cmd => ({
        label: `/${cmd.data.name}`,
        value: cmd.data.name,
        description: (cmd.data.description || 'No description').substring(0, 100),
        emoji: '🔹'
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_command_select')
            .setPlaceholder('Chọn lệnh để xem chi tiết...')
            .addOptions(options)
    );
}

// Embeds
function createOverviewEmbed(client, categories, interaction) {
    const embed = new EmbedBuilder()
        .setColor('#2b2d31') // Discord dark theme color, looks clean
        .setDescription(`## 👋 Chào mừng đến với Menu Trợ giúp của ${client.user.username}\n` +
            `Chọn một danh mục từ menu thả xuống bên dưới để xem các lệnh có sẵn.\n\n` +
            `> 💡 **Tip:** Sử dụng \`/help <tên lệnh>\` để xem chi tiết ngay lập tức.`)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: 'Make with ❤️ by NekoTech Foundations', iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    // Create a robust grid layout simulation using fields
    // We want 2 or 3 columns. Discord allows 3 inline fields per row.

    let fieldCount = 0;
    categories.forEach(cat => {
        const info = getCategoryInfo(cat);
        const count = getCommandsByCategory(client, cat).length;

        embed.addFields({
            name: `${info.emoji} ${info.name}`,
            value: `${count} lệnh`,
            inline: true
        });
        fieldCount++;
    });

    // Add empty fields to alignment if needed (optional, purely aesthetic)
    while (fieldCount % 3 !== 0) {
        embed.addFields({ name: '\u200B', value: '\u200B', inline: true });
        fieldCount++;
    }

    // Add Links button row
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL(global.config?.MusicBot?.Settings?.SupportServer || 'https://discord.gg/nekostudio'),
        new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL('https://nekocomics.xyz'), // Hardcoded based on user context
        new ButtonBuilder().setLabel('Invite Bot').setStyle(ButtonStyle.Link).setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
    );

    return { embed, components: [row] };
}

function createCategoryEmbed(client, category, page, itemsPerPage) {
    const info = getCategoryInfo(category);
    const commands = getCommandsByCategory(client, category);

    const totalPages = Math.ceil(commands.length / itemsPerPage);
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const displayCommands = commands.slice(start, end);

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`${info.emoji} Danh mục: ${info.name}`)
        .setDescription(info.description)
        .setFooter({ text: `Trang ${page + 1}/${totalPages} • Tổng ${commands.length} lệnh` });

    const commandList = displayCommands.map(cmd => {
        return `> </${cmd.data.name}:${cmd.data.id || '0'}> - ${cmd.data.description}`;
    }).join('\n');

    embed.setDescription(`**Các lệnh khả dụng:**\n${commandList || 'Không có lệnh nào.'}`);

    return embed;
}

function createCommandDetailEmbed(command) {
    const data = command.data;
    const info = getCategoryInfo(normalizeCategory(command.category));

    const embed = new EmbedBuilder()
        .setColor('#00AAFF')
        .setTitle(`🔍 Chi tiết lệnh: /${data.name}`)
        .setDescription(data.description || 'Chưa có mô tả.')
        .addFields(
            { name: '📁 Danh mục', value: `${info.emoji} ${info.name}`, inline: true },
            { name: '🔞 NSFW', value: data.nsfw ? 'Có' : 'Không', inline: true },
            { name: '🔒 Server Only', value: !data.dm_permission ? 'Có' : 'Không', inline: true }
        );

    // Subcommands
    if (data.options && data.options.length > 0) {
        const subcommands = data.options.filter(o => o.type === ApplicationCommandOptionType.Subcommand);
        const groups = data.options.filter(o => o.type === ApplicationCommandOptionType.SubcommandGroup);

        if (subcommands.length > 0) {
            const subs = subcommands.map(s => `> </${data.name} ${s.name}:${data.id || '0'}>: ${s.description}`).join('\n');
            embed.addFields({ name: '📝 Các lệnh con', value: subs });
        }

        if (groups.length > 0) {
            const grps = groups.map(g => `> 📂 **${g.name}**: ${g.description}`).join('\n');
            embed.addFields({ name: '📂 Nhóm lệnh', value: grps });
        }
    }

    return embed;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách lệnh và hướng dẫn sử dụng bot')
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
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()));

        // Limit to 25 results
        await interaction.respond(
            filtered.slice(0, 25).map(choice => ({ name: choice, value: choice }))
        );
    },

    async execute(interaction, lang) {
        await interaction.deferReply();

        const client = interaction.client;

        // If user asks for specific command
        const commandName = interaction.options.getString('command');

        if (commandName) {
            const cmd = client.slashCommands.get(commandName.toLowerCase());
            if (!cmd) {
                return interaction.editReply(`❌ Không tìm thấy lệnh \`${commandName}\`.`);
            }
            return interaction.editReply({ embeds: [createCommandDetailEmbed(cmd)] });
        }

        // State
        const categories = getAllCategories(client);
        let currentCategory = 'overview';
        let currentPage = 0;
        const itemsPerPage = 8;

        const render = () => {
            if (currentCategory === 'overview') {
                const { embed, components } = createOverviewEmbed(client, categories, interaction);
                const menu = createCategorySelectMenu(categories, currentCategory);
                return { embeds: [embed], components: [menu, ...components] };
            } else {
                const embed = createCategoryEmbed(client, currentCategory, currentPage, itemsPerPage);
                const catMenu = createCategorySelectMenu(categories, currentCategory);
                const cmdMenu = createCommandSelectMenu(getCommandsByCategory(client, currentCategory));

                const components = [catMenu];
                if (cmdMenu) components.push(cmdMenu);

                // Pagination Buttons if needed
                const totalItems = getCommandsByCategory(client, currentCategory).length;
                if (totalItems > itemsPerPage) {
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('help_prev').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
                        new ButtonBuilder().setCustomId('help_page').setLabel(`${currentPage + 1}/${Math.ceil(totalItems / itemsPerPage)}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('help_next').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(currentPage >= Math.ceil(totalItems / itemsPerPage) - 1)
                    );
                    components.push(row);
                }

                return { embeds: [embed], components };
            }
        };

        const msg = await interaction.editReply(render());

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 600000 // 10 mins
        });

        collector.on('collect', async i => {
            const id = i.customId;

            if (id === 'help_category_select') {
                currentCategory = i.values[0];
                currentPage = 0;
            } else if (id === 'help_command_select') {
                const cmd = client.slashCommands.get(i.values[0]);
                if (cmd) {
                    await i.reply({ embeds: [createCommandDetailEmbed(cmd)], ephemeral: true });
                    return; // Don't update main view
                }
            } else if (id === 'help_prev') {
                if (currentPage > 0) currentPage--;
            } else if (id === 'help_next') {
                currentPage++;
            }

            try {
                await i.update(render());
            } catch (e) {
                // Ignore update errors
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => { });
        });
    }
};