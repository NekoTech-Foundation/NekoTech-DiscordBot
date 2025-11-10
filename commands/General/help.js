const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, ApplicationCommandOptionType, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader');

let globalCommandData = null;

function replacePlaceholders(text, placeholders) {
    if (!text) return '';
    
    return text
        .replace(/{botName}/g, placeholders.botName || '')
        .replace(/{category}/g, placeholders.category || '')
        .replace(/{user}/g, placeholders.user || '')
        .replace(/{guild}/g, placeholders.guild || '')
        .replace(/{user-avatar}/g, placeholders.userAvatar || '')
        .replace(/{guild-avatar}/g, placeholders.guildAvatar || '')
        .replace(/{command}/g, placeholders.command || '')
        .replace(/{description}/g, placeholders.description || '');
}

function getAllCommands(client) {
    const commands = {};
    const commandDetails = {};

    client.slashCommands.forEach(command => {
        if (command.data && typeof command.data.toJSON === 'function') {
            const commandJSON = command.data.toJSON();
            
            let categoryName;
            // Dynamically determine category from addon folder structure
            if (command.filePath && command.filePath.includes(path.join('addons', path.sep))) {
                const pathParts = command.filePath.split(path.sep);
                const addonsIndex = pathParts.indexOf('addons');
                if (addonsIndex !== -1 && pathParts.length > addonsIndex + 1) {
                    categoryName = pathParts[addonsIndex + 1];
                }
            }

            if (!categoryName) {
                categoryName = command.category || 'Chưa phân loại';
            }

            if (!commands[categoryName]) {
                commands[categoryName] = [];
            }

            commandDetails[commandJSON.name] = {
                name: commandJSON.name,
                description: commandJSON.description || 'Không có mô tả',
                category: categoryName,
                id: command.id || 'undefined',
                usage: command.usage || `/${commandJSON.name}`,
                examples: command.examples || [],
                cooldown: command.cooldown || 0
            };

            // New display format using inline code blocks
            let commandDisplay = `\`/${commandJSON.name}\` - ${commandJSON.description || 'Không có mô tả'}`;

            if (commandJSON.options) {
                const subcommands = commandJSON.options.filter(option => option.type === ApplicationCommandOptionType.Subcommand);
                if (subcommands.length > 0) {
                    commandDisplay = `\`/${commandJSON.name}\` - ${commandJSON.description || 'Không có mô tả'}`;
                    commands[categoryName].push(commandDisplay); // Push parent command first

                    subcommands.forEach((subcommand) => {
                        const subcommandDisplay = `  • \`/${commandJSON.name} ${subcommand.name}\` - ${subcommand.description || 'Không có mô tả'}`;
                        commands[categoryName].push(subcommandDisplay);

                        commandDetails[`${commandJSON.name} ${subcommand.name}`] = {
                            name: `${commandJSON.name} ${subcommand.name}`,
                            description: subcommand.description || 'Không có mô tả',
                            category: categoryName,
                            id: command.id || 'undefined',
                            usage: `/${commandJSON.name} ${subcommand.name}`,
                            parent: commandJSON.name
                        };
                    });
                } else {
                    commands[categoryName].push(commandDisplay);
                }
            } else {
                commands[categoryName].push(commandDisplay);
            }
        }
    });

    return { categories: commands, details: commandDetails };
}

function validateURL(url) {
    return url && url.trim().length > 0 && url !== 'null';
}

function addEmbedFields(embed, fields, placeholders = {}) {
    const cleanPlaceholders = Object.fromEntries(
        Object.entries(placeholders).filter(([_, value]) => value != null && value !== 'null')
    );

    if (fields.Title && fields.Title.trim()) {
        embed.setTitle(replacePlaceholders(fields.Title, cleanPlaceholders));
    }
    if (fields.Description && fields.Description.length > 0) {
        embed.setDescription(fields.Description.map(line => replacePlaceholders(line, cleanPlaceholders)).join('\n'));
    }
    if (fields.Color && fields.Color.trim()) {
        embed.setColor(fields.Color);
    }
    if (fields.Thumbnail) {
        const thumbnailUrl = replacePlaceholders(fields.Thumbnail, cleanPlaceholders);
        if (validateURL(thumbnailUrl)) {
            embed.setThumbnail(thumbnailUrl);
        }
    }
    if (fields.Image) {
        const imageUrl = replacePlaceholders(fields.Image, cleanPlaceholders);
        if (validateURL(imageUrl)) {
            embed.setImage(imageUrl);
        }
    }
    if (fields.Footer && fields.Footer.Text && fields.Footer.Text.trim()) {
        embed.setFooter({
            text: replacePlaceholders(fields.Footer.Text, cleanPlaceholders),
            iconURL: validateURL(fields.Footer.Icon) ? replacePlaceholders(fields.Footer.Icon, cleanPlaceholders) : undefined
        });
    }
    if (fields.Author && fields.Author.Text && fields.Author.Text.trim()) {
        const authorName = replacePlaceholders(fields.Author.Text, cleanPlaceholders);
        if (authorName.trim()) {
            embed.setAuthor({
                name: authorName,
                iconURL: validateURL(fields.Author.Icon) ? replacePlaceholders(fields.Author.Icon, cleanPlaceholders) : undefined
            });
        }
    }
    embed.setTimestamp();
}

