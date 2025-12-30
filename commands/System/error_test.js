module.exports = {
    name: 'errortest',
    description: 'Test Error Reporting',
    type: 1,
    options: [],
    run: async (client, message, args) => {
        throw new Error("This is a simulated error for testing! 123");
    },
    execute: async (interaction, client) => {
        throw new Error("This is a simulated Slash Command error! 456");
    }
};
