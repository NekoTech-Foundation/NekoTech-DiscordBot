const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function replacePlaceholders(text, member, guild, memberPosition, userCreated) {
    if (!text) return '';
    return text
        .replace(/{user_mention}/g, member.toString())
        .replace(/{user_name}/g, member.user.username)
        .replace(/{user_tag}/g, member.user.tag)
        .replace(/{user_id}/g, member.user.id)
        .replace(/{user_created}/g, userCreated)
        .replace(/{user_avatar}/g, '{user_avatar}')
        .replace(/{server_name}/g, guild.name)
        .replace(/{server_id}/g, guild.id)
        .replace(/{server_membercount}/g, guild.memberCount.toString())
        .replace(/{server_membercount_nobots}/g, guild.members.cache.filter(m => !m.user.bot).size.toString())
        .replace(/{server_created}/g, `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`)
        .replace(/{member_position}/g, memberPosition.toString())
        .replace(/{newline}/g, '\n');
}

function replacePlaceholdersGoodbye(text, member, guild, memberPosition, userCreated) {
    if (!text) return '';
    return text
        .replace(/{user_mention}/g, member.toString())
        .replace(/{user}/g, member.user.username)
        .replace(/{user_name}/g, member.user.username)
        .replace(/{user_tag}/g, member.user.tag)
        .replace(/{user_id}/g, member.user.id)
        .replace(/{user_created}/g, userCreated)
        .replace(/{user_avatar}/g, '{user_avatar}')
        .replace(/{server_name}/g, guild.name)
        .replace(/{server_id}/g, guild.id)
        .replace(/{server_membercount}/g, guild.memberCount.toString())
        .replace(/{server_membercount_nobots}/g, guild.members.cache.filter(m => !m.user.bot).size.toString())
        .replace(/{server_created}/g, `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`)
        .replace(/{member_position}/g, memberPosition.toString())
        .replace(/{newline}/g, '\n');
}

