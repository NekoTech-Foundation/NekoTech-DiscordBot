async function processCustomCommands(client, message) {
    try {
        const content = message.content.trim();
        const commandName = content.split(' ')[0].toLowerCase();
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
                    console.error('Error deleting message:', error);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    } catch (error) {
        console.error('Error processing custom commands:', error);
    }
}
