const processDonation = require('./processDonation');

module.exports = {
    name: 'messageUpdate',
    async run(oldMessage, newMessage) {
        // If the message is partial, fetch it first if possible
        if (newMessage.partial) {
            try {
                await newMessage.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message: ', error);
                return;
            }
        }
        await processDonation(newMessage);
    }
};
