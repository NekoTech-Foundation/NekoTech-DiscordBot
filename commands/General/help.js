const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ApplicationCommandOptionType
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
        // use command.category assigned by utils.js
        if ((cmd.category || 'General') === category) {
            commands.push(cmd);
        }
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

function createCategorySelectMenu(categories, currentCategory) {
    const options = categories.map(cat => ({
        label: cat,
        value: cat,
        description: getCategoryDescription(cat),
        emoji: getCategoryEmoji(cat),
        default: cat === currentCategory
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('Chọn danh mục lệnh...')
            .addOptions(options)
    );
}

function createCommandListEmbed(client, category, interaction) {
    const commands = getCommandsByCategory(client, category);
    
    // Sort commands alphabetically
    commands.sort((a, b) => a.data.name.localeCompare(b.data.name));

    const description = commands.map(cmd => {
        let desc = `**/${cmd.data.name}** - ${cmd.data.description}`;
        // List subcommands if any
        if (cmd.data.options) {
            const subcommands = cmd.data.options.filter(opt => opt.type === ApplicationCommandOptionType.Subcommand);
            if (subcommands.length > 0) {
                const subNames = subcommands.map(s => `\`${s.name}\``).join(', ');
                desc += `\n> Subcommands: ${subNames}`;
            }
        }
        return desc;
    }).join('\n\n');

    return new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${getCategoryEmoji(category)} Danh mục: ${category}`)
        .setDescription(description || 'Chưa có lệnh nào trong danh mục này.')
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ 
            text: `Yêu cầu bởi ${interaction.user.username}`, 
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();
}

function createCommandDetailEmbed(command) {
    const data = command.data;
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`📖 Hướng dẫn: /${data.name}`)
        .setDescription(data.description)
        .addFields({ name: '📂 Danh mục', value: command.category || 'General', inline: true });

    if (data.options && data.options.length > 0) {
        let optionsText = '';
        data.options.forEach(opt => {
            if (opt.type === ApplicationCommandOptionType.Subcommand) {
                optionsText += `**/ ${data.name} ${opt.name}**: ${opt.description}\n`;
                if (opt.options) {
                    opt.options.forEach(subOpt => {
                         const required = subOpt.required ? '(Bắt buộc)' : '(Tùy chọn)';
                         optionsText += `  └ \`${subOpt.name}\` ${required}: ${subOpt.description}\n`;
                    });
                }
            } else if (opt.type === ApplicationCommandOptionType.SubcommandGroup) {
                 optionsText += `**[Group] ${opt.name}**: ${opt.description}\n`;
            } else {
                const required = opt.required ? '(Bắt buộc)' : '(Tùy chọn)';
                optionsText += `• \`${opt.name}\` ${required}: ${opt.description}\n`;
            }
        });
        if (optionsText) {
            embed.addFields({ name: '⚙️ Tùy chọn / Subcommands', value: optionsText });
        }
    }

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
        // Fix for "TypeError: Cannot read properties of undefined (reading 'commandsReady')"
        // If client is passed correctly, this should work.
        // Also handling if commandsReady is not yet set (though it should be by the time user can interact)
        
        await interaction.deferReply();

        const commandName = interaction.options.getString('command');

        if (commandName) {
            const command = client.slashCommands.get(commandName.toLowerCase());
            if (!command) {
                return interaction.editReply(`❌ Không tìm thấy lệnh \`${commandName}\`.`);
            }
            const embed = createCommandDetailEmbed(command);
            return interaction.editReply({ embeds: [embed] });
        }

        // Main Help Menu
        const categories = getAllCategories(client);
        // Default to 'General' or the first category
        const initialCategory = categories.includes('General') ? 'General' : categories[0];
        
        const embed = createCommandListEmbed(client, initialCategory, interaction);
        const row = createCategorySelectMenu(categories, initialCategory);

        const response = await interaction.editReply({
            content: '👋 Chào mừng đến với **NekoTech Bot**! Chọn danh mục bên dưới để xem lệnh.',
            embeds: [embed],
            components: [row]
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id && i.customId === 'help_category_select',
            time: 600000 // 10 minutes
        });

        collector.on('collect', async i => {
            const selectedCategory = i.values[0];
            const newEmbed = createCommandListEmbed(client, selectedCategory, interaction);
            const newRow = createCategorySelectMenu(categories, selectedCategory);
            
            await i.update({
                embeds: [newEmbed],
                components: [newRow]
            });
        });

        collector.on('end', () => {
             // Disable components on timeout
             // We can't edit ephemeral messages effectively if deferred? msg is regular reply.
             // Just attempting to remove components.
             interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};