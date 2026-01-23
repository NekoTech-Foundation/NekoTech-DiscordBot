const {
    ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder,
    ContextMenuCommandBuilder, REST, Collection, StringSelectMenuBuilder, MessageFlags
} = require('discord.js');
const fs = require('fs');
//const yaml = require('js-yaml');
const path = require('path');
const colors = require('ansi-colors');
const axios = require('axios');
const { Routes } = require('discord-api-types/v10');
const moment = require('moment-timezone');


const { getConfig, getLang, getCommands } = require('./utils/configLoader');
const startGiveawayScheduler = require('./events/Giveaways/giveawayScheduler.js');
const config = getConfig();
const commandConfig = getCommands();
const lang = getLang();



const UserData = require('./models/UserData.js');
const EconomyUserData = require('./models/EconomyUserData.js');
const ReactionRole = require('./models/ReactionRole');
const packageJson = require('./package.json');
// old giveaway scheduler removed
//const { handleUserJoiningTriggerChannel, handleUserLeavingChannel } = require('./events/voiceStateUpdate');

const { handleVoiceXP } = require('./events/Levels/handleXP');
const ChannelStat = require('./models/channelStatSchema');
const TempRole = require('./models/TempRole');
const Reminder = require('./models/reminder');




const GuildData = require('./models/guildDataSchema');
const Invite = require('./models/inviteSchema');
const AutoReact = require('./models/autoReact.js');




client.slashCommands = new Collection();

client.snipes = new Collection();
client.commandsReady = false;

global.slashCommands = [];

//const messageDeletions = new Map();
const MAX_SNIPES = 25;
//const MAX_MESSAGE_DELETIONS = 25;
const MAX_DEBOUNCE_ENTRIES = 1000;
const DEBOUNCE_CLEANUP_INTERVAL = 5 * 60 * 1000;
const REACTION_CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_BOT_REACTIONS = 100;
const LEADERBOARD_CACHE_SIZE = 100;
const LEADERBOARD_UPDATE_INTERVAL = 5 * 60 * 1000;
const LEADERBOARD_STALE_TIME = 30 * 60 * 1000;
const BATCH_SIZE = 50;
//const CACHE_FIELDS = {
//    balance: ['userId', 'totalBalance'],
//    invites: ['userId', 'invites'],
//    levels: ['userId', 'level', 'xp'],
//    messages: ['userId', 'messages']
//};

