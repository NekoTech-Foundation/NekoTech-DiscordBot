const VotingSession = require('../models/VotingSession');

module.exports = async (client, reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    const { message } = reaction;
    if (!message.guild) return;

    // Check if there is an active session in this channel
    // We assume only one active session per channel for simplicity, or we filter by startMessageId
    // Optimization: we could cache active sessions in memory
    const sessions = await VotingSession.find({
        guildId: message.guild.id,
        channelId: message.channel.id,
        status: 'ACTIVE'
    });

    if (!sessions || sessions.length === 0) return;

    // Determine if the message falls within the session's scope
    // From prompt: "from_message" means count messages AFTER this ID.
    // If startMessageId is set, we check if this message is newer.

    // There could be multiple sessions in one channel? Ideally one.
    // Let's take the most recent active session for the channel.
    const session = sessions[sessions.length - 1]; // Assuming simpler logical flow

    if (session.startMessageId) {
        if (message.id <= session.startMessageId) return; // Ignore messages before or equal to start point
    }

    const config = session.config;
    const member = await message.guild.members.fetch(user.id).catch(() => null);

    if (!member) return;

    // Rule: Allow Bot Vote
    if (!config.allowBotVote && user.bot) {
        await reaction.users.remove(user.id);
        return;
    }

    // Rule: Self Vote
    if (!config.allowSelfVote && message.author.id === user.id) {
        await reaction.users.remove(user.id);
        // Optional: Notify user
        return;
    }

    // Rule: Blacklist/Whitelist Roles
    if (config.blockedRoles && config.blockedRoles.length > 0) {
        if (member.roles.cache.some(r => config.blockedRoles.includes(r.id))) {
            await reaction.users.remove(user.id);
            return;
        }
    }

    if (config.allowedRoles && config.allowedRoles.length > 0) {
        if (!member.roles.cache.some(r => config.allowedRoles.includes(r.id))) {
            await reaction.users.remove(user.id);
            return;
        }
    }

    // Rule: Account Age
    if (config.minAccountAge > 0) {
        const accountAge = Date.now() - user.createdTimestamp;
        if (accountAge < config.minAccountAge) {
            await reaction.users.remove(user.id);
            return;
        }
    }

    // Rule: Join Server Time
    if (config.joinServerTime > 0) {
        const joinTime = Date.now() - member.joinedTimestamp;
        if (joinTime < config.joinServerTime) {
            await reaction.users.remove(user.id);
            return;
        }
    }

    // Rule: Max Votes Per User
    if (config.maxVotesPerUser > 0) {
        // We need to check how many votes the user has currently cast in this session (channel/timeframe)
        // This is expensive to check every time by fetching all messages.
        // We rely on the `votes` tracking in the session model or just rudimentary checks.
        // For accurate checks, we might need to store the user's vote count in the session document.

        let currentVotes = session.votes[user.id] || [];

        // Filter out stale votes if we want, or just assume the array is accurate-ish.
        // Since reaction removal (manual) needs to update this, we need messageReactionRemove too.

        if (currentVotes.length >= config.maxVotesPerUser) {
            // Already hit limit
            await reaction.users.remove(user.id);
            return;
        }

        // Add this vote
        if (!currentVotes.includes(message.id)) {
            currentVotes.push(message.id);
            session.votes[user.id] = currentVotes;

            // Update DB
            // SQLiteModel update might be tricky with nested objects, ensuring we essentially overwrite.
            await VotingSession.findOneAndUpdate(
                { sessionId: session.sessionId },
                { votes: session.votes }
            );
        }
    }
};
