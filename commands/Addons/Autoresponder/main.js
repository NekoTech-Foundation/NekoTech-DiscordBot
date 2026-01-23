const AutoResponse = require('../../../models/autoResponse');
const Layout = require('../../../models/Layout');
const EmbedTemplate = require('../../../models/EmbedTemplate');
const { parsePlaceholders } = require('./placeholderParser');
const { parseFunctions, executeChecks, executeActions } = require('./functionParser');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    onLoad: (client) => {
        client.on('messageCreate', async message => {
            if (message.author.bot) return;

            const guildId = message.guild.id;
            const autoResponses = await AutoResponse.find({ guildId });

            for (const ar of autoResponses) {
                const trigger = ar.ignoreCase ? ar.trigger.toLowerCase() : ar.trigger;
                const content = ar.ignoreCase ? message.content.toLowerCase() : message.content;

                let match = false;
                if (ar.mode === 'exact' && content === trigger) {
                    match = true;
                } else if (ar.mode === 'contains' && content.includes(trigger)) {
                    match = true;
                } else if (ar.mode === 'startswith' && content.startsWith(trigger)) {
                    match = true;
                } else if (ar.mode === 'endswith' && content.endsWith(trigger)) {
                    match = true;
                }

                if (match) {
                    const { functions, content: responseContent } = parseFunctions(ar.response);

                    const checksPassed = await executeChecks(functions, message);
                    if (!checksPassed) continue;

                    await executeActions(functions, message);

                    let finalContent = await parsePlaceholders(responseContent, message);
                    const messagePayload = {};

                    // 1. Process {layout:Name}
                    const layoutRegex = /{layout:([^}]+)}/;
                    const layoutMatch = finalContent.match(layoutRegex);
                    if (layoutMatch) {
                        const layoutName = layoutMatch[1];
                        finalContent = finalContent.replace(layoutMatch[0], '');

                        try {
                            const layout = await Layout.findOne({ guildId, name: layoutName });
                            if (layout && layout.json_data) {
                                messagePayload.components = JSON.parse(layout.json_data);
                            }
                        } catch (e) {
                            console.error('[AutoResponder] Failed to load layout:', e);
                        }
                    }

                    // 2. Process {embed:Name}
                    const embedRegex = /{embed:([^}]+)}/;
                    const embedMatch = finalContent.match(embedRegex);
                    if (embedMatch) {
                        const embedName = embedMatch[1];
                        finalContent = finalContent.replace(embedMatch[0], '');

                        try {
                            const embedTemplate = await EmbedTemplate.findOne({ name: embedName }); // Note: EmbedTemplate might need guildId in future if scoped
                            if (embedTemplate) {
                                let embedData = embedTemplate.embedData;
                                if (typeof embedData === 'string') {
                                    try { embedData = JSON.parse(embedData); } catch (e) { }
                                }

                                // Apply placeholders to embed fields if needed (simple string check)
                                // For deep placeholder parsing in embeds, we'd need to traverse the object. 
                                // ensuring simpler usage for now.

                                const embed = new EmbedBuilder(embedData);
                                messagePayload.embeds = [embed];
                            }
                        } catch (e) {
                            console.error('[AutoResponder] Failed to load embed:', e);
                        }
                    }

                    if (finalContent.trim().length > 0) {
                        messagePayload.content = finalContent;
                    }

                    if (ar.attachmentUrl) {
                        messagePayload.files = [ar.attachmentUrl];
                    }

                    if (messagePayload.content || messagePayload.files || messagePayload.embeds || messagePayload.components) {
                        message.channel.send(messagePayload).catch(console.error);
                    }
                    break; // Stop after first match
                }
            }
        });
        console.log('Autoresponder addon loaded with Layout & Embed support.');
    }
};