function createCommandDetailsEmbed(commandInfo, placeholders, lang) {
    const embed = new EmbedBuilder()
        .setTitle(`Lệnh: /${commandInfo.name}`)
        .setDescription(commandInfo.description)
        .setColor(lang.HelpCommand.CategoryEmbed.Color || '#5865F2')
        .addFields(
            { name: 'Danh mục', value: commandInfo.category, inline: true },
            { name: 'Cách dùng', value: `\`${commandInfo.usage}\``, inline: true }
        )
        .setFooter({
            text: replacePlaceholders(lang.HelpCommand.CommandDetailsEmbed?.Footer?.Text || 'Sử dụng nút quay lại để trở về', placeholders),
            iconURL: validateURL(lang.HelpCommand.CommandDetailsEmbed?.Footer?.Icon) 
                ? replacePlaceholders(lang.HelpCommand.CommandDetailsEmbed?.Footer?.Icon, placeholders) 
                : undefined
        })
        .setTimestamp();

    if (commandInfo.cooldown) {
        embed.addFields({ name: 'Thời gian chờ', value: `${commandInfo.cooldown} giây`, inline: true });
    }

    if (commandInfo.examples && commandInfo.examples.length > 0) {
        embed.addFields({ 
            name: 'Ví dụ', 
            value: commandInfo.examples.map(ex => `\`${ex}\``).join('\n') 
        });
    }

    if (commandInfo.parent) {
        embed.addFields({ name: 'Lệnh cha', value: `/${commandInfo.parent}`, inline: true });
    }

    return embed;
}

