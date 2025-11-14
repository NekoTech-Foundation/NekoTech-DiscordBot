const { EmbedBuilder } = require('discord.js');

const COLORS = {
    success: '#22c55e',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#facc15',
    neutral: '#6b7280'
};

function baseEmbed(type = 'info') {
    const color = COLORS[type] || COLORS.info;
    return new EmbedBuilder().setColor(color);
}

function buildEmbed(type, { title, description, fields, footer, author, thumbnail, image } = {}) {
    const embed = baseEmbed(type);

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (Array.isArray(fields) && fields.length > 0) embed.addFields(fields);

    if (author && (author.name || author.iconURL)) {
        embed.setAuthor({
            name: author.name || null,
            iconURL: author.iconURL || null
        });
    }

    if (footer && (footer.text || footer.iconURL)) {
        embed.setFooter({
            text: footer.text || null,
            iconURL: footer.iconURL || null
        });
    }

    if (thumbnail) {
        embed.setThumbnail(thumbnail);
    }

    if (image) {
        embed.setImage(image);
    }

    return embed;
}

function success(options = {}) {
    return buildEmbed('success', options);
}

function error(options = {}) {
    return buildEmbed('error', options);
}

function info(options = {}) {
    return buildEmbed('info', options);
}

function warning(options = {}) {
    return buildEmbed('warning', options);
}

function neutral(options = {}) {
    return buildEmbed('neutral', options);
}

module.exports = {
    success,
    error,
    info,
    warning,
    neutral
};

