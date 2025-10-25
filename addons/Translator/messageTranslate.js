const { translateText, createTranslationEmbed } = require('./translatorUtils');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

module.exports.run = async (client) => {
    console.log('[DichThuat] Initializing...');
    
    const config = yaml.load(fs.readFileSync(path.join(__dirname, 'config.yml'), 'utf8'));

    client.on('messageCreate', async (message) => {
        if (!message.content.startsWith(config.prefix)) return;
        if (!message.reference?.messageId) return;
    
        const args = message.content.slice(config.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
    
        if (command !== 'translate') return;
    
        const targetLang = args[0];
        if (!targetLang) {
            return await message.reply('Hãy chọn ngôn ngữ đích.');
        }
    
        const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
        const translated = await translateText(referencedMessage.content, targetLang);
    
        if (translated) {
            const embed = createTranslationEmbed(
                referencedMessage.content,
                translated,
                'auto',
                targetLang
            );
            await message.reply({ embeds: [embed] });
            
            if (config.delete_command) {
                try {
                    await message.delete();
                } catch (error) {
                    console.error('[TranslatorAddon] Failed to delete command message:', error);
                }
            }
        }
    });

    console.log('[TranslatorAddon] Ready!');
};

module.exports.cleanup = async () => {
    console.log('[TranslatorAddon] Cleaned up!');
};