async function buildWelcomeMessage(messageTemplate, member, guild) {
    const memberPosition = guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
        .map(m => m.id).indexOf(member.id) + 1;
    const userCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`;
    const userAvatar = member.user.displayAvatarURL({ dynamic: true, size: 256 });

    // Case 1: Empty messageTemplate or [blank] -> Default Embed
    if (!messageTemplate || messageTemplate.trim() === '' || messageTemplate === '[blank]') {
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(`Chào Mừng tới ${guild.name}!`)
            .setDescription(`Chào mừng bạn tới **${guild.name}**, ${member.toString()}!\nChúng tôi rất vui mừng khi bạn tham gia cộng đồng.`)
            .setThumbnail(userAvatar)
            .addFields(
                { name: '👤 Ngày tham gia', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                { name: '📅 Ngày thành lập TK', value: userCreated, inline: false },
                { name: '🎯 Thành viên số', value: `${memberPosition}`, inline: true }
            )
            .setFooter({ text: guild.name })
            .setTimestamp();
        return { embeds: [embed] };
    }

    // Case 2: Starts with [text] -> Plain Text Message
    if (messageTemplate.startsWith('[text]')) {
        const textContent = messageTemplate.substring(6).trim();
        const content = replacePlaceholders(textContent, member, guild, memberPosition, userCreated);
        return { content };
    }

    // Case 3: Try to parse as JSON for custom embed
    try {
        const parsed = JSON.parse(messageTemplate);
        const embed = new EmbedBuilder();

        if (parsed.title) embed.setTitle(replacePlaceholders(parsed.title, member, guild, memberPosition, userCreated));
        if (parsed.description) embed.setDescription(replacePlaceholders(parsed.description, member, guild, memberPosition, userCreated));
        if (parsed.color) embed.setColor(parsed.color);
        if (parsed.thumbnail) {
            const thumb = replacePlaceholders(parsed.thumbnail, member, guild, memberPosition, userCreated);
            if (thumb === '{user_avatar}') embed.setThumbnail(userAvatar);
            else embed.setThumbnail(thumb);
        }
        if (parsed.image) embed.setImage(replacePlaceholders(parsed.image, member, guild, memberPosition, userCreated));
        if (parsed.footer) embed.setFooter({ text: replacePlaceholders(parsed.footer, member, guild, memberPosition, userCreated) });
        if (parsed.timestamp) embed.setTimestamp();
        if (parsed.fields && Array.isArray(parsed.fields)) {
            parsed.fields.forEach(field => {
                embed.addFields({
                    name: replacePlaceholders(field.name, member, guild, memberPosition, userCreated),
                    value: replacePlaceholders(field.value, member, guild, memberPosition, userCreated),
                    inline: field.inline || false
                });
            });
        }

        const components = [];
        if (parsed.buttons && Array.isArray(parsed.buttons) && parsed.buttons.length > 0) {
            const row = new ActionRowBuilder();
            parsed.buttons.forEach(btn => {
                if (btn.label && btn.url) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel(replacePlaceholders(btn.label, member, guild, memberPosition, userCreated))
                            .setURL(replacePlaceholders(btn.url, member, guild, memberPosition, userCreated))
                            .setStyle(ButtonStyle.Link)
                    );
                }
            });
            if (row.components.length > 0) components.push(row);
        }

        return { embeds: [embed], components };
    } catch (e) {
        // Case 4: Not JSON and not [text] -> Plain Text Message (Fallback)
        const content = replacePlaceholders(messageTemplate, member, guild, memberPosition, userCreated);
        return { content };
    }
}

async function buildGoodbyeMessage(messageTemplate, member, guild) {
    const memberPosition = guild.members.cache.size;
    const userCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`;
    const userAvatar = member.user.displayAvatarURL({ dynamic: true, size: 256 });

    // Case 1: Empty messageTemplate or [blank] -> Default Embed
    if (!messageTemplate || messageTemplate.trim() === '' || messageTemplate === '[blank]') {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`Tạm biệt!`)
            .setDescription(`**${member.user.username}** đã rời khỏi **${guild.name}**.\nChúng tôi hy vọng bạn sẽ sớm quay lại!`)
            .setThumbnail(userAvatar)
            .addFields(
                { name: '👥 Số thành viên còn lại', value: `${guild.members.cache.filter(m => !m.user.bot).size}`, inline: true }
            )
            .setFooter({ text: guild.name })
            .setTimestamp();
        return { embeds: [embed] };
    }

    // Case 2: Starts with [text] -> Plain Text Message
    if (messageTemplate.startsWith('[text]')) {
        const textContent = messageTemplate.substring(6).trim();
        const content = replacePlaceholdersGoodbye(textContent, member, guild, memberPosition, userCreated);
        return { content };
    }

    // Case 3: Try to parse as JSON for custom embed
    try {
        const parsed = JSON.parse(messageTemplate);
        const embed = new EmbedBuilder();

        if (parsed.title) embed.setTitle(replacePlaceholdersGoodbye(parsed.title, member, guild, memberPosition, userCreated));
        if (parsed.description) embed.setDescription(replacePlaceholdersGoodbye(parsed.description, member, guild, memberPosition, userCreated));
        if (parsed.color) embed.setColor(parsed.color);
        if (parsed.thumbnail) {
            const thumb = replacePlaceholdersGoodbye(parsed.thumbnail, member, guild, memberPosition, userCreated);
            if (thumb === '{user_avatar}') embed.setThumbnail(userAvatar);
            else embed.setThumbnail(thumb);
        }
        if (parsed.image) embed.setImage(replacePlaceholdersGoodbye(parsed.image, member, guild, memberPosition, userCreated));
        if (parsed.footer) embed.setFooter({ text: replacePlaceholdersGoodbye(parsed.footer, member, guild, memberPosition, userCreated) });
        if (parsed.timestamp) embed.setTimestamp();
        if (parsed.fields && Array.isArray(parsed.fields)) {
            parsed.fields.forEach(field => {
                embed.addFields({
                    name: replacePlaceholdersGoodbye(field.name, member, guild, memberPosition, userCreated),
                    value: replacePlaceholdersGoodbye(field.value, member, guild, memberPosition, userCreated),
                    inline: field.inline || false
                });
            });
        }

        return { embeds: [embed] };
    } catch (e) {
        // Case 4: Not JSON and not [text] -> Plain Text Message (Fallback)
        const content = replacePlaceholdersGoodbye(messageTemplate, member, guild, memberPosition, userCreated);
        return { content };
    }
}

module.exports = {
    buildWelcomeMessage,
    buildGoodbyeMessage,
};
