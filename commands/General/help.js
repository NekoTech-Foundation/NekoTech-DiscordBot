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

function createOverviewEmbed(client, categories, interaction) {
    const totalCommands = client.slashCommands.size;
    
    // Split categories into two columns for better display if needed, 
    // but the screenshot shows a grid-like view. 
    // Discord fields with inline: true wrap automatically 3 per row (desktop) / 2 (mobile).
    
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
        .setColor('#2b2d31') // Dark theme color similar to screenshot
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

function createCommandListEmbed(client, category, interaction) {
    const commands = getCommandsByCategory(client, category);
    
    // Sort commands alphabetically safely
    commands.sort((a, b) => {
        const nameA = a.data?.name || 'unknown';
        const nameB = b.data?.name || 'unknown';
        return nameA.localeCompare(nameB);
    });

    const description = commands.map(cmd => {
        const cmdName = cmd.data?.name || 'unknown';
        const cmdDesc = cmd.data?.description || 'Không có mô tả';
        let desc = `**/${cmdName}** - ${cmdDesc}`;
        // List subcommands if any
        if (cmd.data.options) {
            const subcommands = cmd.data?.options?.filter(opt => opt.type === ApplicationCommandOptionType.Subcommand) || [];
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
    const data = command.data || {};
    const name = data.name || 'Undefined';
    const description = data.description || 'No description';

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`📖 Hướng dẫn: /${name}`)
        .setDescription(description)
        .addFields({ name: '📂 Danh mục', value: command.category || 'General', inline: true });

    if (data.options && data.options.length > 0) {
        let optionsText = '';
        data.options.forEach(opt => {
            if (opt.type === ApplicationCommandOptionType.Subcommand) {
                optionsText += `**/ ${name} ${opt.name}**: ${opt.description}\n`;
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

        // Main Help Menu (Overview)
        const categories = getAllCategories(client);
        
        const embed = createOverviewEmbed(client, categories, interaction);
        const row = createCategorySelectMenu(categories, 'overview');

        const response = await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id && i.customId === 'help_category_select',
            time: 600000 // 10 minutes
        });

        collector.on('collect', async i => {
            const selectedValue = i.values[0];
            
            let newEmbed;
            if (selectedValue === 'overview') {
                newEmbed = createOverviewEmbed(client, categories, interaction);
            } else {
                newEmbed = createCommandListEmbed(client, selectedValue, interaction);
            }
            
            const newRow = createCategorySelectMenu(categories, selectedValue);
            
            await i.update({
                embeds: [newEmbed],
                components: [newRow]
            });
        });

        collector.on('end', () => {
             // Disable components on timeout
             interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};