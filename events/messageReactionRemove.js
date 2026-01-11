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

    const sessions = await VotingSession.find({
        guildId: message.guild.id,
        channelId: message.channel.id,
        status: 'ACTIVE'
    });

    if (!sessions || sessions.length === 0) return;
    const session = sessions[sessions.length - 1];

    if (session.startMessageId) {
        if (message.id <= session.startMessageId) return;
    }

    // If tracking limits, we need to remove the vote from the tracking
    if (session.config.maxVotesPerUser > 0) {
        let currentVotes = session.votes[user.id] || [];
        if (currentVotes.includes(message.id)) {
            currentVotes = currentVotes.filter(msgId => msgId !== message.id);
            session.votes[user.id] = currentVotes;

            await VotingSession.findOneAndUpdate(
                { sessionId: session.sessionId },
                { votes: session.votes }
            );
        }
    }
};
