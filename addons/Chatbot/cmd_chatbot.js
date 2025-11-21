const { SlashCommandBuilder } = require('discord.js');
const { getCommands } = require('../../utils/configLoader');
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
        const enabledCommands = getCommands();
        if (enabledCommands && enabledCommands.chatbot === false) {
            return interaction.reply({ content: 'Lệnh này đang bị tắt.', ephemeral: true });
        }

        const prompt = interaction.options.getString('prompt', true);
        const isPrivate = interaction.options.getBoolean('private') || false;
        await chatbot.handleChatbot(interaction, prompt, { ephemeral: isPrivate });
    }
};

