const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, StringSelectMenuBuilder } = require("discord.js");

//const fs = require('fs');
//const yaml = require("js-yaml");
const { getConfig, getLang } = require('../utils/configLoader');

const config = getConfig();
const lang = getLang();

const moment = require('moment-timezone');
const { handleXP } = require('./Levels/handleXP');
const handleMessageCount = require('./Levels/handleMessageCount');
const UserData = require('../models/UserData');
const utils = require('../utils');
const GuildData = require('../models/guildDataSchema');
const GuildSettings = require('../models/GuildSettings');
const AutoReact = require('../models/autoReact');
const AutoResponse = require('../models/autoResponse');
const suggestionActions = require('./Suggestions/suggestionActions');
const SuggestionBlacklist = require('../models/SuggestionBlacklist');
const KentaScratch = require('../utils/kentaScratch');

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function findBestMatch(term, targets) {
    let bestMatch = null;
    let minDist = Infinity;
    for (const target of targets) {
        const dist = levenshteinDistance(term, target);
        if (dist < minDist) {
            minDist = dist;
            bestMatch = target;
        }
    }
    return { bestMatch, rating: 1 - (minDist / Math.max(term.length, bestMatch.length)) };
}

let spamData = new Map();

const convertPatternToRegex = (pattern) => {
    if (pattern.startsWith('regex:')) {
        return new RegExp(pattern.slice(6), 'i');
    }

    let regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');

    if (pattern.includes('*')) {
        return new RegExp(regexPattern, 'i');
    }

    return new RegExp(`^${regexPattern}$`, 'i');
};

const checkBlacklistWords = async (message, dmSent) => {
    if (!config.BlacklistWords.Enabled) return dmSent;

    if (message.member.permissions.has(config.BlacklistWords.BypassPerms)) {
        return dmSent;
    }

    const hasBypassRole = message.member.roles.cache.some(role =>
        config.BlacklistWords.BypassRoles.includes(role.id)
    );
    if (hasBypassRole) {
        return dmSent;
    }

    if (config.BlacklistWords.WhitelistChannels.includes(message.channel.id) ||
        (message.channel.parentId && config.BlacklistWords.WhitelistCategories.includes(message.channel.parentId))) {
        return dmSent;
    }

    const content = message.content;

    const whitelistMatched = config.BlacklistWords.WhitelistWords.some(word => {
        const regex = convertPatternToRegex(word);
        return regex.test(content);
    });

    if (whitelistMatched) {
        return dmSent;
    }

    let triggeredPattern = null;
    for (const pattern of config.BlacklistWords.Patterns) {
        const regex = convertPatternToRegex(pattern);
        if (regex.test(content)) {
            triggeredPattern = pattern;
            break;
        }
    }

    if (triggeredPattern) {
        try {
            await message.delete();

            const filterWordsMsg = config.BlacklistWords.Message
                .replace(/{user}/g, `<@${message.author.id}>`);
            const notificationMsg = await message.channel.send(filterWordsMsg);
            setTimeout(() => notificationMsg.delete().catch(console.error), 3000);

            if (config.BlacklistWords.DM.Enabled && !dmSent) {
                const currentTime = moment().tz(config.Timezone);
                const replacements = {
                    user: message.author.username,
                    blacklistedword: triggeredPattern,
                    shorttime: currentTime.format("HH:mm"),
                    longtime: currentTime.format('MMMM Do YYYY')
                };

                try {
                    if (config.BlacklistWords.DM.Type === "Message") {
                        let dmMessage = config.BlacklistWords.DM.Message;
                        Object.entries(replacements).forEach(([key, value]) => {
                            dmMessage = dmMessage.replace(new RegExp(`{${key}}`, 'g'), value);
                        });
                        await message.author.send(dmMessage);
                    } else if (config.BlacklistWords.DM.Type === "Embed") {
                        const embedConfig = config.BlacklistWords.DM.Embed;
                        const embed = new EmbedBuilder()
                            .setColor(embedConfig.Color)
                            .setTitle(embedConfig.Title)
                            .setDescription(embedConfig.Description.map(line =>
                                Object.entries(replacements).reduce((str, [key, value]) =>
                                    str.replace(new RegExp(`{${key}}`, 'g'), value)
                                    , line)
                            ).join('\n'));

                        if (embedConfig.Footer) {
                            embed.setFooter({
                                text: embedConfig.Footer.replace(/{shorttime}/g, replacements.shorttime)
                            });
                        }

                        if (embedConfig.Thumbnail) {
                            embed.setThumbnail(message.author.displayAvatarURL());
                        }

                        await message.author.send({ embeds: [embed] });
                    }
                    dmSent = true;
                } catch (err) {
                    console.error('Failed to send DM:', err);
                }
            }

            if (config.BlacklistWords.LogsChannelID) {
                const logsChannel = message.guild.channels.cache.get(config.BlacklistWords.LogsChannelID);
                if (logsChannel) {
                    const currentTime = moment().tz(config.Timezone);
                    const embedConfig = config.BlacklistWords.Embed;
                    const embed = new EmbedBuilder()
                        .setColor(embedConfig.Color)
                        .setTitle(embedConfig.Title)
                        .setDescription(embedConfig.Description.map(line =>
                            line.replace(/{user}/g, `<@${message.author.id}>`)
                                .replace(/{blacklistedword}/g, triggeredPattern)
                                .replace(/{shorttime}/g, currentTime.format("HH:mm"))
                                .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'))
                                .replace(/{guildName}/g, message.guild.name)
                        ).join('\n'));

                    if (embedConfig.Footer.Text) {
                        embed.setFooter({
                            text: embedConfig.Footer.Text.replace(/{guildName}/g, message.guild.name),
                            iconURL: message.guild.iconURL()
                        });
                    }

                    if (embedConfig.Thumbnail) {
                        embed.setThumbnail(message.author.displayAvatarURL());
                    }

                    await logsChannel.send({ embeds: [embed] });
                }
            }

            return true;
        } catch (error) {
            console.error('Error handling blacklisted word:', error);
        }
    }

}



