const moment = require('moment-timezone');

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

async function parsePlaceholders(text, message) {
    const user = message.member;
    const server = message.guild;
    const channel = message.channel;

    const placeholders = {
        // User placeholders
        '{user}': user.toString(),
        '{user_id}': user.id,
        '{user_name}': user.user.tag,
        '{user_mention}': user.toString(),
        '{user_displayname}': user.displayName,
        '{user_avatar}': user.user.displayAvatarURL(),
        '{user_nick}': user.nickname || user.displayName,
        '{user_joindate}': Math.floor(user.joinedTimestamp / 1000),
        '{user_joindate_formatted}': moment(user.joinedTimestamp).format('HH:mm:ss DD/MM/YYYY'),
        '{user_createdate}': Math.floor(user.user.createdTimestamp / 1000),
        '{user_createdate_formatted}': moment(user.user.createdTimestamp).format('HH:mm:ss DD/MM/YYYY'),
        '{user_displaycolor}': user.displayHexColor,
        '{user_boostsince}': user.premiumSinceTimestamp ? Math.floor(user.premiumSinceTimestamp / 1000) : 'Not boosting',
        '{user_boostsince_formatted}': user.premiumSinceTimestamp ? moment(user.premiumSinceTimestamp).format('HH:mm:ss DD/MM/YYYY') : 'Not boosting',

        // Server placeholders
        '{server_id}': server.id,
        '{server_name}': server.name,
        '{server_membercount}': server.memberCount,
        '{server_membercount_ordinal}': getOrdinal(server.memberCount),
        '{server_membercount_nobots}': server.members.cache.filter(m => !m.user.bot).size,
        '{server_membercount_nobots_ordinal}': getOrdinal(server.members.cache.filter(m => !m.user.bot).size),
        '{server_botcount}': server.members.cache.filter(m => m.user.bot).size,
        '{server_botcount_ordinal}': getOrdinal(server.members.cache.filter(m => m.user.bot).size),
        '{server_icon}': server.iconURL(),
        '{server_rolecount}': server.roles.cache.size,
        '{server_channelcount}': server.channels.cache.size,
        '{server_owner}': (await server.fetchOwner()).user.tag,
        '{server_owner_id}': server.ownerId,
        '{server_createdate}': Math.floor(server.createdTimestamp / 1000),
        '{server_createdate_formatted}': moment(server.createdTimestamp).format('HH:mm:ss DD/MM/YYYY'),
        '{server_boostlevel}': server.premiumTier,
        '{server_boostcount}': server.premiumSubscriptionCount,

        // Channel & Message placeholders
        '{channel_name}': channel.name,
        '{channel_id}': channel.id,
        '{channel_mention}': channel.toString(),
        '{channel_createdate}': Math.floor(channel.createdTimestamp / 1000),
        '{channel_createdate_formatted}': moment(channel.createdTimestamp).format('HH:mm:ss DD/MM/YYYY'),
        '{message_link}': message.url,
        '{message_id}': message.id,
        '{message_content}': message.content,
    };

    let parsedText = text;
    for (const placeholder in placeholders) {
        const regex = new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        parsedText = parsedText.replace(regex, await placeholders[placeholder]);
    }

    return parsedText;
}

module.exports = { parsePlaceholders };