function getCommandSuggestions(input, commandDetails) {
    if (!input || input.trim() === '') {
        return Object.entries(commandDetails)
            .filter(([_, info]) => !info.parent)
            .slice(0, 25)
            .map(([cmdName, cmdInfo]) => ({
                name: `/${cmdName} - ${cmdInfo.description.substring(0, 50)}${cmdInfo.description.length > 50 ? '...' : ''}`,
                value: cmdName
            }));
    }
    
    const lowercaseInput = input.toLowerCase();
    const exactMatches = [];
    const startsWithMatches = [];
    const containsMatches = [];
    
    for (const [cmdName, cmdInfo] of Object.entries(commandDetails)) {
        const lowerCmdName = cmdName.toLowerCase();
        
        if (lowerCmdName === lowercaseInput) {
            exactMatches.push({
                name: `/${cmdName} - ${cmdInfo.description.substring(0, 50)}${cmdInfo.description.length > 50 ? '...' : ''}`,
                value: cmdName
            });
        } else if (lowerCmdName.startsWith(lowercaseInput)) {
            startsWithMatches.push({
                name: `/${cmdName} - ${cmdInfo.description.substring(0, 50)}${cmdInfo.description.length > 50 ? '...' : ''}`,
                value: cmdName
            });
        } else if (lowerCmdName.includes(lowercaseInput)) {
            containsMatches.push({
                name: `/${cmdName} - ${cmdInfo.description.substring(0, 50)}${cmdInfo.description.length > 50 ? '...' : ''}`,
                value: cmdName
            });
        }
    }
    
    const suggestions = [
        ...exactMatches,
        ...startsWithMatches,
        ...containsMatches
    ].slice(0, 25);
    
    return suggestions;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách tất cả các lệnh')
        .addStringOption(option => 
            option.setName('command')
                .setDescription('Nhận trợ giúp cho một lệnh cụ thể')
                .setRequired(false)
                .setAutocomplete(true)
        ),
    category: 'Chung',
    
    async autocomplete(interaction, client) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            const focusedValue = focusedOption.value;
            
            if (!globalCommandData && client.commandsReady) {
                const { details } = getAllCommands(client);
                globalCommandData = details;
            }
            
            if (!globalCommandData) {
                return await interaction.respond([]);
            }
            
            let choices = [];
            
            if (focusedOption.name === 'command') {
                choices = getCommandSuggestions(focusedValue, globalCommandData);
            }
            
            if (choices.length > 25) {
                choices = choices.slice(0, 25);
            }
            
            await interaction.respond(choices);
        } catch (error) {
            console.error('Lỗi trong trình xử lý tự động hoàn thành:', error);
            try {
                await interaction.respond([]);
            } catch (respondError) {
                console.error('Không thể phản hồi tự động hoàn thành với lựa chọn trống:', respondError);
            }
        }
    },
    
    async execute(interaction, client) {
        try {
            if (!client.commandsReady) {
                return await interaction.reply({
                    content: 'Các lệnh vẫn đang được đăng ký. Vui lòng thử lại sau giây lát.',
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.deferReply();

            const config = getConfig();
            const lang = getLang();
            
            const user = interaction.user.username;
            const userAvatar = interaction.user.displayAvatarURL();
            const guild = interaction.guild.name;
            const guildAvatar = interaction.guild.iconURL();

            const placeholders = {
                botName: config.BotName,
                user,
                guild,
                userAvatar,
                guildAvatar
            };

            const { categories: commandCategories, details: commandDetails } = getAllCommands(client);
            
            globalCommandData = commandDetails;

            const commandName = interaction.options.getString('command');
            if (commandName) {
                const commandInfo = commandDetails[commandName] || Object.values(commandDetails).find(cmd => 
                    cmd.name.toLowerCase() === commandName.toLowerCase()
                );
                
                if (!commandInfo) {
                    return await interaction.editReply({
                        content: `Lệnh \`/${commandName}\` không được tìm thấy. Sử dụng \`/help\` để xem tất cả các lệnh có sẵn.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                
                const commandEmbed = createCommandDetailsEmbed(commandInfo, placeholders, lang);
                return await interaction.editReply({ embeds: [commandEmbed] });
            }

            const categoryOptions = Object.keys(commandCategories).map(category => ({
                label: lang.HelpCommand.Categories[category]?.Name || category,
                value: category,
                emoji: lang.HelpCommand.Categories[category]?.Emoji || '❓',
                description: lang.HelpCommand.Categories[category]?.Description || 'Các lệnh khác nhau'
            }));

            const helpEmbed = new EmbedBuilder();
            addEmbedFields(helpEmbed, lang.HelpCommand.MainEmbed, placeholders);

            if (helpEmbed.data.description) {
                helpEmbed.setDescription(helpEmbed.data.description + '\n\n*Mẹo: Dùng `/help command:tên_lệnh` để xem chi tiết về một lệnh cụ thể.*');
            }

            const baseRow = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('category_select')
                        .setPlaceholder(lang.HelpCommand.CategorySelectPlaceholder)
                        .addOptions(categoryOptions)
                );

            const backButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_button')
                        .setLabel(lang.HelpCommand.BackButtonLabel)
                        .setStyle(ButtonStyle.Primary)
                );

            const response = await interaction.editReply({ 
                embeds: [helpEmbed], 
                components: [baseRow] 
            });

            const filter = i => i.user.id === interaction.user.id;
            
            const TIME_LIMIT = 300000;
            const expireTime = Date.now() + TIME_LIMIT;
            
            while (Date.now() < expireTime) {
                try {
                    const componentInteraction = await response.awaitMessageComponent({ 
                        filter, 
                        time: expireTime - Date.now() 
                    });
                    
                    if (componentInteraction.isStringSelectMenu() && componentInteraction.customId === 'category_select') {
                        const selectedCategory = componentInteraction.values[0];
                        const commands = commandCategories[selectedCategory].join('\n');
                        
                        const categoryEmbed = new EmbedBuilder();
                        addEmbedFields(categoryEmbed, {
                            ...lang.HelpCommand.CategoryEmbed,
                            Title: replacePlaceholders(lang.HelpCommand.CategoryEmbed.Title, {
                                ...placeholders,
                                category: lang.HelpCommand.Categories[selectedCategory]?.Name || selectedCategory
                            }),
                            Description: [commands]
                        }, placeholders);

                        await componentInteraction.update({ 
                            embeds: [categoryEmbed], 
                            components: [backButton] 
                        });
                    }
                    
                    if (componentInteraction.isButton() && componentInteraction.customId === 'back_button') {
                        await componentInteraction.update({ 
                            embeds: [helpEmbed], 
                            components: [baseRow] 
                        });
                    }
                } catch (error) {
                    if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                        break;
                    }
                    
                    if (!error.message.includes('Collector received no interactions')) {
                        try {
                            await interaction.followUp({ 
                                content: 'Đã xảy ra lỗi khi xử lý lựa chọn của bạn. Vui lòng thử lại.', 
                                flags: MessageFlags.Ephemeral 
                            });
                        } catch (replyError) {
                            console.error('Không thể gửi tin nhắn lỗi:', replyError);
                        }
                    }
                    break;
                }
            }
            
            try {
                await interaction.editReply({ components: [] });
            } catch (error) {
                console.error('Không thể xóa các thành phần sau khi hết thời gian:', error);
            }

        } catch (error) {
            console.error(`Đã xảy ra lỗi khi thực thi lệnh help: ${error.message}`);
            try {
                if (interaction.deferred) {
                    await interaction.editReply('Đã có lỗi khi cố gắng thực thi lệnh đó! Vui lòng thử lại sau.');
                } else if (!interaction.replied) {
                    await interaction.reply('Đã có lỗi khi cố gắng thực thi lệnh đó! Vui lòng thử lại sau.');
                }
            } catch (replyError) {
                console.error('Không thể gửi tin nhắn lỗi:', replyError);
            }
        }
    }
};