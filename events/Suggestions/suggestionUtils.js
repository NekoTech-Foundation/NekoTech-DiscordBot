const Suggestion = require('../../models/Suggestion');

const suggestionUtils = {
    /**
     * Retrieves a suggestion from the database by its ID.
     * @param {String} suggestionId - The ID of the suggestion.
     * @returns {Promise<Object>} The suggestion document.
     */
    getSuggestionById: async function (suggestionId) {
        try {
            const suggestion = await Suggestion.findById(suggestionId);
            return suggestion;
        } catch (error) {
            console.error('Error fetching suggestion:', error);
            throw error;
        }
    },

    /**
     * Checks if a user has already voted on a suggestion.
     * @param {Object} suggestion - The suggestion document.
     * @param {String} userId - The ID of the user.
     * @returns {Boolean} True if the user has voted, false otherwise.
     */
    hasUserVoted: function (suggestion, userId) {
        return suggestion.voters.some(voter => voter.userId === userId);
    },

    /**
     * Gets the type of vote a user has cast on a suggestion.
     * @param {Object} suggestion - The suggestion document.
     * @param {String} userId - The ID of the user.
     * @returns {String|null} The vote type ('upvote' or 'downvote'), or null if the user hasn't voted.
     */
    getUserVoteType: function (suggestion, userId) {
        const voter = suggestion.voters.find(voter => voter.userId === userId);
        return voter ? voter.voteType : null;
    },

    /**
     * Removes a user's vote from a suggestion.
     * @param {Object} suggestion - The suggestion document.
     * @param {String} userId - The ID of the user whose vote is being removed.
     */
    removeVote: async function (suggestion, userId) {
        const voterIndex = suggestion.voters.findIndex(voter => voter.userId === userId);
        if (voterIndex !== -1) {
            const voteType = suggestion.voters[voterIndex].voteType;
            suggestion.voters.splice(voterIndex, 1);
            if (voteType === 'upvote') {
                suggestion.upvotes--;
            } else if (voteType === 'downvote') {
                suggestion.downvotes--;
            }
            await suggestion.save();
        }
    },

    /**
     * Adds a vote to a suggestion.
     * @param {Object} suggestion - The suggestion document.
     * @param {String} userId - The ID of the user who is voting.
     * @param {String} voteType - The type of vote ('upvote' or 'downvote').
     */
    addVote: async function (suggestion, userId, voteType) {
        suggestion.voters.push({ userId, voteType });
        if (voteType === 'upvote') {
            suggestion.upvotes++;
        } else if (voteType === 'downvote') {
            suggestion.downvotes++;
        }
        await suggestion.save();
    }
};

module.exports = suggestionUtils;