const processDonation = require('./processDonation');

module.exports = {
    name: 'messageCreate',
    async run(message) {
        await processDonation(message);
    }
};
