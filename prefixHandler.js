module.exports = async (client, message) => {
    if (!message.guild || !message.member || message.author.bot) {
        return;
    }

    handleTicketAlertReset(message);

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
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        console.log(`[DEBUG] Prefix: '${prefix}', Command: '${commandName}'`);

        const command = client.messageCommands.get(commandName);
        console.log(`[DEBUG] Message Command found: ${!!command}`);

        if (command) {
            try {
                await command.run(client, message, args);
            } catch (error) {
                console.error(`Error executing message command ${command.name}:`, error);
                message.reply('There was an error trying to execute that command!');
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

                const commandDataOptions = slashCommand.data.options || [];

                // Check for subcommands first
                const subcommands = commandDataOptions.filter(opt => opt.type === 1); // 1 is SUB_COMMAND
                let subcommandName = null;

                if (subcommands.length > 0 && currentArgs.length > 0) {
                    const possibleSubcommand = currentArgs[0];
                    if (subcommands.some(sc => sc.name === possibleSubcommand)) {
                        subcommandName = possibleSubcommand;
                        currentArgs.shift(); // Consume subcommand name
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
                    }

                    return message.reply(usageMsg);
                }

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
                        if (typeof content === 'string') {
                            return message.reply(content);
                        }
                        return message.reply(content);
                    },
                    editReply: async (content) => {
                        if (typeof content === 'string') {
                            return message.channel.send(content);
                        }
                        return message.channel.send(content);
                    },
                    deferReply: async () => {
                        await message.channel.sendTyping();
                    },
                    followUp: async (content) => {
                        if (typeof content === 'string') {
                            return message.channel.send(content);
                        }
                        return message.channel.send(content);
                    },
                    options: {
                        _parsed: parsedOptions,
                        getSubcommand: function () {
                            return subcommandName;
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

                await slashCommand.execute(fakeInteraction);
            } catch (error) {
                console.error(`Error executing slash command ${slashCommand.data.name} via prefix:`, error);
                message.reply('There was an error trying to execute that command!');
            }
            return;
        }
