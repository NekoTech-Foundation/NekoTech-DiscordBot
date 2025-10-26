const { EmbedBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const vesoModule = require('./veso.js');

const ALLOWED_OWNERS = [
    '727497287777124414',
    '1316287191634149377',
    '710025322497572926',
    '808974657994752050'
];

module.exports = {
    name: 'veso',
    description: 'Quản lý vé số',
    async run(client, message, args) {
        if (args[0] !== 'tbketqua') return;

        if (!ALLOWED_OWNERS.includes(message.author.id)) {
            return message.reply('Bạn không có quyền sử dụng lệnh này.');
        }

        const configPath = path.join(__dirname, 'config.yml');
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        const { getConfig: getMainConfig } = require('../../utils/configLoader');
        const mainConfig = getMainConfig();
        const guildId = message.guild.id;

        try {
            await message.channel.send('Bắt đầu sổ xố...');
            await vesoModule.drawLottery(client, config, mainConfig, guildId);
            await message.channel.send('✅ Đã thực hiện sổ xố thành công! Kiểm tra kết quả bằng `!veso thongbao`');
        } catch (error) {
            console.error('[VeSo Force Draw] Error:', error);
            await message.reply('❌ Có lỗi xảy ra khi thực hiện sổ xố: ' + error.message);
        }
    }
};