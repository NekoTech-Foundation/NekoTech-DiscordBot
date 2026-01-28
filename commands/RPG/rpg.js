const { SlashCommandBuilder } = require('discord.js');
const RPGController = require('../../utils/rpg/RPGController');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rpg')
        .setDescription('Hệ thống RPG Neko')
        // Core
        .addSubcommand(sub =>
            sub.setName('hunt')
                .setDescription('Đi săn thú (Hunt animals)'))
        .addSubcommand(sub =>
            sub.setName('zoo')
                .setDescription('Xem thú cưng của bạn (View Zoo)')
                .addUserOption(opt => opt.setName('user').setDescription('Xem của người khác')))
        .addSubcommand(sub =>
            sub.setName('inv')
                .setDescription('Xem túi đồ (Inventory)'))
        .addSubcommand(sub =>
            sub.setName('equip')
                .setDescription('Trang bị vật phẩm (Equip Item)')
                .addStringOption(opt => opt.setName('item').setDescription('Tên hoặc ID vật phẩm').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('battle')
                .setDescription('Chiến đấu với quái vật (Battle Mob)')
                .addStringOption(opt => opt.setName('target').setDescription('Tên quái vật (để trống sẽ random)')))

        // Management
        .addSubcommand(sub =>
            sub.setName('sell')
                .setDescription('Bán thú cưng lấy vàng (Sell Animal)')
                .addIntegerOption(opt => opt.setName('index').setDescription('Số thứ tự thú trong Zoo (xem /rpg zoo)').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('sacrifice')
                .setDescription('Hiến tế thú cưng lấy nguyên liệu (Sacrifice Animal)')
                .addIntegerOption(opt => opt.setName('index').setDescription('Số thứ tự thú').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('rename')
                .setDescription('Đổi tên thú cưng (Rename Animal)')
                .addIntegerOption(opt => opt.setName('index').setDescription('Số thứ tự thú').setRequired(true))
                .addStringOption(opt => opt.setName('name').setDescription('Tên mới').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('team')
                .setDescription('Cài đặt đội hình chiến đấu (Set Team)')
                .addIntegerOption(opt => opt.setName('slot1').setDescription('Thú vị trí 1 (Zoo Index)'))
                .addIntegerOption(opt => opt.setName('slot2').setDescription('Thú vị trí 2 (Zoo Index)'))
                .addIntegerOption(opt => opt.setName('slot3').setDescription('Thú vị trí 3 (Zoo Index)')))
        .addSubcommand(sub =>
            sub.setName('dismantle')
                .setDescription('Phân giải trang bị (Dismantle Item)'))

        // Advanced
        .addSubcommand(sub =>
            sub.setName('autohunt')
                .setDescription('Tự động săn (AFK/Idle Mode)'))
        .addSubcommand(sub =>
            sub.setName('nekodex')
                .setDescription('Xem từ điển thú đã bắt (Collection Log)'))
        .addSubcommand(sub =>
            sub.setName('lootbox')
                .setDescription('Mở hộp quà may mắn (Lootbox/Crate)')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Loại hộp')
                        .addChoices(
                            { name: 'Pet Lootbox', value: 'lootbox' },
                            { name: 'Weapon Crate', value: 'crate' }
                        )))
        .addSubcommand(sub =>
            sub.setName('battlesetting')
                .setDescription('Cài đặt chiến đấu (Auto Skill, Potion...)')
                .addBooleanOption(opt => opt.setName('autoskill').setDescription('Tự dùng kỹ năng?'))),

    category: 'RPG',

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        try {
            switch (sub) {
                // Core
                case 'hunt': await RPGController.hunt(interaction); break;
                case 'zoo': await RPGController.zoo(interaction); break;
                case 'inv': await RPGController.inventory(interaction); break;
                case 'equip': await RPGController.equip(interaction); break;
                case 'battle': await RPGController.battle(interaction); break;

                // Management
                case 'sell': await RPGController.sell(interaction); break;
                case 'sacrifice': await RPGController.sacrifice(interaction); break;
                case 'rename': await RPGController.rename(interaction); break;
                case 'team': await RPGController.team(interaction); break;
                case 'dismantle': await RPGController.dismantle(interaction); break;

                // Advanced
                case 'autohunt': await RPGController.autohunt(interaction); break;
                case 'nekodex': await RPGController.nekodex(interaction); break;
                case 'lootbox': await RPGController.lootbox(interaction); break;
                case 'battlesetting': await RPGController.battlesetting(interaction); break;

                default:
                    await interaction.reply({ content: 'Lệnh không tồn tại.', ephemeral: true });
            }
        } catch (err) {
            console.error(err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Có lỗi xảy ra khi thực hiện lệnh RPG.', ephemeral: true });
            }
        }
    }
};
