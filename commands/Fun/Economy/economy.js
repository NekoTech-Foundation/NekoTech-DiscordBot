const { EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const { getConfig } = require('../../../utils/configLoader.js');

const config = getConfig();

module.exports = {
    name: 'economy',

    description: 'Economy management commands (Owner only)',
    usage: '!economy <give|take|set|reset> <user> [amount] [type]',
    
    async run(client, message, args) {
        // Kiểm tra quyền owner từ config
        const ownerIDs = config.OwnerIDs || [];
        if (!ownerIDs.includes(message.author.id)) {
            return message.reply('❌ Chỉ có owner bot (được cấu hình trong config.yml) mới có thể sử dụng lệnh này!');
        }

        const subcommand = args[0]?.toLowerCase();
        
        if (!subcommand || !['give', 'take', 'set', 'reset'].includes(subcommand)) {
            return message.reply('❌ Sử dụng: `!economy <give|take|set|reset> <userID> [amount] [type]`\nVí dụ: `!economy give 123456789 1000 balance`');
        }

        // Lấy user ID
        const userId = args[1];
        if (!userId || !/^\d{17,19}$/.test(userId)) {
            return message.reply('❌ User ID không hợp lệ! Sử dụng: `!economy <subcommand> <userID>`\nVí dụ: `!economy give 123456789 1000`');
        }
        
        // Fetch user từ ID
        let targetUser;
        try {
            targetUser = await message.client.users.fetch(userId);
        } catch (error) {
            return message.reply('❌ Không tìm thấy người dùng với ID này!');
        }

        switch (subcommand) {
            case 'give':
                await handleGive(message, targetUser, args);
                break;
            case 'take':
                await handleTake(message, targetUser, args);
                break;
            case 'set':
                await handleSet(message, targetUser, args);
                break;
            case 'reset':
                await handleReset(message, targetUser);
                break;
        }
    }
};

async function handleGive(message, targetUser, args) {
    const amount = parseInt(args[2]);
    const type = args[3]?.toLowerCase() || 'balance';

    if (isNaN(amount) || amount <= 0) {
        return message.reply('❌ Số tiền phải là số dương!');
    }

    if (!['balance', 'bank', 'both'].includes(type)) {
        return message.reply('❌ Type phải là: `balance`, `bank`, hoặc `both`');
    }

    let userData = await EconomyUserData.findOne({
        userId: targetUser.id
    });

    if (!userData) {
        userData = await EconomyUserData.create({
            userId: targetUser.id,
            balance: 0,
            bank: 0
        });
    }

    const currency = config.Currency || '💰';

    if (type === 'balance' || type === 'both') {
        userData.balance += amount;
    }
    if (type === 'bank' || type === 'both') {
        userData.bank += amount;
    }

    await userData.save();

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Đã Thêm Tiền')
        .setDescription(
            `**Người nhận:** ${targetUser}\n` +
            `**Số tiền:** ${amount.toLocaleString()} ${currency}\n` +
            `**Loại:** ${type === 'both' ? 'Cả hai' : type === 'balance' ? 'Số dư' : 'Ngân hàng'}\n\n` +
            `**Số dư mới:**\n` +
            `💰 Tiền mặt: ${userData.balance.toLocaleString()} ${currency}\n` +
            `🏦 Ngân hàng: ${userData.bank.toLocaleString()} ${currency}`
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleTake(message, targetUser, args) {
    const amount = parseInt(args[2]);
    const type = args[3]?.toLowerCase() || 'balance';

let userData = await EconomyUserData.findOne({
        userId: targetUser.id
    });

    if (!userData) {
        return message.reply('❌ Người dùng chưa có dữ liệu economy!');
    }

    const currency = config.Currency || '💰';

    if (type === 'balance' || type === 'both') {
        userData.balance = Math.max(0, userData.balance - amount);
    }
    if (type === 'bank' || type === 'both') {
        userData.bank = Math.max(0, userData.bank - amount);
    }

    await userData.save();

    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('✅ Đã Lấy Tiền')
        .setDescription(
            `**Người bị lấy:** ${targetUser}\n` +
            `**Số tiền:** ${amount.toLocaleString()} ${currency}\n` +
            `**Loại:** ${type === 'both' ? 'Cả hai' : type === 'balance' ? 'Số dư' : 'Ngân hàng'}\n\n` +
            `**Số dư mới:**\n` +
            `💰 Tiền mặt: ${userData.balance.toLocaleString()} ${currency}\n` +
            `🏦 Ngân hàng: ${userData.bank.toLocaleString()} ${currency}`
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleSet(message, targetUser, args) {
    const amount = parseInt(args[2]);
    const type = args[3]?.toLowerCase() || 'balance';

    if (isNaN(amount) || amount < 0) {
        return message.reply('❌ Số tiền phải là số không âm!');
    }

    if (!['balance', 'bank', 'both'].includes(type)) {
        return message.reply('❌ Type phải là: `balance`, `bank`, hoặc `both`');
    }

    let userData = await EconomyUserData.findOne({
        userId: targetUser.id
    });

    if (!userData) {
        userData = await EconomyUserData.create({
            userId: targetUser.id,
            balance: 0,
            bank: 0
        });
    }

    const currency = config.Currency || '💰';

    if (type === 'balance' || type === 'both') {
        userData.balance = amount;
    }
    if (type === 'bank' || type === 'both') {
        userData.bank = amount;
    }

    await userData.save();

    const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('✅ Đã Đặt Tiền')
        .setDescription(
            `**Người dùng:** ${targetUser}\n` +
            `**Số tiền đặt:** ${amount.toLocaleString()} ${currency}\n` +
            `**Loại:** ${type === 'both' ? 'Cả hai' : type === 'balance' ? 'Số dư' : 'Ngân hàng'}\n\n` +
            `**Số dư mới:**\n` +
            `💰 Tiền mặt: ${userData.balance.toLocaleString()} ${currency}\n` +
            `🏦 Ngân hàng: ${userData.bank.toLocaleString()} ${currency}`
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleReset(message, targetUser) {
    let userData = await EconomyUserData.findOne({
        userId: targetUser.id
    });

    if (!userData) {
        return message.reply('❌ Người dùng chưa có dữ liệu economy!');
    }

    userData.balance = 0;
    userData.bank = 0;
    userData.inventory = [];
    userData.daily = {
        lastClaimed: null,
        streak: 0
    };

    await userData.save();

    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('✅ Đã Reset Economy')
        .setDescription(
            `**Người dùng:** ${targetUser}\n\n` +
            `Đã reset toàn bộ dữ liệu economy của người dùng này!`
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}