const processDonation = require('./Donation/processDonation');

module.exports = async (client, message) => {
    // Donation Logic (runs for bots too)
    if (message.guild && message.author.bot && message.author.id === '408785106942164992') {
        await processDonation(message);
        return; // OwO bot doesn't need other processing
    }

    if (!message.guild || !message.member || message.author.bot) {
        return;
    }
    const lang = await getLang(message.guild.id);

    // Sticky Message Handler
    try {
        const StickyManager = require('../utils/StickyManager');
        await StickyManager.handleMessage(message);
    } catch (e) {
        console.error('Sticky Manager Error:', e);
    }



    let dmSent = false;

    if (!client.buttonHandlersRegistered) {
        client.on('interactionCreate', async (interaction) => {
            if (interaction.isButton() && interaction.customId.startsWith('reply_')) {
                await handleButtonInteraction(interaction);
            }
        });
        client.buttonHandlersRegistered = true;
    }

    let guildSettings = await GuildSettings.findOne({ guildId: message.guild.id });
    const prefix = guildSettings?.prefix || config.CommandsPrefix || 'k';

    if (message.content.startsWith(prefix)) {
        // Regex to match args while respecting quotes
        const args = message.content.slice(prefix.length).trim().match(/("[^"]+"|[^\s"]+)/g)?.map(arg => arg.replace(/^"|"$/g, '')) || [];
        if (args.length === 0) return; // Handle empty command

        const commandName = args.shift().toLowerCase();

        console.log(`[DEBUG] Prefix: '${prefix}', Command: '${commandName}'`);

        const command = client.messageCommands.get(commandName);
        console.log(`[DEBUG] Message Command found: ${!!command}`);

        if (command) {
            try {
                await command.run(client, message, args);
            } catch (error) {
                const { handleError } = require('../utils/errorHandler.js');
                await handleError(error, message);
            }
            return;
        }

        // Check slash commands
        const slashCommand = client.slashCommands.get(commandName);

        if (slashCommand) {
            try {
                // Argument Parsing Logic
                let parsedOptions = {};
                let currentArgs = [...args];

                // Convert to JSON to access options and types reliably
                const commandData = slashCommand.data.toJSON ? slashCommand.data.toJSON() : slashCommand.data;
                const commandDataOptions = commandData.options || [];

                // Check for subcommands first
                const subcommands = commandDataOptions.filter(opt => opt.type === 1); // 1 is SUB_COMMAND
                let subcommandName = null;

                if (subcommands.length > 0) {
                    if (currentArgs.length > 0) {
                        const possibleSubcommand = currentArgs[0];
                        if (subcommands.some(sc => sc.name === possibleSubcommand)) {
                            subcommandName = possibleSubcommand;
                            currentArgs.shift(); // Consume subcommand name
                        } else {
                            // Fuzzy search for subcommand logic
                            const scNames = subcommands.map(sc => sc.name);
                            const { bestMatch, rating } = findBestMatch(possibleSubcommand, scNames);

                            if (rating > 0.4) {
                                const embed = new EmbedBuilder()
                                    .setColor('#FFCC00')
                                    .setTitle('❓ Did you mean?')
                                    .setDescription(`Có phải ý bạn là: \`${prefix}${commandName} ${bestMatch}\`?`)
                                    .setFooter({ text: 'Tự động gợi ý lệnh' });
                                return message.reply({ embeds: [embed] });
                            }
                        }
                    }

                    // If no subcommand found (and no typo caught above), show Text List of Subcommands
                    if (!subcommandName) {
                        const subcommandNames = subcommands.map(sc => sc.name).join(', ');
                        let helpMsg = `📂 **${lang.Command || 'Lệnh'}:** \`${prefix}${commandName}\`\n\n${lang.SelectOption || 'Vui lòng chọn một tùy chọn bên dưới để tiếp tục:'}\n\n`;

                        subcommands.forEach(sc => {
                            // Try to get localized description
                            let desc = sc.description;
                            if (lang.Commands && lang.Commands[commandName] && lang.Commands[commandName].Subcommands && lang.Commands[commandName].Subcommands[sc.name]) {
                                desc = lang.Commands[commandName].Subcommands[sc.name];
                            }
                            helpMsg += `🔹 \`${prefix}${commandName} ${sc.name}\`: ${desc || 'Không có mô tả'}\n`;
                        });

                        // Custom examples
                        if (commandName === 'gamble') {
                            helpMsg += `\n💡 **${lang.Example || 'Ví dụ'}:** \`${prefix}gamble coinflip 5000 tails\``;

                        } else if (commandName === 'farm') {
                            helpMsg += `\n💡 **Ví dụ:** \`${prefix}farm plant rice\``;
                        }

                        return message.reply(helpMsg);
                    }
                }

                // If we have a subcommand, we should look at its options
                let relevantOptions = commandDataOptions;
                if (subcommandName) {
                    const sc = subcommands.find(s => s.name === subcommandName);
                    relevantOptions = sc.options || [];
                }

                // Map positional args to options based on order for now
                for (let i = 0; i < relevantOptions.length; i++) {
                    const opt = relevantOptions[i];
                    if (currentArgs.length > i) {
                        let value = currentArgs[i];

                        // Type conversion based on opt.type
                        if (opt.type === 3) { // STRING
                            parsedOptions[opt.name] = value;
                        } else if (opt.type === 4) { // INTEGER
                            parsedOptions[opt.name] = parseInt(value);
                        } else if (opt.type === 10) { // NUMBER
                            parsedOptions[opt.name] = parseFloat(value);
                        } else if (opt.type === 5) { // BOOLEAN
                            parsedOptions[opt.name] = value === 'true' || value === '1' || value === 'yes';
                        } else if (opt.type === 6) { // USER
                            const userId = value.replace(/[<@!>]/g, '');
                            const user = await client.users.fetch(userId).catch(() => null);
                            const member = await message.guild.members.fetch(userId).catch(() => null);
                            parsedOptions[opt.name] = { user, member };
                        } else if (opt.type === 7) { // CHANNEL
                            const channelId = value.replace(/[<#>]/g, '');
                            const channel = message.guild.channels.cache.get(channelId);
                            parsedOptions[opt.name] = channel;
                        } else if (opt.type === 8) { // ROLE
                            const roleId = value.replace(/[<@&>]/g, '');
                            const role = message.guild.roles.cache.get(roleId);
                            parsedOptions[opt.name] = role;
                        } else if (opt.type === 9) { // MENTIONABLE
                            const id = value.replace(/[<@!&>]/g, '');
                            const user = await client.users.fetch(id).catch(() => null);
                            const member = await message.guild.members.fetch(id).catch(() => null);
                            const role = message.guild.roles.cache.get(id);
                            parsedOptions[opt.name] = { user, member, role };
                        }
                    }
                }

                // Validation: Check for missing required options
                const missingOptions = relevantOptions.filter(opt => opt.required && !parsedOptions[opt.name]);

                if (missingOptions.length > 0) {
                    const missingNames = missingOptions.map(o => o.name).join(', ');
                    let usageMsg = `❌ Thiếu tham số bắt buộc: **${missingNames}**`;

                    // Helper: Show valid choices
                    missingOptions.forEach(opt => {
                        if (opt.choices && opt.choices.length > 0) {
                            const choices = opt.choices.map(c => `\`${c.value}\``).join(', ');
                            usageMsg += `\n\n🔹 **Lựa chọn cho \`${opt.name}\`:** ${choices}`;
                        }
                    });

                    // Custom guides for specific commands
                    if (commandName === 'farm') {
                        if (subcommandName === 'plant') {
                            usageMsg += `\n\n💡 **Cách dùng đúng:**\n\`${prefix}farm plant <hạt_giống>\`\nVí dụ: \`${prefix}farm plant rice\``;
                        } else if (subcommandName === 'harvest') {
                            usageMsg += `\n\n💡 **Cách dùng đúng:**\n\`${prefix}farm harvest <all/loại_cây>\`\nVí dụ: \`${prefix}farm harvest all\``;
                        } else if (subcommandName === 'phanbon') {
                            usageMsg += `\n\n💡 **Cách dùng đúng:**\n\`${prefix}farm phanbon <loại_phân_bón>\`\nVí dụ: \`${prefix}farm phanbon fertilizer\``;
                        }
                    } else if (commandName === 'fish') {
                        usageMsg += `\n\n💡 **Cách dùng đúng:**\n\`${prefix}fish <địa_điểm>\`\nVí dụ: \`${prefix}fish lake\``;
                    } else if (commandName === 'store') {
                        usageMsg += `\n\n💡 **Ví dụ:** \`${prefix}store "Cần Câu"\``;
                    }

                    return message.reply(usageMsg);
                }

                let sentReply = null;

                const fakeInteraction = {
                    user: message.author,
                    member: message.member,
                    guild: message.guild,
                    channel: message.channel,
                    client: client,
                    createdTimestamp: message.createdTimestamp,
                    id: message.id,
                    isChatInputCommand: () => true,
                    isButton: () => false,
                    isSelectMenu: () => false,
                    isModalSubmit: () => false,
                    reply: async (content) => {
                        sentReply = await message.reply(content);
                        return sentReply;
                    },
                    editReply: async (content) => {
                        if (sentReply) {
                            return sentReply.edit(content);
                        }
                        sentReply = await message.channel.send(content);
                        return sentReply;
                    },
                    fetchReply: async () => sentReply,
                    deferReply: async (options) => {
                        if (options && options.fetchReply) {
                            sentReply = await message.reply({ content: '🔄 Đang xử lí...', fetchReply: true });
                            return sentReply;
                        }
                        await message.channel.sendTyping();
                    },
                    followUp: async (content) => {
                        const msg = await message.channel.send(content);
                        // followUp usually returns the new message, doesn't affect main reply
                        return msg;
                    },
                    options: {
                        _parsed: parsedOptions,
                        getSubcommand: function () {
                            return subcommandName;
                        },
                        getSubcommandGroup: function () {
                            return null;
                        },
                        getString: function (name) {
                            return this._parsed[name] || null;
                        },
                        getInteger: function (name) {
                            const val = this._parsed[name];
                            return val !== undefined ? parseInt(val) : null;
                        },
                        getNumber: function (name) {
                            const val = this._parsed[name];
                            return val !== undefined ? parseFloat(val) : null;
                        },
                        getBoolean: function (name) {
                            return this._parsed[name] || false;
                        },
                        getUser: function (name) {
                            const val = this._parsed[name];
                            return val ? val.user : null;
                        },
                        getMember: function (name) {
                            const val = this._parsed[name];
                            return val ? val.member : null;
                        },
                        getChannel: function (name) {
                            return this._parsed[name] || null;
                        },
                        getRole: function (name) {
                            return this._parsed[name] || null;
                        },
                        getMentionable: function (name) {
                            const val = this._parsed[name];
                            if (!val) return null;
                            return val.role || val.member || val.user;
                        },
                        getAttachment: function (name) {
                            return null;
                        }
                    }
                };

                await slashCommand.execute(fakeInteraction, lang);
            } catch (error) {
                const { handleError } = require('../utils/errorHandler.js');
                await handleError(error, message);
            }
            return;
        }
        // Fuzzy Search for Command
        const allCommands = [...client.messageCommands.keys(), ...client.slashCommands.keys()];
        const { bestMatch, rating } = findBestMatch(commandName, allCommands);

        if (rating > 0.5) {
            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('❌ Không tìm thấy lệnh')
                .setDescription(`Lệnh \`${commandName}\` không tồn tại.\nCó phải ý bạn là: **${prefix}${bestMatch}**?`)
                .setFooter({ text: 'Hệ thống gợi ý lệnh thông minh' });
            return message.reply({ embeds: [embed] });
        }

        // If not found in messageCommands, it might be a custom command from config.
        try {
            await processCustomCommands(client, message);
        } catch (error) {
            console.error('Error in custom command processing:', error);
        }
    }

    dmSent = await checkBlacklistWords(message, dmSent);

    if (message.deletable) {
        await handleMessageCount(message);
        await handleXP(message);
        await checkAutoReact(message);

        dmSent = await checkAntiMassMention(message);
        await checkAntiSpam(message);

        try {
            await GuildData.findOneAndUpdate(
                { guildID: message.guild.id },
                { $inc: { totalMessages: 1 } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        } catch (error) {
            console.error('Error updating GuildData:', error);
        }

        processAutoResponses(message);
        handleVerificationSettings(message);

        const suggestionInputChannel = config.SuggestionSettings.ChannelSuggestionID || config.SuggestionSettings.ChannelID;
        if (message.channel.id === suggestionInputChannel) {
            if (!config.SuggestionSettings.AllowChannelSuggestions) {
                return;
            }

            const messageContent = message.content;

            const hasAllowedRole = config.SuggestionSettings.AllowedRoles.length === 0 ||
                config.SuggestionSettings.AllowedRoles.some(roleId => message.member.roles.cache.has(roleId));

            if (!hasAllowedRole) {
                const errorMsg = await message.channel.send({
                    content: lang.NoPermsMessage
                });

                if (config.SuggestionSettings.DeleteFailureMessages) {
                    setTimeout(() => errorMsg.delete().catch(console.error),
                        config.SuggestionSettings.FailureMessageTimeout);
                }

                if (config.SuggestionSettings.DeleteOriginalMessage) {
                    await message.delete().catch(console.error);
                }
                return;
            }

            const isBlacklisted = await SuggestionBlacklist.findOne({ userId: message.author.id });

            if (isBlacklisted) {
                const errorMsg = await message.channel.send({
                    content: lang.Suggestion.BlacklistMessage
                });

                if (config.SuggestionSettings.DeleteFailureMessages) {
                    setTimeout(() => errorMsg.delete().catch(console.error),
                        config.SuggestionSettings.FailureMessageTimeout);
                }

                if (config.SuggestionSettings.DeleteOriginalMessage) {
                    await message.delete().catch(console.error);
                }
                return;
            }

            if (config.SuggestionSettings.blockBlacklistWords) {
                const messageObj = { content: messageContent, member: message.member, channel: message.channel, author: message.author, deletable: true };
                const hasBlacklistedWords = await checkBlacklistWords(messageObj, false);
                if (hasBlacklistedWords) {
                    const errorMsg = await message.channel.send({
                        content: lang.BlacklistWords.Message.replace(/{user}/g, message.author.toString())
                    });

                    if (config.SuggestionSettings.DeleteFailureMessages) {
                        setTimeout(() => errorMsg.delete().catch(console.error),
                            config.SuggestionSettings.FailureMessageTimeout);
                    }

                    if (config.SuggestionSettings.DeleteOriginalMessage) {
                        await message.delete().catch(console.error);
                    }
                    return;
                }
            }

            try {
                await suggestionActions.createSuggestion(client, message, messageContent);

                if (config.SuggestionSettings.DeleteOriginalMessage) {
                    try {
                        await message.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Error deleting message:', error);
                            }
                        });
                    } catch (error) {
                        if (error.code !== 10008) {
                            console.error('Error deleting message:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('Error creating suggestion:', error);
                const errorMsg = await message.channel.send({
                    content: `${message.author}, ${lang.Suggestion.Error}`
                });

                setTimeout(() => errorMsg.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Error deleting error message:', error);
                    }
                }), 5000);
            }
        }
    }
};

