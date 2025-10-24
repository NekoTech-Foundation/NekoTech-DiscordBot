const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lennyface')
        .setDescription('Lấy một khuôn mặt lenny ngẫu nhiên'),
    category: 'Fun',
    async execute(interaction, client) {
        const lennyFaces = [
            "( ͡° ͜ʖ ͡°)",
            "ʘ‿ʘ",
            "(◑‿◐)",
            "( ͡~ ͜ʖ ͡°)",
            "( ° ͜ʖ °)",
            "( ͠° ͟ʖ ͡°)",
            "(͠≖ ͜ʖ͠≖)",
            "ʕ ͡° ʖ̯ ͡°ʔ",
            "(◕‿◕)╭∩╮",
            "( ͡ʘ ͜ʖ ͡ʘ)",
            "( ͡° ᴥ ͡°)",
            "( ͡♥ ͜ʖ ͡♥)",
            "( ͡ ͡° ͜つ ͡͡° )",
            "(☭ ͜ʖ ☭)",
            "༼ ͡ ◕ ͜ ʖ ◕͡ ༽",
            "( ͡°╭͜ʖ╮ ͡°)",
            "¯\\_(ツ)_/¯",
            "¯\\_( ͡° ͜ʖ ͡°)_/¯",
            "凸༼ຈل͜ຈ༽凸",
            "( ͡° ل͜ ͡°)",
            "(͡• ͜໒ ͡• )",
            "(☞ ͡° ͜ʖ ͡°)☞",
            "( ͝° ͜ʖ͡°)",
            "┏(-_-)┛",
            "( ಠ ͜ʖಠ)",
            "( ͡ಥ ͜ʖ ͡ಥ)",
            "ಥ_ಥ",
            "(ಠ_ರೃ)",
            "( ͡ຈ╭͜ʖ╮͡ຈ )",
            "ᕙ(▀̿ĺ̯▀̿ ̿)ᕗ",
            "( ͡° ͜ʖ ͡°)╭∩╮",
            "(✿❦ ͜ʖ ❦)",
            "(✿ ♡‿♡)",
            "♥╣[-_-]╠♥",
            "(-‿◦☀)",
            "(⌐□_□)",
            "( ͡°👅 ͡°)",
            "╲⎝⧹ ( ͡° ͜ʖ ͡°) ⎠╱",
            "[̲̅$̲̅(̲̅ ͡° ͜ʖ ͡°̲̅)̲̅$̲̅]",
            "(╬ಠ益ಠ)",
            "( ◔ ʖ̯ ◔ )",
            "◕‿↼",
            "( ͡°( ͡° ͜ʖ( ͡° ͜ʖ ͡°)ʖ ͡°) ͡°)",
            "( ཀ ʖ̯ ཀ)",
            "(｢•-•)｢ ʷʱʸ?"
          ];

        const randomLenny = lennyFaces[Math.floor(Math.random() * lennyFaces.length)];

        await interaction.reply(randomLenny);
    }
}
