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
const { getLang } = require('../../utils/langLoader'); // Use direct loader for async support

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

function getCategoryEmoji(category, lang) {
    // Try to get emoji from lang file first, fallback to constant
    return lang.HelpCommand?.Categories?.[category]?.Emoji || CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS['Default'];
}

function getCategoryDescription(category, lang) {
    return lang.HelpCommand?.Categories?.[category]?.Description || `${category} commands`;
}

function getCommandsByCategory(client, category) {
    const commands = [];
    client.slashCommands.forEach(cmd => {
        if ((cmd.category || 'General') === category) {
            commands.push(cmd);
        }
    });
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
function createCategorySelectMenu(categories, currentCategory, lang) {
    const options = [
        {
            label: lang.HelpCommand?.HomeLabel || 'Trang chủ',
            value: 'overview',
            description: lang.HelpCommand?.HomeDescription || 'Quay lại tổng quan',
            emoji: '🏠',
            default: currentCategory === 'overview'
        },
        ...categories.map(cat => ({
            label: lang.HelpCommand?.Categories?.[cat]?.Name || cat, // Use localized name
            value: cat, // Keep internal value as key
            description: getCategoryDescription(cat, lang),
            emoji: getCategoryEmoji(cat, lang),
            default: cat === currentCategory
        }))
    ];

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder(lang.HelpCommand?.CategorySelectPlaceholder || 'Select a category...')
            .addOptions(options)
    );
}

// 2. Dropdown: Select Command (Detailed View)
function createCommandSelectMenu(commands, lang) {
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
            .setPlaceholder(lang.HelpCommand?.CommandSelectPlaceholder || 'Select command to view details...')
            .addOptions(options)
    );
}

// 3. Pagination Buttons
function createPaginationButtons(currentPage, totalPages, lang) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_prev')
            .setLabel(lang.HelpCommand?.PrevButtonLabel || 'Previous')
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
            .setLabel(lang.HelpCommand?.NextButtonLabel || 'Next')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages - 1)
    );
}

// --- EMBEDS ---

