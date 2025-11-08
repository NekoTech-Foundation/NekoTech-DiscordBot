const AutoResponse = require('../../models/autoResponse');
const { parsePlaceholders } = require('./placeholderParser');
const { parseFunctions, executeChecks, executeActions } = require('./functionParser');

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

                    const response = await parsePlaceholders(responseContent, message);

                    const messagePayload = {};
                    if (response.trim().length > 0) {
                        messagePayload.content = response;
                    }

                    if (ar.attachmentUrl) {
                        const embed = new EmbedBuilder()
                            .setImage(ar.attachmentUrl);
                        messagePayload.embeds = [embed];
                    }

                    if (messagePayload.content || messagePayload.embeds) {
                        message.channel.send(messagePayload);
                    }
                    break; // Stop after first match
                }
            }
        });
        console.log('Autoresponder addon loaded.');
    }
};
