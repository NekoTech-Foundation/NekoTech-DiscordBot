const moment = require('moment-timezone');

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function resolveProperty(obj, path) {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
    }, obj);
}

async function parsePlaceholders(text, message) {
    const user = message.member;
    const server = message.guild;
    const channel = message.channel;

    // Helper to get nested properties safely
    const getValue = (path) => {
        // Base objects mapping
        if (path.startsWith('user.')) return resolveProperty(user, path.substring(5));
        if (path.startsWith('server.')) return resolveProperty(server, path.substring(7));
        if (path.startsWith('channel.')) return resolveProperty(channel, path.substring(8));
        if (path.startsWith('message.')) return resolveProperty(message, path.substring(8));
        return undefined;
    };

    // Regex to match {path.to.property}
    const placeholderRegex = /{([a-zA-Z0-9_.]+)}/g;

    let parsedText = text.replace(placeholderRegex, (match, key) => {
        // 1. Try dynamic nested resolution first
        let value = getValue(key);

        // 2. Map explicit complex values if needed (backward compatibility or shortcuts)
        if (value === undefined) {
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'user') return user.toString();
            if (lowerKey === 'user_id') return user.id;
            if (lowerKey === 'user_name') return user.user.username; // Updated to username
            if (lowerKey === 'user_tag') return user.user.tag;
            if (lowerKey === 'server_name') return server.name;
            if (lowerKey === 'server_membercount') return server.memberCount;
            // ... Add specific formatting helpers that aren't direct properties
            if (lowerKey === 'server_icon') return server.iconURL();
            if (lowerKey === 'user_avatar') return user.user.displayAvatarURL();
            if (lowerKey === 'channel_mention') return channel.toString();
        }

        // 3. Handle specific formatted dates or calculated values
        if (key === 'user.joinedAtFormatted') return moment(user.joinedTimestamp).format('HH:mm:ss DD/MM/YYYY');
        if (key === 'server.createdAtFormatted') return moment(server.createdTimestamp).format('HH:mm:ss DD/MM/YYYY');

        return value !== undefined ? value : match;
    });

    return parsedText;
}

module.exports = { parsePlaceholders };