module.exports = async (client) => {
    // SQLite Database is initialized by utils/database.js when required by models
    require('./utils/database');

    global.leaderboardCache = {
        balance: [],
        invites: [],
        levels: [],
        messages: [],
        lastUpdated: null
    };

    const updateLeaderboardCache = async (client) => {
        // This function is disabled during the multi-guild refactoring.
        return;
    };

    function forceGC() {
        if (global.gc) {
            global.gc();
        }
    }

    setInterval(async () => {
        await updateLeaderboardCache(client);
        forceGC();
    }, LEADERBOARD_UPDATE_INTERVAL);
    setInterval(cleanupLeaderboardCache, LEADERBOARD_UPDATE_INTERVAL);


    client.on('messageDelete', handleMessageDelete);
    client.on('messageUpdate', handleMessageUpdate);
    client.on('guildMemberAdd', handleGuildMemberAdd);
    client.on('messageReactionAdd', handleReactionAdd);
    client.on('messageReactionRemove', handleReactionRemove);
    client.on('ready', handleReady);
    client.on('error', handleError);
    client.on('warn', handleWarn);



    const panelHandlers = {};
    const interactionDebounce = new Map();

    function registerPanelHandler(panelName, handler) {
        panelHandlers[panelName] = handler;
    }

    function hexToDecimal(hex) {
        return parseInt(hex.replace('#', ''), 16);
    }






    async function handleMessageDelete(message) {
        if (!message.guild || message.author.bot) return;

        const userData = await UserData.findOne({ userId: message.author.id, guildId: message.guild.id });
        if (userData && userData.allowSniping === false) return;

        if (!client.snipes.has(message.guild.id)) {
            client.snipes.set(message.guild.id, new Collection());
        }
        const guildSnipes = client.snipes.get(message.guild.id);
        guildSnipes.set(message.channel.id, {
            content: message.content,
            author: message.author.tag,
            member: message.member,
            timestamp: new Date()
        });

        if (guildSnipes.size >= MAX_SNIPES) {
            const oldestKey = guildSnipes.firstKey();
            guildSnipes.delete(oldestKey);
        }
    }

    function createPanelHandler(panelConfig) {
        return async (interaction) => {
            const reaction = panelConfig.Reactions.find(reaction => reaction.Emoji === interaction.customId);
            if (!reaction) return;

            const role = interaction.guild.roles.cache.get(reaction.RoleID);
            if (!role) {
                return;
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                }
                if (member.roles.cache.has(role.id)) {
                    await member.roles.remove(role);
                    await interaction.editReply({ content: `Removed the ${reaction.Name} role from you.` });
                } else {
                    await member.roles.add(role);
                    await interaction.editReply({ content: `Added the ${reaction.Name} role to you.` });
                }
            } catch (error) {
                console.error(error);
            }
        };
    }

    if (config.ReactionRoles) {
        Object.keys(config.ReactionRoles).forEach(panelName => {
            const panelConfig = config.ReactionRoles[panelName];
            if (panelConfig.useButtons) {
                const handler = createPanelHandler(panelConfig);
                registerPanelHandler(panelName, handler);
            }
        });
    }

    async function handleInteractionCreate(interaction) {
        if (interaction.isCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[ERROR] Failed to execute command ${command.id || command.name}:`);
                console.error(error.stack || error); // Ensure stack trace is printed


                // Try to send error message, but handle expired interactions gracefully
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'There was an error while executing this command!',
                            flags: MessageFlags.Ephemeral
                        });
                    } else if (interaction.deferred) {
                        await interaction.editReply({
                            content: 'There was an error while executing this command!'
                        });
                    }
                } catch (replyError) {
                    // Only log if it's not an expired interaction error
                    if (replyError.code !== 10062) {
                        console.error('[ERROR] Failed to send error message:', replyError);
                    }
                    // If interaction expired (10062), silently ignore
                }
            }
        } else if (interaction.isAutocomplete()) {
            try {
                const command = client.slashCommands.get(interaction.commandName);
                if (!command || !command.autocomplete) {
                    await interaction.respond([]).catch(() => { });
                    return;
                }

                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    console.error(`[ERROR] Failed to execute autocomplete for command ${command.id || command.name}:`, error);
                    try {
                        await interaction.respond([]).catch(() => { });
                    } catch (respondError) {
                    }
                }
            } catch (error) {
                console.error('Error in main autocomplete handler:', error);
                try {
                    await interaction.respond([]).catch(() => { });
                } catch (respondError) {
                }
            }
        } else if (interaction.isButton()) {
            const interactionKey = `${interaction.user.id}-${interaction.customId}`;

            if (interactionDebounce.size > MAX_DEBOUNCE_ENTRIES) {
                const oldestKey = Array.from(interactionDebounce.keys())[0];
                clearTimeout(interactionDebounce.get(oldestKey));
                interactionDebounce.delete(oldestKey);
            }

            if (interactionDebounce.has(interactionKey)) {
                clearTimeout(interactionDebounce.get(interactionKey));
            }
            interactionDebounce.set(interactionKey, setTimeout(async () => {
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        if (interaction.customId.startsWith('reaction_role_')) {
                            await handleReactionRoleButton(interaction);
                        } else {
                            for (const [panelName, handler] of Object.entries(panelHandlers)) {
                                await handler(interaction);
                            }
                            const transaction = await Transaction.findOne({ interactionId: interaction.message.interaction.id });
                            if (interaction.customId === 'get_wallet_address') {
                                if (transaction) {
                                    await interaction.reply({ content: `Wallet Address: \`${transaction.address}\``, flags: MessageFlags.Ephemeral });
                                } else {
                                    await interaction.reply({ content: 'Wallet address not found.', flags: MessageFlags.Ephemeral });
                                }
                            } else if (interaction.customId === 'show_qr_code') {
                                if (transaction) {
                                    await interaction.reply({ content: transaction.qrCodeURL, flags: MessageFlags.Ephemeral });
                                } else {
                                    await interaction.reply({ content: 'QR code not found.', flags: MessageFlags.Ephemeral });
                                }
                            }
                        }
                    } else {
                        //      console.warn(`Interaction ${interaction.id} has already been replied or deferred.`);
                    }
                } catch (error) {

                } finally {
                    interactionDebounce.delete(interactionKey);
                }
            }, 100));
        } else if (interaction.isStringSelectMenu()) {

            if (interaction.customId.startsWith('reaction_role_')) {
                await handleReactionRoleSelect(interaction);
            } else if (interaction.customId.startsWith('cmd_menu_')) {
                await handleCommandMenuSelect(interaction);
            }
        }
    }

    async function handleCommandMenuSelect(interaction) {
        const commandName = interaction.customId.replace('cmd_menu_', '');
        const selectedSubcommand = interaction.values[0];
        const command = client.slashCommands.get(commandName);

        if (!command) {
            return interaction.reply({ content: 'Lệnh không tồn tại hoặc đã bị xóa.', flags: MessageFlags.Ephemeral });
        }

        // Create a fake interaction wrapper to mimic a Slash Command Interaction
        const fakeInteraction = {
            ...interaction,
            user: interaction.user,
            member: interaction.member,
            guild: interaction.guild,
            channel: interaction.channel,
            client: client,
            createdTimestamp: interaction.createdTimestamp,
            id: interaction.id,
            // Override options to return the selected subcommand
            options: {
                getSubcommand: () => selectedSubcommand,
                getString: (name) => {
                    // Start defaults for optional args if needed, or null
                    return null;
                },
                getInteger: () => null,
                getNumber: () => null,
                getBoolean: () => false,
                getUser: () => null,
                getMember: () => null,
                getChannel: () => null,
                getRole: () => null,
                getMentionable: () => null,
                getAttachment: () => null,
                // Helper to pass through other things if needed
                _parsed: {}
            },
            reply: async (options) => {
                if (interaction.replied || interaction.deferred) {
                    return interaction.editReply(options);
                }
                return interaction.reply(options);
            },
            editReply: async (options) => {
                return interaction.editReply(options);
            },
            deferReply: async (options) => {
                if (!interaction.deferred && !interaction.replied) {
                    return interaction.deferReply(options);
                }
            },
            followUp: async (options) => {
                return interaction.followUp(options);
            }
        };

        // Bind functions to preserve context if they used `this`
        fakeInteraction.reply = fakeInteraction.reply.bind(fakeInteraction);
        fakeInteraction.editReply = fakeInteraction.editReply.bind(fakeInteraction);
        fakeInteraction.deferReply = fakeInteraction.deferReply.bind(fakeInteraction);
        fakeInteraction.followUp = fakeInteraction.followUp.bind(fakeInteraction);

        try {
            await command.execute(fakeInteraction, client);
        } catch (error) {
            console.error(`Error executing command ${commandName} via menu:`, error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Có lỗi xảy ra khi thực hiện lệnh!', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.editReply({ content: 'Có lỗi xảy ra khi thực hiện lệnh!' });
            }
        }
    }

    async function handleReactionRoleButton(interaction) {
        const [, , panelName, index] = interaction.customId.split('_');
        const panel = config.ReactionRoles[panelName];
        if (!panel) return;

        const reaction = panel.Reactions[parseInt(index)];
        if (!reaction) return;

        const member = interaction.member;
        const role = interaction.guild.roles.cache.get(reaction.RoleID);
        if (!role) {
            return;
        }

        try {
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                await interaction.reply({ content: `Removed the ${reaction.Name} role from you.`, flags: MessageFlags.Ephemeral });
            } else {
                await member.roles.add(role);
                await interaction.reply({ content: `Added the ${reaction.Name} role to you.`, flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while updating your roles.', flags: MessageFlags.Ephemeral });
        }
    }

    async function handleReactionRoleSelect(interaction) {
        const panelName = interaction.customId.split('_')[2];
        const panel = config.ReactionRoles[panelName];

        if (!panel) return;

        const member = interaction.member;
        const selectedValues = interaction.values;
        const availableRoles = panel.Reactions.map((r, index) => ({ roleId: r.RoleID, value: `${panelName}_${index}` }));

        try {
            for (const { roleId, value } of availableRoles) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) {
                    continue;
                }

                if (selectedValues.includes(value)) {
                    if (!member.roles.cache.has(roleId)) {
                        await member.roles.add(roleId);
                    }
                } else {
                    if (member.roles.cache.has(roleId)) {
                        await member.roles.remove(roleId);
                    }
                }
            }

            await interaction.reply({ content: lang.Reactions.RolesUpdated, flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Error updating roles:', error);
            await interaction.reply({ content: 'There was an error while updating your roles.', flags: MessageFlags.Ephemeral });
        }
    }

    const botRemovingReaction = new Set();
    const userReactionCooldowns = new Map();
    const REACTION_COOLDOWN = 1000;

    async function handleReactionAdd(reaction, user) {
        if (user.bot) return;

        const cooldownKey = `${user.id}`;
        const lastReactionTime = userReactionCooldowns.get(cooldownKey);
        const now = Date.now();

        if (lastReactionTime && now - lastReactionTime < REACTION_COOLDOWN) {
            await reaction.users.remove(user).catch(console.error);
            return;
        }

        let panelName, panel;
        try {
            const storedPanel = await ReactionRole.findOne({ messageID: reaction.message.id });
            if (storedPanel) {
                panelName = storedPanel.panelName;
                panel = config.ReactionRoles[panelName];
            }
        } catch (error) {
            console.error('Error finding panel in DB:', error);
            return;
        }

        if (!panel || panel.useButtons) return;

        userReactionCooldowns.set(cooldownKey, now);

        if (userReactionCooldowns.size > 1000) {
            const oldEntries = Array.from(userReactionCooldowns.entries())
                .filter(([, timestamp]) => now - timestamp > REACTION_COOLDOWN);
            oldEntries.forEach(([key]) => userReactionCooldowns.delete(key));
        }

        const reactionEmoji = reaction.emoji.id ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
        const reactionConfig = panel.Reactions.find(r => r.Emoji === reactionEmoji);
        if (!reactionConfig) return;

        const role = reaction.message.guild.roles.cache.get(reactionConfig.RoleID);
        if (!role) {
            return;
        }

        const member = reaction.message.guild.members.cache.get(user.id);

        try {
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
            } else {
                await member.roles.add(role);
            }

            if (panel.resetReacts) {
                const key = `${reaction.message.id}-${user.id}`;
                botRemovingReaction.add(key);
                try {
                    await reaction.users.remove(user);
                } catch (error) {
                    console.error('Error removing reaction:', error);
                } finally {
                    setTimeout(() => {
                        botRemovingReaction.delete(key);
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Error handling reaction role:', error);
            botRemovingReaction.delete(`${reaction.message.id}-${user.id}`);
        }
    }

    async function handleReactionRemove(reaction, user) {
        if (user.bot) return;

        const key = `${reaction.message.id}-${user.id}`;
        if (botRemovingReaction.has(key)) {
            return;
        }

        let panelName, panel;
        try {
            const storedPanel = await ReactionRole.findOne({ messageID: reaction.message.id });
            if (storedPanel) {
                panelName = storedPanel.panelName;
                panel = config.ReactionRoles[panelName];
            }
        } catch (error) {
            console.error('Error finding panel in DB:', error);
            return;
        }

        if (!panel || panel.useButtons) return;

        const reactionEmoji = reaction.emoji.id ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
        const reactionConfig = panel.Reactions.find(r => r.Emoji === reactionEmoji);
        if (!reactionConfig) return;

        const role = reaction.message.guild.roles.cache.get(reactionConfig.RoleID);
        if (!role) {
            return;
        }

        const member = reaction.message.guild.members.cache.get(user.id);

        try {
            if (member && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
            }
        } catch (error) {
            console.error('Error handling reaction role removal:', error);
        }
    }

    async function handleMessageUpdate(oldMessage, newMessage) {
        if (!oldMessage?.guild || !oldMessage?.author || oldMessage?.author?.bot) return;

        if (oldMessage.content === newMessage.content) return;

        const userData = await UserData.findOne({ userId: oldMessage.author.id, guildId: oldMessage.guild.id });
        if (userData && userData.allowSniping === false) return;

        if (!client.snipes.has(oldMessage.guild.id)) {
            client.snipes.set(oldMessage.guild.id, new Collection());
        }

        const guildSnipes = client.snipes.get(oldMessage.guild.id);
        guildSnipes.set(oldMessage.channel.id, {
            oldContent: oldMessage.content,
            newContent: newMessage.content,
            author: oldMessage.author.tag,
            member: oldMessage.member,
            timestamp: new Date(),
            edited: true
        });
    }

    function handleGuildMemberAdd(member) {
        const autoKickConfig = config.AutoKick;
        if (!autoKickConfig.Enabled || member.user.bot) return;

        const roleIDs = autoKickConfig.Role;
        const timeLimit = parseTimeToMs(autoKickConfig.Time);

        setTimeout(async () => {
            try {
                member = await member.guild.members.fetch(member.id);
                if (!member) return;

                const hasRequiredRole = roleIDs.some(role => member.roles.cache.has(role));

                if (!hasRequiredRole) {
                    if (autoKickConfig.DM.Enabled) {
                        const embed = new EmbedBuilder()
                            .setTitle(autoKickConfig.DM.Embed.Title)
                            .setDescription(autoKickConfig.DM.Embed.Description.join('\n'))
                            .setColor(autoKickConfig.DM.Embed.Color)
                            .setFooter({ text: autoKickConfig.DM.Embed.Footer });

                        await member.send({ embeds: [embed] }).catch(err => {
                            if (err.code !== 50007) {
                            }
                        });
                    }

                    await member.kick("Auto-Kick: Failed to acquire the required role in time.");
                }
            } catch (err) {
                console.error(`Failed to process auto-kick for ${member.displayName}: ${err}`);
            }
        }, timeLimit);
    }

    async function trackVoiceChannels(client) {
        client.guilds.cache.forEach(guild => {
            guild.channels.cache.forEach(channel => {
                if (channel.type === ChannelType.GuildVoice) {
                    channel.members.forEach(member => {
                        if (!member.user.bot) {
                            handleVoiceXP(member);
                        }
                    });
                }
            });
        });
    }

    async function handleReady() {
        try {
            await initializeComponents();

            setupSchedulers();

            await registerSlashCommands();

            logStartupInfo();


        } catch (error) {
            console.error('Error during bot initialization:', error);
        }
    }

    async function initializeComponents() {
        await updateLeaderboardCache(client);
        await checkForLeftMembers();
        if (config.ReactionRoles && config.ReactionRoles.Enabled) {
            await setupReactionRoles();
        }
        if (config.ReactionRoles && config.ReactionRoles.Enabled) {
            await setupReactionRoles();
        }

        // Scan 'commands' directory for all types of modules (Slash, Message, Events, etc.)
        const commandFiles = getFilesRecursively('./commands');
        commandFiles.forEach(file => {
            const absolutePath = path.resolve(file);
            const folderNameMatch = file.match(/[\\\/]commands[\\\/]([^\\\/]+)/i);
            const folderName = folderNameMatch ? folderNameMatch[1] : 'unknown';

            try {
                const command = require(absolutePath);
                command.filePath = absolutePath;

                // Determine category
                let category = folderName;
                if (folderName === 'Addons') {
                    const addonMatch = file.match(/[\\\/]commands[\\\/]Addons[\\\/]([^\\\/]+)/i);
                    if (addonMatch) {
                        category = addonMatch[1];
                    }
                }
                if (!command.category) {
                    command.category = category;
                }

                // Execute onLoad if present
                if (typeof command.onLoad === 'function') {
                    command.onLoad(client);
                }

                // Handle Slash Commands
                if (command.data && typeof command.data.toJSON === 'function') {
                    const name = command.data.name;
                    // Prevent duplicates if already loaded
                    if (!client.slashCommands.has(name)) {
                        // Check commandConfig if command is enabled
                        if (!commandConfig || commandConfig[name] !== false) {
                            const json = command.data.toJSON();
                            global.slashCommands.push(json);
                            client.slashCommands.set(name, command);
                        }
                    }
                }

                // Handle Message Commands
                if (command.name && command.run && typeof command.run === 'function') {
                    // Avoid overwriting if possible, or allow overwrite if intentional. 
                    // Using set() usually overwrites which is standard behavior.
                    client.messageCommands.set(command.name, command);
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => {
                            client.messageCommands.set(alias, command);
                        });
                    }
                }
                // Handle Plain Events
                else if (command.run && typeof command.run === 'function' && !command.data) {
                    command.run(client);
                }

            } catch (err) {
                console.error(`[ERROR] Failed to load module ${file}:`, err);
            }
        });
    }

    function setupSchedulers() {
        const schedulers = [
            { condition: true, fn: startTempBanScheduler, name: 'Tempban' },
            // Core giveaway scheduler
            { condition: commandConfig && commandConfig.giveaway, fn: startGiveawayScheduler, name: 'Giveaway' },
            // new giveaway addon includes its own scheduler via addons/Giveaway/giveaway.js

            { condition: true, fn: startInterestScheduler, name: 'Interest' },

            {
                condition: true,
                fn: () => {
                    updateChannelStats(client);
                    const interval = setInterval(() => {
                        updateChannelStats(client);
                    }, 30000);
                    global.channelStatsInterval = interval;
                },
                name: 'ChannelStats'
            },

            // {
            //     condition: commandConfig && commandConfig.cardrecharge,
            //     fn: () => {
            //         const { startTask } = require('./addons/CardRecharge/tasks/cardStatusTask');
            //         startTask(client);
            //     },
            //     name: 'CardRecharge'
            // }
        ];

        schedulers.forEach(({ condition, fn, name }) => {
            if (condition) {
                try {
                    fn();
                } catch (error) {
                    console.error(`${colors.red('■')} Error starting ${name} scheduler:`, error);
                }
            }
        });

        setInterval(checkAndRemoveExpiredRoles, 12500);
        setInterval(removeExpiredWarnings, 5 * 60 * 1000);
        setInterval(cleanupInteractionDebounce, DEBOUNCE_CLEANUP_INTERVAL);
        setInterval(cleanupBotReactions, REACTION_CLEANUP_INTERVAL);
    }

    async function registerSlashCommands() {
        const commandNames = new Set();
        const duplicates = [];
        for (const command of global.slashCommands) {
            if (commandNames.has(command.name)) {
                duplicates.push(command.name);
            } else {
                commandNames.add(command.name);
            }
        }

        if (duplicates.length > 0) {
            console.error(`${colors.red('[ERROR]')} Duplicate slash command names detected:`, duplicates.join(', '));
            // Deduplicate by keeping the first occurrence (prefer base commands over addons)
            const uniqueByName = new Map();
            const ordered = [];
            for (const cmd of global.slashCommands) {
                if (!uniqueByName.has(cmd.name)) {
                    uniqueByName.set(cmd.name, true);
                    ordered.push(cmd);
                }
            }
            global.slashCommands = ordered;
        }

        const rest = new REST({ version: '10' }).setToken(config.BotToken);
        const registeredCommands = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: global.slashCommands }
        );

        // Clear Guild Commands for the Main Guild to remove stale duplicates (like "Treo máy")
        if (config.GuildID) {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, config.GuildID),
                    { body: [] }
                );
                console.log(`[STARTUP] Cleared guild commands for ${config.GuildID}`);
            } catch (error) {
                console.error(`[STARTUP] Failed to clear guild commands: ${error}`);
            }
        }

        registeredCommands.forEach(registeredCommand => {
            const localCommand = client.slashCommands.get(registeredCommand.name);
            if (localCommand) {
                localCommand.id = registeredCommand.id;
            }
        });

        client.commandsReady = true;

    }

    function logStartupInfo() {
        const nodeVersion = process.version;
        const appVersion = packageJson.version;
        const formattedDate = moment().format('HH:mm (DD-MM-YYYY)');
        const startupTime = ((Date.now() - global.startTime) / 1000).toFixed(3);

        const logMessage = `${formattedDate} - Bot started up - Node.js ${nodeVersion} - App Version ${appVersion}\n`;

        fs.appendFile('logs.txt', logMessage, (err) => {
            if (err) {
                console.error('Failed to write to log file:', err);
            }
        });

        console.log(`\n${colors.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`);
        console.log(`${colors.green('[STARTUP]')} ${colors.white(`Done in ${startupTime}s`)}`);
        console.log(`${colors.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`);
        console.log(`${colors.magenta('User:')} ${colors.white(`${client.user.tag}`)}`);
        console.log(`${colors.magenta('ID:')} ${colors.white(`${client.user.id}`)}`);
        console.log(`${colors.magenta('Commands:')} ${colors.white(`${client.slashCommands.size} Slash | ${client.messageCommands.size} Message`)}`);
        console.log(`${colors.magenta('Node.js:')} ${colors.white(`${nodeVersion}`)}`);
        console.log(`${colors.magenta('Bot Version:')} ${colors.white(`v${appVersion}`)}`);
        console.log(`${colors.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}\n`);
    }

    function handleSlashCommandError(error) {
        fs.appendFileSync('logs.txt', `${new Date().toISOString()} - ERROR: ${JSON.stringify(error, null, 2)}\n`);

        if (error.message.includes("application.commands scope")) {
            console.error(`${colors.red('[ERROR]')} Application.commands scope wasn't selected when inviting the bot.`);
            console.error(`${colors.red('[ERROR]')} Invite the bot using the following URL:`);
            console.error(`${colors.red(`[ERROR] https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)}`);
        }
    }

    async function checkForLeftMembers() {
        const allGuilds = client.guilds.cache;

        for (const [guildId, guild] of allGuilds) {
            try {
                const currentMembers = await guild.members.fetch();
                const currentMemberIds = new Set(currentMembers.map(member => member.id));

                let guildData = await GuildData.findOne({ guildID: guildId });

                if (!guildData) {
                    guildData = await GuildData.create({ guildID: guildId, members: [] });
                }

                const storedMemberIds = new Set(guildData.members);

                const leftMemberIds = [...storedMemberIds].filter(id => !currentMemberIds.has(id));

                for (const memberId of leftMemberIds) {
                    await handleMemberLeft(guild, memberId);
                }

                await updateStoredMembers(guildData, currentMemberIds);
            } catch (error) {
                console.error(`Error checking for left members in guild ${guildId}:`, error);
            }
        }
    }

    async function handleMemberLeft(guild, memberId) {
        const member = await guild.members.fetch(memberId).catch(() => null);

        if (member) {
            await sendLeaveMessage(member);
            await updateInviteUsage(member);
        }
    }

    async function updateStoredMembers(guildData, currentMemberIds) {
        guildData.members = [...currentMemberIds];
        await guildData.save();
    }

    function handleError(error) {
        fs.appendFile('logs.txt', `${new Date().toISOString()} - ERROR: ${error}\n`, (err) => {
            if (err) {
                console.error('Failed to write to log file:', err);
            }
        });
    }

    function handleWarn(info) {
        fs.appendFile('logs.txt', `${new Date().toISOString()} - WARN: ${info}\n`, (err) => {
            if (err) {
                console.error('Failed to write to log file:', err);
            }
        });
    }

    function parseDuration(durationStr) {
        const durationRegex = /(\d+)([smhd])/g;
        let match;
        let duration = 0;

        while ((match = durationRegex.exec(durationStr)) !== null) {
            const value = parseInt(match[1], 10);
            const unit = match[2];

            switch (unit) {
                case 's':
                    duration += value * 1000;
                    break;
                case 'm':
                    duration += value * 60 * 1000;
                    break;
                case 'h':
                    duration += value * 60 * 60 * 1000;
                    break;
                case 'd':
                    duration += value * 24 * 60 * 60 * 1000;
                    break;
                default:
                    break;
            }
        }

        return duration;
    }

    //  function parseCustomDuration(durationStr) {
    //      const timeUnits = {
    //          s: 1000,
    //          m: 60 * 1000,
    //          h: 60 * 60 * 1000,
    //          d: 24 * 60 * 60 * 1000
    //      };
    //      return durationStr.split(' ').reduce((totalMilliseconds, part) => {
    //          const unit = part.slice(-1);
    //          const value = parseInt(part.slice(0, -1), 10);
    //          return totalMilliseconds + (value * (timeUnits[unit] || 0));
    //      }, 0);
    //  }

    //  function createLogEmbed(author, color, title, description, fields, footerText) {
    //      return new EmbedBuilder()
    //          .setAuthor({ name: author })
    //          .setColor(color)
    //          .setTitle(title)
    //          .setDescription(description)
    //          .addFields(fields)
    //          .setTimestamp()
    //          .setFooter({ text: footerText });
    //  }

    //  function humanReadableDuration(milliseconds) {
    //      if (milliseconds < 1000) return "Less than a second";
    //
    //      let totalSeconds = Math.floor(milliseconds / 1000);
    //      let totalMinutes = Math.floor(totalSeconds / 60);
    //      let totalHours = Math.floor(totalMinutes / 60);
    //      let days = Math.floor(totalHours / 24);
    //      let weeks = Math.floor(days / 7);
    //      let months = Math.floor(days / 30);
    //      let years = Math.floor(days / 365);
    //
    //      totalSeconds %= 60;
    //      totalMinutes %= 60;
    //      totalHours %= 24;
    //      days %= 7;
    //      weeks %= 4;
    //      months %= 12;
    //
    //      let duration = '';
    //      if (years > 0) duration += `${years} year${years > 1 ? 's' : ''}, `;
    //      if (months > 0) duration += `${months} month${months > 1 ? 's' : ''}, `;
    //      if (weeks > 0) duration += `${weeks} week${weeks > 1 ? 's' : ''}, `;
    //      if (days > 0) duration += `${days} day${days > 1 ? 's' : ''}, `;
    //      if (totalHours > 0) duration += `${totalHours} hour${totalHours > 1 ? 's' : ''}, `;
    //      if (totalMinutes > 0) duration += `${totalMinutes} minute${totalMinutes > 1 ? 's' : ''}, `;
    //      if (totalSeconds > 0) duration += `${totalSeconds} second${totalSeconds > 1 ? 's' : ''}`;
    //
    //      return duration.replace(/,\s*$/, "");
    //  }

    // function sendLogMessage(guild, channelId, embed) {
    //     const logChannel = guild.channels.cache.get(channelId);
    //     if (logChannel) {
    //         logChannel.send({ embeds: [embed] });
    //     }
    // }

    // async function sendDirectMessage(user, template, data) {
    //     let messageContent = template
    //         .replace(/{user}/g, user.username)
    //         .replace(/{guildname}/g, data.guildName)
    //         .replace(/{message}/g, data.messageContent)
    //         .replace(/{time}/g, data.timeoutDuration);
    //     try {
    //         await user.send(messageContent);
    //     } catch (error) {
    //         console.log(`Could not send DM to ${user.username}: ${error}`);
    //     }
    // }

    async function updateChannelStats(client) {
        try {
            const stats = await ChannelStat.find({});
            const updatePromises = [];

            for (const stat of stats) {
                const guild = client.guilds.cache.get(stat.guildId);
                if (!guild) continue;

                const channel = guild.channels.cache.get(stat.channelId);
                if (!channel || channel.type !== 2) continue;

                let value;
                try {
                    switch (stat.type) {
                        case 'MemberCount':
                            value = guild.memberCount.toString();
                            break;
                        case 'NitroBoosterCount':
                            value = guild.premiumSubscriptionCount.toString();
                            break;
                        case 'ServerCreationDate':
                            value = guild.createdAt.toDateString();
                            break;
                        case 'TotalRolesCount':
                            value = guild.roles.cache.size.toString();
                            break;
                        case 'TotalEmojisCount':
                            value = guild.emojis.cache.size.toString();
                            break;
                        case 'TotalChannelsCount':
                            value = guild.channels.cache.size.toString();
                            break;
                        case 'OnlineMembersCount':
                            const onlineStatuses = ['online', 'dnd', 'idle'];
                            value = guild.members.cache.filter(member =>
                                onlineStatuses.includes(member.presence?.status) && !member.user.bot
                            ).size.toString();
                            break;
                        case 'ServerRegion':
                            value = guild.preferredLocale;
                            break;
                        case 'TotalBannedMembers':
                            const bans = await guild.bans.fetch();
                            value = bans.size.toString();
                            break;
                        case 'TotalMembersWithRole':
                            if (stat.roleId) {
                                const role = guild.roles.cache.get(stat.roleId);
                                value = role ? role.members.size.toString() : 'Role not found';
                            } else {
                                value = 'No role specified';
                            }
                            break;
                        case 'OnlineMembersWithRole':
                            if (stat.roleId) {
                                const role = guild.roles.cache.get(stat.roleId);
                                if (role) {
                                    const onlineMembers = role.members.filter(member =>
                                        ['online', 'dnd', 'idle'].includes(member.presence?.status) && !member.user.bot
                                    );
                                    value = onlineMembers.size.toString();
                                } else {
                                    value = 'Role not found';
                                }
                            } else {
                                value = 'No role specified';
                            }
                            break;
                        case 'TotalTickets':
                            value = await Ticket.countDocuments({ guildId: stat.guildId });
                            break;
                        case 'OpenTickets':
                            value = await Ticket.countDocuments({ guildId: stat.guildId, status: 'open' });
                            break;
                        case 'ClosedTickets':
                            value = await Ticket.countDocuments({ guildId: stat.guildId, status: 'closed' });
                            break;
                        case 'DeletedTickets':
                            value = await Ticket.countDocuments({ guildId: stat.guildId, status: 'deleted' });
                            break;
                        default:
                            continue;
                    }

                    if (value != null) {
                        let formattedValue = value;
                        if (!['ServerCreationDate', 'ServerRegion'].includes(stat.type) && !isNaN(value)) {
                            formattedValue = new Intl.NumberFormat('en-US').format(value);
                        }

                        const parts = stat.channelName.split('{stats}');
                        const beforeStats = parts[0] || '';
                        const afterStats = parts[1] || '';

                        const newChannelName = `${beforeStats}${formattedValue}${afterStats}`
                            .replace(/\s+/g, ' ')
                            .trim();

                        if (channel.name !== newChannelName) {
                            updatePromises.push({
                                channel,
                                newName: newChannelName,
                                currentName: channel.name
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error processing stat ${stat.type} for channel ${stat.channelId}:`, error);
                }
            }

            for (const update of updatePromises) {
                try {
                    if (update.channel.name !== update.newName) {
                        try {
                            await update.channel.setName(update.newName);
                        } catch (error) {
                            if (error.code === 429) {
                                const retryAfter = error.data?.retry_after || 5;
                                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                                await update.channel.setName(update.newName);
                            } else {
                                throw error;
                            }
                        }
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                } catch (error) {
                    console.error(`Failed to update channel ${update.channel.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error in updateChannelStats:', error);
        }
    }



    function getFilesRecursively(directory, extension = '.js') {
        let results = [];

        const list = fs.readdirSync(directory);
        list.forEach(file => {
            const filePath = path.join(directory, file);
            const stat = fs.statSync(filePath);

            if (stat && stat.isDirectory()) {
                results = results.concat(getFilesRecursively(filePath, extension));
            } else if (file.endsWith(extension)) {
                results.push(filePath);
            }
        });

        return results;
    }

    const validButtonStyles = {
        PRIMARY: ButtonStyle.Primary,
        SECONDARY: ButtonStyle.Secondary,
        SUCCESS: ButtonStyle.Success,
        DANGER: ButtonStyle.Danger,
        LINK: ButtonStyle.Link
    };

    async function setupReactionRoles() {
        if (!config.ReactionRoles.Enabled) {
            return;
        }

        for (const panelName in config.ReactionRoles) {
            if (panelName === 'Enabled') continue;

            const panel = config.ReactionRoles[panelName];
            if (!panel) {
                continue;
            }

            if (!panel.ChannelID) {
                continue;
            }

            let channel;
            try {
                channel = await client.channels.fetch(panel.ChannelID);
            } catch (error) {
                console.error(`Error fetching channel for panel ${panelName}:`, error);
                continue;
            }

            if (!channel) {
                continue;
            }

            const existingPanel = await ReactionRole.findOne({ panelName });
            if (existingPanel) {
                try {
                    await channel.messages.fetch(existingPanel.messageID);
                    continue;
                } catch (error) {
                    if (error.code === 10008) {
                        await ReactionRole.deleteOne({ panelName });
                    } else {
                        console.error(`Error fetching existing reaction role message for ${panelName}:`, error);
                        continue;
                    }
                }
            }

            const panelDescription = panel.Embed.Description.map(line => line.trim()).join('\n');

            const embed = new EmbedBuilder()
                .setDescription(panelDescription);

            if (panel.Embed.Title) embed.setTitle(panel.Embed.Title);
            if (panel.Embed.Footer && panel.Embed.Footer.Text) {
                const footerOptions = { text: panel.Embed.Footer.Text };
                if (panel.Embed.Footer.Icon && panel.Embed.Footer.Icon.trim() !== '') {
                    footerOptions.iconURL = panel.Embed.Footer.Icon;
                }
                embed.setFooter(footerOptions);
            }
            if (panel.Embed.Author && panel.Embed.Author.Text) {
                const authorOptions = { name: panel.Embed.Author.Text };
                if (panel.Embed.Author.Icon && panel.Embed.Author.Icon.trim() !== '') {
                    authorOptions.iconURL = panel.Embed.Author.Icon;
                }
                embed.setAuthor(authorOptions);
            }
            if (panel.Embed.Color) embed.setColor(panel.Embed.Color);
            if (panel.Embed.Image) embed.setImage(panel.Embed.Image);
            if (panel.Embed.Thumbnail) embed.setThumbnail(panel.Embed.Thumbnail);

            let sentMessage;

            if (panel.type === "BUTTON") {
                const actionRows = [];
                let currentRow = new ActionRowBuilder();
                let totalButtons = 0;

                panel.Reactions.forEach((reaction, index) => {
                    if (totalButtons >= 25) {
                        console.error(`Exceeded the button limit for panel: ${panelName}. Maximum 25 buttons are allowed.`);
                        return;
                    }

                    const buttonStyle = validButtonStyles[reaction.Style.toUpperCase()] || ButtonStyle.Secondary;

                    const button = new ButtonBuilder()
                        .setCustomId(`reaction_role_${panelName}_${index}`)
                        .setLabel(reaction.Description)
                        .setStyle(buttonStyle)
                        .setEmoji(reaction.Emoji);
                    currentRow.addComponents(button);
                    totalButtons++;

                    if (currentRow.components.length === 5) {
                        actionRows.push(currentRow);
                        currentRow = new ActionRowBuilder();
                    }
                });

                if (currentRow.components.length > 0) {
                    actionRows.push(currentRow);
                }

                sentMessage = await channel.send({ embeds: [embed], components: actionRows });
            } else if (panel.type === "REACT") {
                sentMessage = await channel.send({ embeds: [embed] });
                for (const reaction of panel.Reactions) {
                    await sentMessage.react(reaction.Emoji);
                }
            } else if (panel.type === "SELECT") {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`reaction_role_${panelName}`)
                    .setPlaceholder('Select your roles')
                    .setMinValues(0)
                    .setMaxValues(panel.Reactions.length);

                panel.Reactions.forEach((reaction, index) => {
                    const option = {
                        label: reaction.Name,
                        value: `${panelName}_${index}`,
                        emoji: reaction.Emoji
                    };

                    if (reaction.Description) {
                        option.description = reaction.Description;
                    }

                    selectMenu.addOptions(option);
                });

                const actionRow = new ActionRowBuilder().addComponents(selectMenu);
                sentMessage = await channel.send({ embeds: [embed], components: [actionRow] });
            }

            if (sentMessage) {
                await ReactionRole.findOneAndUpdate(
                    { panelName },
                    {
                        panelName,
                        channelID: panel.ChannelID,
                        messageID: sentMessage.id
                    },
                    { upsert: true, new: true }
                );
            } else {
                console.log(`Failed to create reaction role panel for ${panelName}`);
            }
        }
    }

    async function removeExpiredWarnings() {
        if (!config.Warnings || !config.Warnings.Expiry) {
            console.error('Warning configuration is missing or incomplete.');
            return;
        }

        const expiryDuration = parseDuration(config.Warnings.Expiry);
        const now = new Date();
        const expiryDate = new Date(now.getTime() - expiryDuration);

        try {
            const users = await UserData.find({ "warnings.date": { $lte: expiryDate } });
            for (const user of users) {
                user.warnings = user.warnings.filter(warning => warning.date > expiryDate);
                await user.save();
            }
        } catch (error) {
            console.error('Error removing expired warnings:', error);
        }
    }

    async function checkAndRemoveExpiredTempBans() {
        const now = new Date();

        UserData.find({
            'tempBans.endTime': { $lte: now },
            'tempBans.lifted': false,
        })
            .then(async (expiredTempBans) => {
                for (const userData of expiredTempBans) {
                    for (const tempBan of userData.tempBans) {
                        if (tempBan.endTime <= now && !tempBan.lifted) {
                            const guild = client.guilds.cache.get(userData.guildId);
                            if (guild) {
                                try {
                                    await guild.members.unban(userData.userId);
                                    tempBan.lifted = true;
                                } catch (error) {
                                    if (error.code === 10026) {
                                        userData.tempBans = userData.tempBans.filter(ban => ban !== tempBan);
                                    } else {
                                        console.error(`Failed to unban user ${userData.userId}:`, error);
                                    }
                                }
                            }
                        }
                    }
                    await userData.save();
                }
            })
            .catch((error) => {
                console.error('Error checking expired tempbans:', error);
            });
    }

    function startTempBanScheduler() {
        setInterval(checkAndRemoveExpiredTempBans, 60000);
    }

    async function checkAndUpdateTicketStatus(client) {
        try {
            const tickets = await Ticket.find({
                status: { $in: ['open', 'closed'] }
            });

            for (const ticket of tickets) {
                const channel = await client.channels.cache.get(ticket.channelId) || await client.channels.fetch(ticket.channelId).catch(() => null);

                if (!channel) {
                    ticket.status = 'deleted';
                    ticket.deletedAt = new Date();
                    await ticket.save();
                }
            }
        } catch (error) {
        }
    }

    setInterval(async () => {
        const now = new Date();
        const reminders = await Reminder.find({ reminderTime: { $lte: now }, sent: false });

        reminders.forEach(async (reminder) => {
            try {
                let channel;
                try {
                    channel = await client.channels.fetch(reminder.channelId);
                } catch (channelError) {
                    if (channelError.code === 10003) {
                        await Reminder.deleteOne({ _id: reminder._id });
                        return;
                    }
                    throw channelError;
                }

                const user = await client.users.fetch(reminder.userId);

                const embed = new EmbedBuilder()
                    .setColor(hexToDecimal(lang.Reminder.Embeds.DM.Color));

                if (lang.Reminder.Embeds.DM.Title) {
                    embed.setTitle(lang.Reminder.Embeds.DM.Title);
                }

                if (lang.Reminder.Embeds.DM.Description) {
                    embed.setDescription(lang.Reminder.Embeds.DM.Description.replace('{message}', reminder.message));
                }

                if (lang.Reminder.Embeds.DM.Footer && lang.Reminder.Embeds.DM.Footer.Text) {
                    const footerOptions = { text: lang.Reminder.Embeds.DM.Footer.Text };
                    if (lang.Reminder.Embeds.DM.Footer.Icon && lang.Reminder.Embeds.DM.Footer.Icon.trim() !== '') {
                        footerOptions.iconURL = lang.Reminder.Embeds.DM.Footer.Icon;
                    }
                    embed.setFooter(footerOptions);
                }

                if (lang.Reminder.Embeds.DM.Author && lang.Reminder.Embeds.DM.Author.Text) {
                    const authorOptions = { name: lang.Reminder.Embeds.DM.Author.Text };
                    if (lang.Reminder.Embeds.DM.Author.Icon && lang.Reminder.Embeds.DM.Author.Icon.trim() !== '') {
                        authorOptions.iconURL = lang.Reminder.Embeds.DM.Author.Icon;
                    }
                    embed.setAuthor(authorOptions);
                }

                if (lang.Reminder.Embeds.DM.Image) {
                    embed.setImage(lang.Reminder.Embeds.DM.Image);
                }

                if (lang.Reminder.Embeds.DM.Thumbnail) {
                    embed.setThumbnail(lang.Reminder.Embeds.DM.Thumbnail);
                }

                embed.setTimestamp();

                await user.send({ embeds: [embed] }).catch(async error => {
                    if (error.code === 50007) {
                        await channel.send({ content: `<@${reminder.userId}>`, embeds: [embed] });
                    } else {
                        console.error('Failed to send reminder:', error);
                    }
                });

                reminder.sent = true;
                await reminder.save();
            } catch (error) {
                console.error('Failed to send reminder:', error);
            }
        });
    }, 30000);

    async function checkAndRemoveExpiredRoles() {
        const now = new Date();
        const expiredRoles = await TempRole.find({ expiration: { $lte: now } });

        for (const tempRole of expiredRoles) {
            const guild = client.guilds.cache.get(tempRole.guildId);
            if (!guild) continue;

            try {
                const member = await guild.members.fetch(tempRole.userId);
                if (member) {
                    await member.roles.remove(tempRole.roleId);
                }
            } catch (error) {
                console.error(`Failed to remove expired role: ${error}`);
            }
            await TempRole.deleteOne({ _id: tempRole._id });
        }
    }



    // function getNumberEmoji(number) {
    //     const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    //     return numberEmojis[number - 1];
    // }



    function parseTimeToMs(timeStr) {
        const timeRegex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
        const matches = timeRegex.exec(timeStr);
        const hours = parseInt(matches[1]) || 0;
        const minutes = parseInt(matches[2]) || 0;
        const seconds = parseInt(matches[3]) || 0;
        return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }

    fs.readdir('./events/', async (err, files) => {
        if (err) return console.error;

        files.forEach(file => {
            if (!file.endsWith('.js')) return;

            const evt = require(`./events/${file}`);
            let evtName = file.split('.')[0];

            if (typeof evt !== 'function') {
                console.error(`[ERROR] Event file '${file}' does not export a function. Skipping...`);
                return;
            }

            client.on(evtName, evt.bind(null, client));
        });
    });

    fs.readdir('./events/Music/', async (err, files) => {
        if (err) return console.error;

        files.forEach(file => {
            if (!file.endsWith('.js')) return;

            const evt = require(`./events/Music/${file}`);
            let evtName = file.split('.')[0];

            if (typeof evt !== 'function') {
                console.error(`[ERROR] Event file '${file}' does not export a function. Skipping...`);
                return;
            }

            client.on(evtName, evt.bind(null, client));
        });
    });

    client.login(config.BotToken).catch(error => {
        if (error.message.includes("Used disallowed intents")) {
            console.log('\x1b[31m%s\x1b[0m', `Used disallowed intents (READ HOW TO FIX): \n\nYou did not enable Privileged Gateway Intents in the Discord Developer Portal!\nTo fix this, you have to enable all the privileged gateway intents in your discord developer portal, you can do this by opening the discord developer portal, go to your application, click on bot on the left side, scroll down and enable Presence Intent, Server Members Intent, and Message Content Intent`);
            process.exit();
        } else if (error.message.includes("An invalid token was provided")) {
            console.log('\x1b[31m%s\x1b[0m', `[ERROR] The bot token specified in the config is incorrect!`);
            process.exit();
        } else {
            console.log('\x1b[31m%s\x1b[0m', `[ERROR] An error occurred while attempting to login to the bot`);
            console.log(error);
            process.exit();
        }
    });

    function getNextInterestTime() {
        const currentTime = moment().tz(config.Timezone);
        const interestTimes = config.Economy.interestInterval.map(time =>
            moment.tz(time, "HH:mm", config.Timezone)
        );

        interestTimes.sort((a, b) => a.diff(b));

        for (const interestTime of interestTimes) {
            if (currentTime.isBefore(interestTime)) {
                return interestTime;
            }
        }

        return interestTimes[0].add(1, 'day');
    }

    function startInterestScheduler() {
        const interval = process.env.TEST_MODE ? 60 * 1000 : 24 * 60 * 60 * 1000;
        const nextInterestTime = getNextInterestTime();

        setTimeout(async () => {
            const dailyInterestRate = Math.random() * (0.045 - 0.025) + 0.025;
            const users = await EconomyUserData.find({ bank: { $gt: 0 } });

            for (const user of users) {
                let interest = Math.floor(user.bank * dailyInterestRate);

                if (config.Economy.maxInterestEarning && config.Economy.maxInterestEarning > 0) {
                    interest = Math.min(interest, config.Economy.maxInterestEarning);
                }

                const updatedUser = await EconomyUserData.findOneAndUpdate(
                    { userId: user.userId },
                    {
                        $inc: { bank: interest },
                        $push: {
                            transactionLogs: {
                                type: 'interest',
                                amount: interest,
                                timestamp: new Date()
                            }
                        }
                    },
                    { new: true }
                );

                try {
                    const discordUser = await client.users.fetch(user.userId);
                    const interestEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Lãi Tiết Kiệm Hàng Ngày')
                        .setDescription(`💰 Bạn đã nhận được lãi suất hàng ngày!`)
                        .addFields(
                            { name: 'Tiền Lãi', value: `**${interest.toLocaleString('en-US')}** 🪙` },
                            { name: 'Tỉ Lệ Lãi Suất', value: `${(dailyInterestRate * 100).toFixed(2)}%` },
                            { name: 'Số Dư Ngân Hàng Mới', value: `**${updatedUser.bank.toLocaleString('en-US')}** 🪙` }
                        )
                        .setTimestamp();
                    await discordUser.send({ embeds: [interestEmbed] });
                } catch (error) {
                    console.error(`Could not send interest DM to ${user.userId}.`, error);
                }
            }

            startInterestScheduler();
        }, nextInterestTime.diff(moment().tz(config.Timezone)));
    }

    async function cleanup() {
        client.removeAllListeners('messageCreate');
        client.removeAllListeners('messageDelete');
        client.removeAllListeners('interactionCreate');
        client.removeAllListeners('messageUpdate');
        client.removeAllListeners('guildMemberAdd');
        client.removeAllListeners('messageReactionAdd');
        client.removeAllListeners('messageReactionRemove');
        client.removeAllListeners('ready');
        client.removeAllListeners('error');
        client.removeAllListeners('warn');

        try {
            if (global.schedulers) {
                for (const scheduler of global.schedulers) {
                    if (scheduler.intervalId) {
                        clearInterval(scheduler.intervalId);
                    }
                }
            }

            if (mongoose.connection.readyState !== 0) {
                await mongoose.connection.close();
            }

            if (client) {
                await client.destroy();
            }

            process.exit(0);
        } catch (error) {
            process.exit(1);
        }
    }

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    function cleanupLeaderboardCache() {
        const now = Date.now();
        if (global.leaderboardCache.lastUpdated &&
            now - global.leaderboardCache.lastUpdated > LEADERBOARD_STALE_TIME) {
            global.leaderboardCache = {
                balance: [],
                invites: [],
                levels: [],
                messages: [],
                lastUpdated: null
            };
        }
    }



    function cleanupInteractionDebounce() {
        const now = Date.now();
        let deletedCount = 0;

        interactionDebounce.forEach((timeout, key) => {
            clearTimeout(timeout);
            interactionDebounce.delete(key);
            deletedCount++;
        });

        if (deletedCount > 0) {
        }
    }

    function cleanupBotReactions() {
        const now = Date.now();
        const reactionTimeout = 30000;

        const reactions = Array.from(botRemovingReaction).map(key => {
            const [messageId, userId] = key.split('-');
            return {
                key,
                messageId,
                userId,
                timestamp: parseInt(messageId.split('_')[1] || now)
            };
        });

        let deletedCount = 0;
        reactions.forEach(reaction => {
            if (now - reaction.timestamp > reactionTimeout) {
                botRemovingReaction.delete(reaction.key);
                deletedCount++;
            }
        });

        if (botRemovingReaction.size > MAX_BOT_REACTIONS) {
            const sortedReactions = reactions
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(0, botRemovingReaction.size - MAX_BOT_REACTIONS);

            sortedReactions.forEach(reaction => {
                botRemovingReaction.delete(reaction.key);
                deletedCount++;
            });
        }

        if (deletedCount > 0) {
        }
    }

};