function replacePlaceholders(string, placeholders) {
    if (!string) return '';
    let result = string;
    for (const [key, value] of Object.entries(placeholders)) {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
}

function createOverviewEmbed(client, categories, interaction, lang) {
    const totalCommands = client.slashCommands.size;
    
    const fields = categories.map(cat => {
        const count = getCommandsByCategory(client, cat).length;
        const catName = lang.HelpCommand?.Categories?.[cat]?.Name || cat;
        return {
            name: `${getCategoryEmoji(cat, lang)} ${catName}`,
            value: `${count} ${lang.HelpCommand?.CommandLabel || 'commands'}`,
            inline: true
        };
    });

    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
    
    const embedConfig = lang.HelpCommand?.MainEmbed || {};
    const title = replacePlaceholders(embedConfig.Title, { botName: client.user.username });
    
    // Handle description array or string
    let descContent = '';
    if (Array.isArray(embedConfig.Description)) {
        descContent = embedConfig.Description.join('\n');
    } else {
        descContent = embedConfig.Description || 'Help Menu';
    }
    descContent = replacePlaceholders(descContent, { inviteLink });

    return new EmbedBuilder()
        .setColor(embedConfig.Color || '#2b2d31')
        .setTitle(title)
        .setDescription(descContent)
        .addFields(fields)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ 
            text: replacePlaceholders(embedConfig.Footer?.Text || 'NekoTech', { totalCommands }), 
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
}

function createCommandListEmbed(client, category, interaction, page, itemsPerPage, lang) {
    const allCommands = getCommandsByCategory(client, category);
    const totalPages = Math.ceil(allCommands.length / itemsPerPage);
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const commandsOnPage = allCommands.slice(start, end);

    const description = commandsOnPage.map((cmd, index) => {
        const cmdName = cmd.data?.name || 'unknown';
        const cmdDesc = cmd.data?.description || 'No description';
        return `**/${cmdName}**: ${cmdDesc}`;
    }).join('\n');

    const catName = lang.HelpCommand?.Categories?.[category]?.Name || category;
    const embedConfig = lang.HelpCommand?.CategoryEmbed || {};

    return new EmbedBuilder()
        .setColor(embedConfig.Color || '#2b2d31')
        .setTitle(replacePlaceholders(embedConfig.Title || 'Commands in {category}', { category: catName })) // Use localized category name
        .setDescription(
            (lang.HelpCommand?.CategoryDescriptionPrefix || 'Select a command below to view details.\n\n') +
            `**${lang.HelpCommand?.AvailableCommandsLabel || 'Available Commands'} (${start + 1}-${Math.min(end, allCommands.length)} / ${allCommands.length})**\n` +
            `${description}`
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ 
            text: `${embedConfig.Footer?.Text || 'Page'} • ${page + 1}/${totalPages}`, 
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
}

function createCommandDetailEmbed(command, interaction, lang) {
    const data = command.data || {};
    const name = data.name || 'Undefined';
    const description = data.description || 'No description';
    
    let perms = lang.HelpCommand?.Permissions?.Everyone || 'Everyone';
    if (data.default_member_permissions) {
        perms = lang.HelpCommand?.Permissions?.Restricted || 'Restricted';
    }

    const isNSFW = data.nsfw ? (lang.Common?.Yes || 'Yes') : (lang.Common?.No || 'No');
    const isGuildOnly = !data.dm_permission ? (lang.Common?.Yes || 'Yes') : (lang.Common?.NoDM || 'No (DM Allowed)');

    const embedConfig = lang.HelpCommand?.CommandDetailsEmbed || {};

    const embed = new EmbedBuilder()
        .setColor(embedConfig.Color || '#2b2d31')
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setTitle(`/${name}`)
        .setDescription(description)
        .addFields(
            { name: lang.HelpCommand?.Labels?.SlashVersion || 'Slash Version', value: `/${name}`, inline: true },
            { name: lang.HelpCommand?.Labels?.PrefixVersion || 'Prefix Version', value: lang.HelpCommand?.Labels?.NotAvailable || 'N/A', inline: true },
            { name: '\u200B', value: '\u200B', inline: false },
            { name: lang.HelpCommand?.Labels?.ServerOnly || 'Server Only', value: isGuildOnly, inline: true },
            { name: 'NSFW', value: isNSFW, inline: true },
            { name: lang.HelpCommand?.Labels?.Category || 'Category', value: command.category || 'General', inline: true }
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
            embed.addFields({ name: lang.HelpCommand?.Labels?.Subcommands || 'Subcommands', value: subcommands.join('\n') });
        }
    }

    embed.setFooter({ text: embedConfig.Footer?.Text || 'Command Details' });
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách lệnh hoặc hướng dẫn chi tiết / View commands or details')
        .addStringOption(option => 
            option.setName('command')
                .setDescription('Tên lệnh cần xem chi tiết / Command name')
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

    async execute(interaction, lang) {
        await interaction.deferReply();
        
        const client = interaction.client;
        const commandName = interaction.options.getString('command');

        if (commandName) {
            const command = client.slashCommands.get(commandName.toLowerCase());
            if (!command) {
                return interaction.editReply(`❌ ${lang.HelpCommand?.Messages?.NotFound || 'Command not found'} \`${commandName}\`.`);
            }
            const embed = createCommandDetailEmbed(command, interaction, lang);
            return interaction.editReply({ embeds: [embed] });
        }

        // --- STATE MANAGEMENT ---
        const categories = getAllCategories(client);
        let currentCategory = 'overview';
        let currentPage = 0;
        const itemsPerPage = 8;

        const renderView = () => {
             if (currentCategory === 'overview') {
                 const embed = createOverviewEmbed(client, categories, interaction, lang);
                 const row1 = createCategorySelectMenu(categories, currentCategory, lang);
                 return { embeds: [embed], components: [row1] };
             } else {
                 const embed = createCommandListEmbed(client, currentCategory, interaction, currentPage, itemsPerPage, lang);
                 const row1 = createCategorySelectMenu(categories, currentCategory, lang);
                 const row2 = createCommandSelectMenu(getCommandsByCategory(client, currentCategory), lang);
                 
                 const totalItems = getCommandsByCategory(client, currentCategory).length;
                 const totalPages = Math.ceil(totalItems / itemsPerPage);
                 
                 const components = [row1];
                 if (row2) components.push(row2);
                 if (totalPages > 1) {
                     const row3 = createPaginationButtons(currentPage, totalPages, lang);
                     components.push(row3);
                 }
                 
                 return { embeds: [embed], components: components };
             }
        };

        const initialPayload = renderView();
        const response = await interaction.editReply(initialPayload);

        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 600000 
        });

        collector.on('collect', async i => {
            const id = i.customId;

            if (id === 'help_category_select') {
                const selected = i.values[0];
                currentCategory = selected;
                currentPage = 0; 
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
                     const embed = createCommandDetailEmbed(command, interaction, lang);
                     const row1 = createCategorySelectMenu(categories, currentCategory, lang);
                     await i.update({ embeds: [embed], components: [row1] });
                     return; 
                 }
            }

            const payload = renderView();
            try {
                await i.update(payload);
            } catch (e) {
                // If update fails (e.g. already acknowledged), try edit
                await interaction.editReply(payload).catch(() => {});
            }
        });

        collector.on('end', () => {
             interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};