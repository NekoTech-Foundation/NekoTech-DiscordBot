const { SlashCommandBuilder } = require('discord.js');
const { getCommands } = require('../../../utils/configLoader');
const { getLang } = require('../../../utils/langLoader');
const chatbot = require('./chatbot');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chatbot')
        .setDescription('🤖 Trò chuyện thông minh cùng AI (Gemini)')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('💬 Nội dung bạn muốn hỏi')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('private')
                .setDescription('🔒 Chỉ mình bạn thấy phản hồi (ephemeral)')),
    async execute(interaction) {
        const lang = await getLang(interaction.guild.id);
        const chatbotLang = lang.Addons.Chatbot;
        const enabledCommands = getCommands();
        if (enabledCommands && enabledCommands.chatbot === false) {
            return interaction.reply({ content: chatbotLang.UI.Disabled, ephemeral: true });
        }

        const prompt = interaction.options.getString('prompt', true);
        const isPrivate = interaction.options.getBoolean('private') || false;
        await chatbot.handleChatbot(interaction, prompt, { ephemeral: isPrivate });
    }
};