async function handleButtonInteraction(interaction) {
    if (!interaction.isButton()) return;


    const [action, ...contextParts] = interaction.customId.split('_');

    if (action === 'reply') {
        try {
            const buttonIndex = parseInt(contextParts.pop());
            const commandPath = contextParts;

            if (!commandPath.length) {
                console.error('Invalid command path');
                await interaction.reply({ content: 'Invalid command configuration', flags: MessageFlags.Ephemeral });
                return;
            }

            let currentConfig = config.CustomCommands[commandPath[0]];

            if (!currentConfig) {
                console.error('Command not found:', commandPath[0]);
                await interaction.reply({ content: 'Command configuration not found', flags: MessageFlags.Ephemeral });
                return;
            }

            for (let i = 1; i < commandPath.length; i += 2) {
                if (commandPath[i] === 'reply') {
                    const prevButtonIndex = parseInt(commandPath[i + 1]);
                    if (!currentConfig.Buttons?.[prevButtonIndex]?.Reply) {
                        console.error('Invalid button configuration at depth:', i);
                        await interaction.reply({ content: 'Invalid button configuration', flags: MessageFlags.Ephemeral });
                        return;
                    }
                    currentConfig = currentConfig.Buttons[prevButtonIndex].Reply;
                }
            }

            const buttonConfig = currentConfig.Buttons?.[buttonIndex];

            if (!buttonConfig || buttonConfig.Type !== "REPLY" || !buttonConfig.Reply) {
                console.error('Invalid button configuration:', { buttonIndex, config: buttonConfig });
                await interaction.reply({ content: 'Button configuration not found', flags: MessageFlags.Ephemeral });
                return;
            }

            const replyConfig = buttonConfig.Reply;

            let responseOptions = {
                ephemeral: replyConfig.Ephemeral ?? false
            };

            if (replyConfig.Embed) {
                const embed = new EmbedBuilder();

                if (replyConfig.Embed.Color) {
                    embed.setColor(replyConfig.Embed.Color);
                }

                if (replyConfig.Embed.Title) {
                    embed.setTitle(replyConfig.Embed.Title);
                }

                if (replyConfig.Embed.Description) {
                    const description = Array.isArray(replyConfig.Embed.Description)
                        ? replyConfig.Embed.Description.join('\n')
                        : replyConfig.Embed.Description;
                    embed.setDescription(description);
                }

                if (replyConfig.Embed.Footer?.Text) {
                    embed.setFooter({
                        text: replyConfig.Embed.Footer.Text,
                        iconURL: replyConfig.Embed.Footer.Icon
                    });
                }

                if (replyConfig.Embed.Author?.Text) {
                    embed.setAuthor({
                        name: replyConfig.Embed.Author.Text,
                        iconURL: replyConfig.Embed.Author.Icon,
                        url: replyConfig.Embed.Author.URL
                    });
                }

                if (replyConfig.Embed.Image) {
                    embed.setImage(replyConfig.Embed.Image);
                }

                if (replyConfig.Embed.Thumbnail) {
                    embed.setThumbnail(replyConfig.Embed.Thumbnail);
                }

                if (replyConfig.Embed.Timestamp) {
                    embed.setTimestamp();
                }

                if (replyConfig.Embed.Fields?.length > 0) {
                    replyConfig.Embed.Fields.forEach(field => {
                        if (field.Name && field.Value) {
                            embed.addFields({
                                name: field.Name,
                                value: field.Value,
                                inline: field.Inline ?? false
                            });
                        }
                    });
                }

                responseOptions.embeds = [embed];
            }

            if (replyConfig.Text) {
                responseOptions.content = replyConfig.Text;
            }

            if (replyConfig.Buttons?.length > 0) {
                const fullPath = [...commandPath, 'reply', buttonIndex].join('_');
                const buttons = createButtons(replyConfig.Buttons, fullPath);
                if (buttons) {
                    responseOptions.components = [buttons];
                }
            }

            if (!responseOptions.content && (!responseOptions.embeds || responseOptions.embeds.length === 0)) {
                responseOptions.content = "No content available for this option.";
            }

            if (interaction.replied) {
                await interaction.followUp(responseOptions);
            } else {
                await interaction.reply(responseOptions);
            }

        } catch (error) {
            console.error('Error handling button interaction:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'An error occurred while processing your request.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
}

function createButtons(buttonsConfig, commandContext) {
    const buttons = [];

    buttonsConfig.forEach((buttonConfig, index) => {
        const button = new ButtonBuilder()
            .setLabel(buttonConfig.Name);

        if (buttonConfig.Emoji) {
            button.setEmoji(buttonConfig.Emoji);
        }

        if (buttonConfig.Type === "REPLY") {
            button.setCustomId(`reply_${commandContext}_${index}`);
            button.setStyle(ButtonStyle[buttonConfig.Style] || ButtonStyle.Primary);
        } else if (buttonConfig.Type === "LINK") {
            button.setStyle(ButtonStyle.Link)
                .setURL(buttonConfig.Link);
        } else {
            console.error(`Unknown button type: ${buttonConfig.Type}`);
        }

        buttons.push(button);
    });

    return buttons.length > 0 ? new ActionRowBuilder().addComponents(buttons) : null;
}

async function checkAutoReact(message) {
    const autoReactData = await AutoReact.findOne({ guildId: message.guild.id });
    if (!autoReactData || autoReactData.reactions.length === 0) return;

    autoReactData.reactions.forEach(reaction => {
        if (message.content.toLowerCase().includes(reaction.keyword.toLowerCase())) {
            if (isEligibleForReaction(message, reaction)) {
                message.react(reaction.emoji).catch(error => {
                    if (error.code === 10008) {
                    } else {
                        console.error("Error reacting to message:", error);
                    }
                });
            }
        }
    });
}


function isEligibleForReaction(message, reaction) {
    const memberRoles = message.member.roles.cache;
    const channelId = message.channel.id;
    const validRoleIds = reaction.whitelistRoles.filter(roleId => !isNaN(roleId));
    const isRoleEligible = validRoleIds.length === 0 || memberRoles.some(role => validRoleIds.includes(role.id));
    const validChannelIds = reaction.whitelistChannels.filter(channelId => !isNaN(channelId));
    const isChannelEligible = validChannelIds.length === 0 || validChannelIds.includes(channelId);
    return isRoleEligible && isChannelEligible;
}

async function checkAntiMassMention(message) {
    if (!config.AntiMassMention.Enabled) return;

    const mentionBypass = hasPermissionOrRole(message.member, config.AntiMassMention.BypassPerms, config.AntiMassMention.BypassRoles);
    if (mentionBypass) return;

    if (message.mentions.users.size > config.AntiMassMention.Amount) {
        try {
            await message.delete();
        } catch (error) {
            if (error.code === '5152') {
                console.error('Failed to delete message:', error);
            } else {
                console.error(`Error deleting message: ${error}`);
            }
        }

        const warningMsg = await message.channel.send(
            config.AntiMassMention.Message.replace(/{user}/g, `<@${message.author.id}>`)
        );
        setTimeout(() => warningMsg.delete().catch(console.error), 3000);

        if (config.AntiMassMention.TimeoutUser === true) {
            const timeInMs = parseDuration(config.AntiMassMention.TimeoutTime);
            try {
                await message.member.timeout(timeInMs, "Mass Mention (Auto Moderation)");
                await UserData.updateOne(
                    { userId: message.author.id, guildId: message.guild.id },
                    { $inc: { timeouts: 1 } }
                );

                const logEmbed = createLogEmbed(
                    'Auto Moderation',
                    'Red',
                    'Mass Mention Detected',
                    `**User:** <@${message.author.id}> \n**Action:** Timeout`,
                    [
                        { name: 'Reason', value: 'Mass Mention', inline: true },
                        { name: 'Duration', value: humanReadableDuration(timeInMs), inline: true },
                        { name: 'Mentions', value: `${message.mentions.users.size} users`, inline: true }
                    ],
                    `User ID: ${message.author.id}`
                );

                sendLogMessage(message.guild, config.AntiMassMention.LogsChannelID, logEmbed);

                if (config.AntiMassMention.SendDM) {
                    const dmData = {
                        user: message.author.username,
                        time: config.AntiMassMention.TimeoutTime
                    };
                    await sendDirectMessage(message.author, config.AntiMassMention.DirectMessage, dmData);
                }
            } catch (error) {
                console.error('Error applying timeout:', error);
            }
        }
    }
}

function parseDuration(duration) {
    if (!duration) return 0;

    const regex = /(\d+)([smhd])/;
    const match = duration.match(regex);

    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 0;
    }
}

function hasPermissionOrRole(member, permissions = [], roles = []) {
    if (!member) return false;

    if (permissions.length > 0) {
        if (member.permissions.has(permissions)) return true;
    }

    if (roles.length > 0) {
        return member.roles.cache.some(role => roles.includes(role.id));
    }

    return false;
}

function createLogEmbed(title, color, header, description, fields = [], footer = '') {
    const embed = new EmbedBuilder()
        .setTitle(header)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    if (fields.length > 0) {
        fields.forEach(field => {
            embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
        });
    }

    if (footer) {
        embed.setFooter({ text: footer });
    }

    return embed;
}

function sendLogMessage(guild, channelId, embed) {
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId);
    if (channel) {
        channel.send({ embeds: [embed] }).catch(console.error);
    }
}

function humanReadableDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

async function sendDirectMessage(user, message, data) {
    try {
        let formattedMessage = message;
        for (const [key, value] of Object.entries(data)) {
            formattedMessage = formattedMessage.replace(`{${key}}`, value);
        }
        await user.send(formattedMessage);
    } catch (error) {
        console.error('Failed to send DM:', error);
    }
}

async function checkAntiSpam(message) {
    if (!config.AntiSpam.Enabled) return;

    const spamBypass = hasPermissionOrRole(message.member, config.AntiSpam.BypassPerms, config.AntiSpam.BypassRoles);
    if (spamBypass) return;

    const now = Date.now();
    const timeLimit = parseDuration(config.AntiSpam.TimeLimit);

    if (!spamData.has(message.author.id)) {
        spamData.set(message.author.id, {
            msgCount: 1,
            firstMessage: now,
            messages: [message]
        });
    } else {
        const userData = spamData.get(message.author.id);
        const timeDiff = now - userData.firstMessage;

        if (timeDiff < timeLimit) {
            userData.msgCount++;
            userData.messages.push(message);
            spamData.set(message.author.id, userData);

            if (userData.msgCount >= config.AntiSpam.MsgLimit) {
                const timeInMs = parseDuration(config.AntiSpam.TimeoutTime);
                try {
                    const warningMsg = await message.channel.send(
                        config.AntiSpam.Message.replace(/{user}/g, `<@${message.author.id}>`)
                    );
                    setTimeout(() => warningMsg.delete().catch(console.error), 3000);

                    await message.member.timeout(timeInMs, "Spamming (Auto Moderation)");

                    await UserData.updateOne(
                        { userId: message.author.id, guildId: message.guild.id },
                        { $inc: { timeouts: 1 } }
                    );

                    const logEmbed = createLogEmbed(
                        'Auto Moderation',
                        'Red',
                        'Spam Detected',
                        `**User:** <@${message.author.id}> \n**Action:** Timeout`,
                        [
                            { name: 'Reason', value: 'Spamming', inline: true },
                            { name: 'Duration', value: humanReadableDuration(timeInMs), inline: true },
                            { name: 'Messages', value: `${userData.msgCount} messages`, inline: true }
                        ],
                        `User ID: ${message.author.id}`
                    );

                    sendLogMessage(message.guild, config.AntiSpam.LogsChannelID, logEmbed);

                    if (config.AntiSpam.SendDM) {
                        const dmData = {
                            user: message.author.username,
                            time: config.AntiSpam.TimeoutTime
                        };
                        await sendDirectMessage(message.author, config.AntiSpam.DirectMessage, dmData);
                    }

                    // Delete spam messages
                    userData.messages.forEach(msg => msg.delete().catch(console.error));
                    spamData.delete(message.author.id);

                } catch (error) {
                    console.error('Error applying timeout:', error);
                }
            }
        } else {
            spamData.set(message.author.id, {
                msgCount: 1,
                firstMessage: now,
                messages: [message]
            });
        }
    }
}

async function processCustomCommands(client, message) {
    try {
        const content = message.content.trim();
        const commandName = content.split(' ')[0].toLowerCase();
        if (!config.CustomCommands) return;
        const command = config.CustomCommands[commandName];

        if (!command) {
            return;
        }

        const memberRoles = message.member.roles.cache.map(r => r.id);

        const isWhitelisted = command.Roles.Whitelist.length === 0 ||
            command.Roles.Whitelist.some(roleId => memberRoles.includes(roleId));

        if (!isWhitelisted) {
            return;
        }

        let responseOptions = {};
        if (command.type === "EMBED") {
            const embed = new EmbedBuilder()
                .setColor(command.Embed.Color || null);

            if (command.Embed.Title) {
                embed.setTitle(replaceCustomCommandPlaceholders(command.Embed.Title, message, { commandName }));
            }

            if (command.Embed.Description && command.Embed.Description.length > 0) {
                const description = command.Embed.Description.map(line =>
                    replaceCustomCommandPlaceholders(line, message, { commandName })
                ).join("\n");
                embed.setDescription(description);
            }

            if (command.Embed.Footer && command.Embed.Footer.Text) {
                const footerText = replaceCustomCommandPlaceholders(command.Embed.Footer.Text, message, { commandName });
                const footerIcon = command.Embed.Footer.Icon ?
                    replaceCustomCommandPlaceholders(command.Embed.Footer.Icon, message, { commandName }) :
                    undefined;
                embed.setFooter({ text: footerText, iconURL: footerIcon });
            }

            if (command.Embed.Author && command.Embed.Author.Text) {
                const authorName = replaceCustomCommandPlaceholders(command.Embed.Author.Text, message, { commandName });
                const authorIcon = command.Embed.Author.Icon ?
                    replaceCustomCommandPlaceholders(command.Embed.Author.Icon, message, { commandName }) :
                    undefined;
                embed.setAuthor({ name: authorName, iconURL: authorIcon });
            }

            if (command.Embed.Thumbnail) {
                embed.setThumbnail(replaceCustomCommandPlaceholders(command.Embed.Thumbnail, message, { commandName }));
            }

            if (command.Embed.Image) {
                embed.setImage(replaceCustomCommandPlaceholders(command.Embed.Image, message, { commandName }));
            }

            if (command.Embed.Fields) {
                command.Embed.Fields.forEach(field => {
                    if (field.Name && field.Value) {
                        const fieldName = replaceCustomCommandPlaceholders(field.Name, message, { commandName });
                        const fieldValue = replaceCustomCommandPlaceholders(field.Value, message, { commandName });
                        embed.addFields({ name: fieldName, value: fieldValue, inline: field.Inline ?? false });
                    }
                });
            }

            responseOptions.embeds = [embed];

            if (command.Buttons && Array.isArray(command.Buttons)) {
                const buttons = createButtons(command.Buttons, commandName);
                if (buttons) {
                    responseOptions.components = [buttons];
                }
            }
        } else if (command.type === "TEXT") {
            responseOptions.content = replaceCustomCommandPlaceholders(command.text, message, { commandName });
        }

        if (!responseOptions.content && (!responseOptions.embeds || responseOptions.embeds.length === 0)) {
            return;
        }

        try {
            if (command.Options.ReplyToUser) {
                await message.reply(responseOptions);
            } else {
                await message.channel.send(responseOptions);
            }

            if (command.Options.DeleteTriggerMessage) {
                try {
                    await message.delete();
                } catch (error) {
                    const { handleError } = require('../utils/errorHandler.js');
                    await handleError(error, message);
                }
            }
        } catch (error) {
            const { handleError } = require('../utils/errorHandler.js');
            await handleError(error, message);
        }
    } catch (error) {
        const { handleError } = require('../utils/errorHandler.js');
        await handleError(error, message);
    }
}

async function processAutoResponses(message) {
    try {
        const guildId = message.guild.id;

        const autoResponses = await AutoResponse.find({ guildId }).lean();

        if (!autoResponses || autoResponses.length === 0) {
            return;
        }

        const messageContent = message.content.toLowerCase().trim();
        const messageWords = messageContent.split(/\s+/);

        for (const response of autoResponses) {
            const trigger = response.trigger.toLowerCase().trim();

            const isExactMatch = messageContent === trigger ||
                messageWords.some(word => word === trigger);

            if (isExactMatch) {

                if (response.whitelistRoles?.length > 0 && !response.whitelistRoles.some(roleId => message.member.roles.cache.has(roleId))) {
                    continue;
                }
                if (response.blacklistRoles?.some(roleId => message.member.roles.cache.has(roleId))) {
                    continue;
                }
                if (response.whitelistChannels?.length > 0 && !response.whitelistChannels.includes(message.channel.id)) {
                    continue;
                }
                if (response.blacklistChannels?.includes(message.channel.id)) {
                    continue;
                }

                if (response.type === 'text' && response.content) {
                    try {
                        const parsed = await KentaScratch.parse(response.content, { user: message.author, guild: message.guild, channel: message.channel, member: message.member });
                        if (parsed.content || parsed.components.length > 0 || parsed.embeds.length > 0) {
                            await message.reply({ content: parsed.content || null, components: parsed.components, embeds: parsed.embeds });
                        }
                    } catch (error) {
                        console.error('Failed to send text response (KentaScratch):', error);
                    }
                }
                else if (response.type === 'embed' && response.embed) {
                    const embed = new EmbedBuilder()
                        .setColor(response.embed.color || '#5865F2');

                    if (response.embed.title) {
                        embed.setTitle(response.embed.title);
                    }

                    if (response.embed.description) {
                        embed.setDescription(response.embed.description);
                    }

                    if (response.embed.author?.name) {
                        embed.setAuthor({
                            name: response.embed.author.name,
                            iconURL: response.embed.author.icon_url || null
                        });
                    }

                    if (response.embed.footer?.text) {
                        embed.setFooter({
                            text: response.embed.footer.text,
                            iconURL: response.embed.footer.icon_url || null
                        });
                    }

                    if (response.embed.thumbnail) {
                        embed.setThumbnail(response.embed.thumbnail);
                    }

                    if (response.embed.image) {
                        embed.setImage(response.embed.image);
                    }

                    if (response.embed.fields && response.embed.fields.length > 0) {
                        const limitedFields = response.embed.fields.slice(0, 25);
                        limitedFields.forEach(field => {
                            if (field.name && field.value) {
                                embed.addFields({
                                    name: field.name,
                                    value: field.value,
                                    inline: field.inline || false
                                });
                            }
                        });
                    }

                    await message.reply({ embeds: [embed] }).catch(error => {
                    });
                }
                else if (response.responseType === 'TEXT' && response.responseText) {
                    try {
                        const parsed = await KentaScratch.parse(response.responseText, { user: message.author, guild: message.guild, channel: message.channel, member: message.member });
                        if (parsed.content || parsed.components.length > 0 || parsed.embeds.length > 0) {
                            await message.reply({ content: parsed.content || null, components: parsed.components, embeds: parsed.embeds });
                        }
                    } catch (error) {
                        console.error('Failed to send text response (KentaScratch):', error);
                    }
                }
                else if (response.responseType === 'EMBED' && response.embedData) {
                    const embed = new EmbedBuilder()
                        .setColor(response.embedData.color || '#5865F2');

                    if (response.embedData.title) {
                        embed.setTitle(response.embedData.title);
                    }

                    if (response.embedData.description) {
                        embed.setDescription(response.embedData.description);
                    }

                    if (response.embedData.author?.name) {
                        embed.setAuthor({
                            name: response.embedData.author.name,
                            iconURL: response.embedData.author.icon_url || null
                        });
                    }

                    if (response.embedData.footer?.text) {
                        embed.setFooter({
                            text: response.embedData.footer.text,
                            iconURL: response.embedData.footer.icon_url || null
                        });
                    }

                    if (response.embedData.thumbnail?.url) {
                        embed.setThumbnail(response.embedData.thumbnail.url);
                    }

                    if (response.embedData.image?.url) {
                        embed.setImage(response.embedData.image.url);
                    }

                    if (response.embedData.fields && response.embedData.fields.length > 0) {
                        const limitedFields = response.embedData.fields.slice(0, 25);
                        limitedFields.forEach(field => {
                            if (field.name && field.value) {
                                embed.addFields({
                                    name: field.name,
                                    value: field.value,
                                    inline: field.inline || false
                                });
                            }
                        });
                    }

                    await message.reply({ embeds: [embed] }).catch(error => {
                        console.error('Failed to send embed response:', error);
                    });
                }
                else {
                }
                break;
            }
        }
    } catch (error) {
        console.error('Error processing auto responses:', error);
    }
}

// function replacePlaceholders(text, message, additionalPlaceholders = {}) {
//     if (!text || typeof text !== 'string') return '';
// 
//     const currentTime = moment().tz(config.Timezone);
// 
//     const placeholders = {
//         user: message.author ? `<@${message.author.id}>` : 'Unknown User',
//         userName: message.author ? message.author.username : 'Unknown Username',
//         userTag: message.author ? message.author.tag : 'Unknown UserTag',
//         userId: message.author ? message.author.id : 'Unknown UserID',
//         guildName: message.guild ? message.guild.name : 'Unknown Guild',
//         channelName: message.channel ? message.channel.name : 'Unknown Channel',
//         channelId: message.channel ? message.channel.id : 'Unknown ChannelID',
//         blacklistedword: additionalPlaceholders.blacklistedword || 'None',
//         antiinvitelink: additionalPlaceholders.antiInviteLink || 'No Link Detected',
//         shorttime: currentTime.format("HH:mm"),
//         longtime: currentTime.format('MMMM Do YYYY'),
//         ...additionalPlaceholders
//     };
// 
//     return Object.keys(placeholders).reduce((acc, key) => {
//         const regex = new RegExp(`{${key}}`, 'gi');
//         return acc.replace(regex, placeholders[key] || '');
//     }, text);
// }

function handleVerificationSettings(message) {
    try {
        if (config.VerificationSettings.Enabled && message && message.channel) {
            if (config.VerificationSettings.DeleteAllMessages &&
                message.channel.id === config.VerificationSettings.ChannelID) {
                message.delete().catch((error) => {
                    if (error.code !== 10008) {
                        console.error("Error deleting message:", error);
                    }
                });
            }

            if (config.VerificationSettings.SendEmbedOnJoin && message.type === "GUILD_MEMBER_JOIN") {
                const embed = new EmbedBuilder()
                    .setColor(config.VerificationSettings.Embed.Color)
                    .setTitle(config.VerificationSettings.Embed.Title)
                    .setDescription(config.VerificationSettings.Embed.Description)
                    .setFooter({ text: config.VerificationSettings.Embed.Footer });

                const channel = message.guild?.channels.cache.get(config.VerificationSettings.ChannelID);
                if (channel) {
                    channel.send({ embeds: [embed] }).catch(console.error);
                }
            }
        }
    } catch (error) {
        console.error("An unexpected error occurred in handleVerificationSettings:", error);
    }
}

function replaceCustomCommandPlaceholders(text, message, additionalPlaceholders = {}) {
    if (!text || typeof text !== 'string') return '';

    const currentTime = moment().tz(config.Timezone);

    const placeholders = {
        user: message.author ? `<@${message.author.id}>` : 'Unknown User',
        userName: message.author ? message.author.username : 'Unknown Username',
        userTag: message.author ? message.author.tag : 'Unknown UserTag',
        userId: message.author ? message.author.id : 'Unknown UserID',
        guildName: message.guild ? message.guild.name : 'Unknown Guild',
        channelName: message.channel ? message.channel.name : 'Unknown Channel',
        channelId: message.channel ? message.channel.id : 'Unknown ChannelID',
        shorttime: currentTime.format("HH:mm"),
        longtime: currentTime.format('MMMM Do YYYY'),
        ...additionalPlaceholders
    };

    return Object.keys(placeholders).reduce((acc, key) => {
        const regex = new RegExp(`{${key}}`, 'gi');
        return acc.replace(regex, placeholders[key] || '');
    }, text);
}
