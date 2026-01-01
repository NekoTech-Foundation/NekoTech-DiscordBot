const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const { getConfig } = require('../../../utils/configLoader');
const config = getConfig();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Quản lý kinh tế (Admin/Owner)')
        .addSubcommand(sub =>
            sub.setName('give')
                .setDescription('Cộng tiền cho người dùng')
                .addUserOption(opt => opt.setName('user').setDescription('Người dùng').setRequired(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền').setRequired(true))
                .addStringOption(opt => 
                    opt.setName('type')
                        .setDescription('Loại tiền')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Tiền mặt (Balance)', value: 'balance' },
                            { name: 'Ngân hàng (Bank)', value: 'bank' },
                            { name: 'Cả hai (Both)', value: 'both' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('take')
                .setDescription('Trừ tiền người dùng')
                .addUserOption(opt => opt.setName('user').setDescription('Người dùng').setRequired(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền').setRequired(true))
                .addStringOption(opt => 
                    opt.setName('type')
                        .setDescription('Loại tiền')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Tiền mặt (Balance)', value: 'balance' },
                            { name: 'Ngân hàng (Bank)', value: 'bank' },
                            { name: 'Cả hai (Both)', value: 'both' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Đặt tiền người dùng')
                .addUserOption(opt => opt.setName('user').setDescription('Người dùng').setRequired(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền').setRequired(true))
                .addStringOption(opt => 
                    opt.setName('type')
                        .setDescription('Loại tiền')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Tiền mặt (Balance)', value: 'balance' },
                            { name: 'Ngân hàng (Bank)', value: 'bank' },
                            { name: 'Cả hai (Both)', value: 'both' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('Reset toàn bộ dữ liệu kinh tế của người dùng')
                .addUserOption(opt => opt.setName('user').setDescription('Người dùng').setRequired(true))
        ),
    category: 'Economy',

    async execute(interaction) {
        // Check Owner/Admin Permission
        const ownerIDs = config.OwnerIDs || [];
        
        if (!ownerIDs.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: '❌ Bạn không có quyền sử dụng lệnh này.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const type = interaction.options.getString('type') || 'balance';
        const currency = config.Currency || '💰';

        let userData = await EconomyUserData.findOne({ userId: targetUser.id });
        if (!userData) {
            userData = await EconomyUserData.create({
                userId: targetUser.id,
                balance: 0,
                bank: 0
            });
        }

        const embed = new EmbedBuilder().setTimestamp();

        try {
            switch (subcommand) {
                case 'give':
                    if (amount <= 0) return interaction.reply({ content: '❌ Số tiền phải lớn hơn 0', flags: MessageFlags.Ephemeral });
                    
                    if (type === 'balance' || type === 'both') userData.balance += amount;
                    if (type === 'bank' || type === 'both') userData.bank += amount;
                    
                    embed.setColor('#00ff00')
                        .setTitle('✅ Đã Cộng Tiền')
                        .setDescription(`**Người nhận:** ${targetUser}\n**Số tiền:** ${amount.toLocaleString()} ${currency}\n**Loại:** ${type}`);
                    break;

                case 'take':
                    if (amount <= 0) return interaction.reply({ content: '❌ Số tiền phải lớn hơn 0', flags: MessageFlags.Ephemeral });

                    if (type === 'balance' || type === 'both') userData.balance = Math.max(0, userData.balance - amount);
                    if (type === 'bank' || type === 'both') userData.bank = Math.max(0, userData.bank - amount);

                    embed.setColor('#ff0000')
                        .setTitle('✅ Đã Trừ Tiền')
                        .setDescription(`**Người bị trừ:** ${targetUser}\n**Số tiền:** ${amount.toLocaleString()} ${currency}\n**Loại:** ${type}`);
                    break;

                case 'set':
                    if (amount < 0) return interaction.reply({ content: '❌ Số tiền không được âm', flags: MessageFlags.Ephemeral });

                    if (type === 'balance' || type === 'both') userData.balance = amount;
                    if (type === 'bank' || type === 'both') userData.bank = amount;

                    embed.setColor('#ffaa00')
                        .setTitle('✅ Đã Đặt Tiền')
                        .setDescription(`**Người dùng:** ${targetUser}\n**Số tiền:** ${amount.toLocaleString()} ${currency}\n**Loại:** ${type}`);
                    break;

                case 'reset':
                    userData.balance = 0;
                    userData.bank = 0;
                    userData.inventory = [];
                    userData.daily = { lastClaimed: null, streak: 0 };
                    
                    embed.setColor('#000000')
                        .setTitle('✅ Đã Reset Dữ Liệu')
                        .setDescription(`Dữ liệu kinh tế của ${targetUser} đã được reset về mặc định.`);
                    break;
            }

            await userData.save();
            
             // Add new balance info to embed
            embed.addFields({
                name: 'Số dư mới',
                value: `💰 Tiền mặt: ${userData.balance.toLocaleString()} ${currency}\n🏦 Ngân hàng: ${userData.bank.toLocaleString()} ${currency}`
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ Có lỗi xảy ra khi thực hiện lệnh.', flags: MessageFlags.Ephemeral });
        }
    }
};
