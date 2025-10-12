module.exports = {
    run: async (client) => {
        
        client.on('messageCreate', (message) => {
            if (message.author.bot) return;
            
            if (message.content.toLowerCase() === '!example') {
                message.reply('Example addon is working correctly!');
            }
        });
    }
};