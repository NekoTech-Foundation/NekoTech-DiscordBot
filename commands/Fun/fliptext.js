const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getConfig, getLang } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const mapping = '¡"#$%⅋,)(*+\' - ˙/0ƖᄅƐㄣϛ9ㄥ86:;<=>?@∀qƆpƎℲפHIſʞ˥WNOԀQɹS┴∩ΛMX⅄Z[/]^_`ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz{|}~';
const OFFSET = '!'.charCodeAt(0);

function convertSimplePatternToRegex(simplePattern) {
    let regexPattern = simplePattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`, 'i');
}

async function checkBlacklistWords(content) {
    const blacklistRegex = config.BlacklistWords.Patterns.map(pattern => convertSimplePatternToRegex(pattern));
    return blacklistRegex.some(regex => regex.test(content));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fliptext')
        .setDescription('Lật ngược văn bản')
        .addStringOption(option => option.setName('text').setDescription('Văn bản để lật ngược').setRequired(true)),
    category: 'Fun',
    async execute(interaction, client) {
        try {
            let text = interaction.options.getString("text");

            if (await checkBlacklistWords(text)) {
                const blacklistMessage = lang.BlacklistWords && lang.BlacklistWords.Message
                    ? lang.BlacklistWords.Message.replace(/{user}/g, `${interaction.user}`)
                    : 'Văn bản của bạn chứa các từ bị cấm.';
                return interaction.reply({ content: blacklistMessage, ephemeral: true });
            }

            const flippedText = text.split('').map(c => c.charCodeAt(0) - OFFSET).map(c => mapping[c] || ' ').reverse().join('');
            interaction.reply({ content: flippedText });
        } catch (error) {
            console.error("Lỗi trong lệnh lật văn bản: ", error);
            interaction.reply({ content: 'Xin lỗi, đã có lỗi khi lật văn bản.' });
        }
    }
};
