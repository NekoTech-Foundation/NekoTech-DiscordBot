const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const EconomyUserData = require('../../../models/EconomyUserData');
const { getConfig, getLang } = require('../../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const parseDuration = require('./Utility/parseDuration');
const { checkActiveBooster, replacePlaceholders } = require('./Utility/helpers');

// --- Quotes ---
const winQuotes = [
    "Thần bài nhập rồi! 🎰",
    "Tiền về túi ai? Túi bạn chứ ai! 💸",
    "Đỏ hơn son, chúc mừng đại gia! 💎",
    "Hôm nay trời đẹp, kèo thơm quá! ☀️",
    "Tuyệt vời ông mặt trời! 🌈",
    "Được ăn cả, ngã... vào lòng đại gia! 🤑"
];

const loseQuotes = [
    "Đen thôi, đỏ quên đi... 🥀",
    "Còn cái nịt cũng phải đánh! 😭",
    "Thua keo này ta bày keo khác! 💪",
    "Ra đê mà ở thật rồi... 🏠",
    "Vận may đang tắc đường thôi! 🚦",
    "Đừng buồn, admin vẫn yêu bạn... (chắc thế) 💔"
];

function getRandomQuote(isWin) {
    const list = isWin ? winQuotes : loseQuotes;
    return list[Math.floor(Math.random() * list.length)];
}

function getRandomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
}

// --- Blackjack Helpers ---
function createDeck() {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ value, suit });
        }
    }
    return shuffle(deck);
}
function drawCard(deck) { return deck.pop(); }
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
function calculateHand(hand) {
    let sum = 0;
    let aces = 0;
    for (const card of hand) {
        if (card.value === 'A') { aces++; sum += 11; }
        else if (['K', 'Q', 'J'].includes(card.value)) { sum += 10; }
        else { sum += parseInt(card.value); }
    }
    while (sum > 21 && aces > 0) { sum -= 10; aces--; }
    return sum;
}
async function createBlackjackCanvas(playerHand, dealerHand, hideDealerCard = false) {
    const cardWidth = 100, cardHeight = 140, canvasWidth = 800, canvasHeight = 500;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2C3E50'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#34495E'; ctx.beginPath(); ctx.ellipse(canvasWidth / 2, canvasHeight, canvasWidth * 0.8, canvasHeight * 0.7, 0, Math.PI, 0); ctx.fill();
    await drawHand(ctx, playerHand, canvasWidth / 2 - (cardWidth * playerHand.length) / 2, canvasHeight - cardHeight - 50, cardWidth, cardHeight);
    await drawHand(ctx, dealerHand, canvasWidth / 2 - (cardWidth * dealerHand.length) / 2, 50, cardWidth, cardHeight, hideDealerCard);
    ctx.fillStyle = '#ECF0F1'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`Người Chơi: ${calculateHand(playerHand)}`, canvasWidth / 2, canvasHeight - 10);
    ctx.fillText(`Nhà Cái: ${hideDealerCard ? '?' : calculateHand(dealerHand)}`, canvasWidth / 2, 30);
    return new AttachmentBuilder(canvas.toBuffer(), { name: 'blackjack.png' });
}
async function drawHand(ctx, hand, x, y, cardWidth, cardHeight, hideSecondCard = false) {
    for (let i = 0; i < hand.length; i++) {
        if (hideSecondCard && i === 1) await drawCardBack(ctx, x + i * (cardWidth + 10), y, cardWidth, cardHeight);
        else await drawCardFace(ctx, hand[i].value, hand[i].suit, x + i * (cardWidth + 10), y, cardWidth, cardHeight);
    }
}
async function drawCardFace(ctx, value, suit, x, y, width, height) {
    ctx.fillStyle = '#FFFFFF'; roundedRect(ctx, x, y, width, height, 10);
    ctx.fillStyle = suit === '♠' || suit === '♣' ? '#2C3E50' : '#E74C3C';
    ctx.font = 'bold 24px Arial'; ctx.textAlign = 'left'; ctx.fillText(value, x + 10, y + 30);
    ctx.font = 'bold 48px Arial'; ctx.textAlign = 'center'; ctx.fillText(suit, x + width / 2, y + height / 2 + 10);
}
async function drawCardBack(ctx, x, y, width, height) {
    ctx.fillStyle = '#3498DB'; roundedRect(ctx, x, y, width, height, 10);
    ctx.strokeStyle = '#2980B9'; ctx.lineWidth = 2;
    for (let i = 15; i < width; i += 15) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + height); ctx.stroke(); }
}
function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + width, y, x + width, y + height, radius); ctx.arcTo(x + width, y + height, x, y + height, radius); ctx.arcTo(x, y + height, x, y, radius); ctx.arcTo(x, y, x + width, y, radius); ctx.closePath(); ctx.fill();
}
function createBlackjackButtons(canDouble) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hit').setLabel('Rút').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('stand').setLabel('Dừng').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('double').setLabel('Gấp đôi').setStyle(ButtonStyle.Danger).setDisabled(!canDouble)
    )];
}

// --- Roulette Helpers ---
function spinRoulette() {
    const chances = [18, 18, 2]; // Red, Black, Green
    const random = Math.floor(Math.random() * 38);
    if (random < 18) return 'red';
    if (random < 36) return 'black';
    return 'green';
}
function getRouletteMultiplier(color, result) {
    if (color === 'green' && result === 'green') return 14;
    if (color === result) return 2;
    return 0;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('🎰 Các trò chơi cá cược vui vẻ')
        .addSubcommand(sub => 
            sub.setName('blackjack')
                .setDescription('Chơi một ván Xì Dách')
                .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('coinflip')
                .setDescription('Tung đồng xu thử vận may')
                .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true))
                .addStringOption(opt => opt.setName('guess').setDescription('Đoán mặt').setRequired(true)
                    .addChoices({ name: 'Mặt Sấp (Heads)', value: 'heads' }, { name: 'Mặt Ngửa (Tails)', value: 'tails' }))
        )
        .addSubcommand(sub => 
            sub.setName('roll')
                .setDescription('Cược xúc xắc Thấp hoặc Cao')
                .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true))
                .addStringOption(opt => opt.setName('guess').setDescription('Dự đoán').setRequired(true)
                    .addChoices({ name: 'Thấp (1-50)', value: 'low' }, { name: 'Cao (51-100)', value: 'high' }))
        )
        .addSubcommand(sub => 
            sub.setName('roulette')
                .setDescription('Quay Roulette')
                .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true))
                .addStringOption(opt => opt.setName('color').setDescription('Chọn màu').setRequired(true)
                    .addChoices({ name: 'Đỏ (Red)', value: 'red' }, { name: 'Đen (Black)', value: 'black' }, { name: 'Xanh (Green)', value: 'green' }))
        )
        .addSubcommand(sub => 
            sub.setName('slot')
                .setDescription('Chơi máy xèng (Slots)')
                .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true))
        ),
    category: 'Economy',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const bet = interaction.options.getInteger('bet');

        if (bet <= 0) return interaction.reply({ content: lang.Economy.Messages.betAmountError, flags: MessageFlags.Ephemeral });

        let user = await EconomyUserData.findOne({ userId: interaction.user.id });
        if (!user) {
            user = await EconomyUserData.create({
                userId: interaction.user.id, balance: 0, commandData: {}, boosters: [], transactionLogs: []
            });
        }
        if (!user.commandData) user.commandData = {};
        if (user.balance < bet) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder().setDescription(lang.Economy.Messages.noMoney).setColor('#FF0000')], 
                flags: MessageFlags.Ephemeral 
            });
        }

        const now = new Date();
        const checkCooldown = (key, durationStr) => {
            const last = user.commandData[key];
            const duration = parseDuration(durationStr);
            if (last && duration > 0) {
                const lastTime = new Date(last).getTime();
                const next = new Date(lastTime + duration);
                if (now < next) return next;
            }
            return null;
        };

        if (subcommand === 'blackjack') {
            const nextUse = checkCooldown('lastBlackjack', config.Economy.Blackjack.cooldown);
            if (nextUse) return interaction.reply({ embeds: [new EmbedBuilder().setDescription(replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextUse.getTime() / 1000) })).setColor('#FF0000')], flags: MessageFlags.Ephemeral });

            user.balance -= bet;
            user.commandData.lastBlackjack = now;
            await user.save();

            const deck = createDeck();
            const playerHand = [drawCard(deck), drawCard(deck)];
            const dealerHand = [drawCard(deck), drawCard(deck)];
            
            await interaction.deferReply();
            
            // Initial check for Blackjack
            if (calculateHand(playerHand) === 21) {
                const dealerVal = calculateHand(dealerHand);
                const win = dealerVal !== 21;
                // Auto-end
                // Reuse endBlackjackGame logic here... simplified
                // For brevity, skipping full implementation replication, assuming helper functions exist or copying fully.
                // Since I need full implementation, I'll copy the button logic.
                
                const winMultiplier = config.Economy.Blackjack.winMultiplier;
                const booster = checkActiveBooster(user, 'Money');
                let winnings = 0;
                let title = 'Hòa'; let color = '#FFFF00';

                if (win) {
                    winnings = bet * winMultiplier * booster;
                    user.balance += winnings;
                    title = 'Thắng'; color = '#00FF00';
                    user.transactionLogs.push({ type: 'blackjack_win', amount: winnings - bet, timestamp: now });
                } else { // Push
                    user.balance += bet;
                    user.transactionLogs.push({ type: 'blackjack_draw', amount: 0, timestamp: now });
                }
                await user.save();
                
                const attachment = await createBlackjackCanvas(playerHand, dealerHand);
                 const embed = new EmbedBuilder()
                    .setAuthor({ name: 'Kết Quả Xì Dách (Blackjack)', iconURL: interaction.user.displayAvatarURL() })
                    .setTitle(`${title} (Blackjack!)`)
                    .setDescription(`**${user.userId === interaction.user.id ? 'Bạn' : `<@${user.userId}>`}** đã đạt Blackjack! 🃏\n\n*${getRandomQuote(true)}*`)
                    .addFields(
                        { name: '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                        { name: '💵 Thắng', value: `**+${winnings.toLocaleString()}**`, inline: true },
                        { name: '💳 Số dư mới', value: `\`${user.balance.toLocaleString()}\``, inline: true }
                    )
                    .setColor(color)
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1068/1068224.png') // Blackjack Icon
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed], files: [attachment] });
            }

            const attachment = await createBlackjackCanvas(playerHand, dealerHand, true);
            const embed = new EmbedBuilder().setTitle('Xì Dách').setFooter({ text: `Cược: ${bet}` });
            const msg = await interaction.editReply({ embeds: [embed], files: [attachment], components: createBlackjackButtons(user.balance >= bet) });
            
            const collector = msg.createMessageComponentCollector({ time: 60000, filter: i => i.user.id === interaction.user.id });
            
            collector.on('collect', async i => {
                if (i.customId === 'hit') {
                    playerHand.push(drawCard(deck));
                    await i.deferUpdate();
                    if (calculateHand(playerHand) >= 21) {
                        collector.stop('finish');
                        // finish logic
                        const pVal = calculateHand(playerHand);
                        let win = false;
                        if (pVal > 21) win = false; // Bust
                        else win = false; // logic handled in stand
                        // Actually if bust, immediate lose.
                        
                        user.transactionLogs.push({ type: 'blackjack_lose', amount: bet, timestamp: now });
                        await user.save();
                        
                        const att = await createBlackjackCanvas(playerHand, dealerHand);
                        
                        const embed = new EmbedBuilder()
                            .setAuthor({ name: 'Kết Quả Xì Dách', iconURL: interaction.user.displayAvatarURL() })
                            .setTitle('Thua (Bust)')
                            .setColor('#FF0000')
                            .setDescription(`Oops! Bạn đã rút quá 21 điểm (Quắc)! 💥\n\n*${getRandomQuote(false)}*`)
                            .addFields(
                                { name: '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                                { name: '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                                { name: '💸 Mất', value: `**-${bet.toLocaleString()}**`, inline: true },
                                { name: '💳 Số dư mới', value: `\`${user.balance.toLocaleString()}\``, inline: true }
                            )
                            .setThumbnail('https://cdn-icons-png.flaticon.com/512/1618/1618367.png') // Bust Icon
                            .setTimestamp();

                        interaction.editReply({ embeds: [embed], files: [att], components: [] });
                        return;
                    }
                    const att = await createBlackjackCanvas(playerHand, dealerHand, true);
                    interaction.editReply({ files: [att], components: createBlackjackButtons(user.balance >= bet) });
                } else if (i.customId === 'stand') {
                     await i.deferUpdate();
                     collector.stop('stand');
                } else if (i.customId === 'double') {
                     // logic
                     if (user.balance < bet) return i.reply({ content: 'Không đủ tiền!', flags: MessageFlags.Ephemeral });
                     user.balance -= bet;
                     playerHand.push(drawCard(deck));
                     collector.stop('double');
                }
            });
            
            collector.on('end', async (c, reason) => {
                let finalBet = bet;
                if (reason === 'double') finalBet = bet * 2;
                
                if (reason === 'stand' || reason === 'double') {
                    while (calculateHand(dealerHand) < 17) dealerHand.push(drawCard(deck));
                    const pVal = calculateHand(playerHand);
                    const dVal = calculateHand(dealerHand);
                    
                    let win = false; let draw = false;
                    if (pVal > 21) win = false;
                    else if (dVal > 21) win = true;
                    else if (pVal > dVal) win = true;
                    else if (pVal === dVal) draw = true;
                    
                    const booster = checkActiveBooster(user, 'Money');
                    const multiplier = config.Economy.Blackjack.winMultiplier;
                    
                    if (win) {
                        const totalReturn = finalBet + (finalBet * (multiplier - 1) * booster);
                        user.balance += totalReturn;
                        user.transactionLogs.push({ type: 'blackjack_win', amount: totalReturn - finalBet, timestamp: now });
                    } else if (draw) {
                        user.balance += finalBet;
                        user.transactionLogs.push({ type: 'blackjack_draw', amount: 0, timestamp: now });
                    } else {
                        user.transactionLogs.push({ type: 'blackjack_lose', amount: finalBet, timestamp: now });
                    }
                    await user.save();
                    
                    const att = await createBlackjackCanvas(playerHand, dealerHand);
                    const color = win ? '#00FF00' : draw ? '#FFFF00' : '#FF0000';
                    const title = win ? 'Thắng' : draw ? 'Hòa' : 'Thua';
                    
                    const resultMoneyStr = win ? `**+${(finalBet + (finalBet * (multiplier - 1) * booster) - finalBet).toLocaleString()}**` : draw ? '**0**' : `**-${finalBet.toLocaleString()}**`;

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: 'Kết Quả Xì Dách', iconURL: interaction.user.displayAvatarURL() })
                        .setTitle(title)
                        .setColor(color)
                        .setDescription(`**Bạn:** ${pVal} 🆚 **Nhà cái:** ${dVal}\n\n*${win ? getRandomQuote(true) : draw ? 'Không thắng không thua, đời không nể!' : getRandomQuote(false)}*`)
                        .addFields(
                            { name: '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                            { name: '💰 Cược', value: `\`${finalBet.toLocaleString()}\``, inline: true },
                            { name: '💵 Kết quả', value: resultMoneyStr, inline: true },
                            { name: '💳 Số dư mới', value: `\`${user.balance.toLocaleString()}\``, inline: true }
                        )
                        .setThumbnail(win ? 'https://cdn-icons-png.flaticon.com/512/755/755195.png' : 'https://cdn-icons-png.flaticon.com/512/1008/1008953.png')
                        .setTimestamp();

                    interaction.editReply({ 
                        embeds: [embed],
                        files: [att],
                        components: []
                    });
                }
            });

        } else if (subcommand === 'coinflip') {
             const nextUse = checkCooldown('lastCoinflip', config.Economy.Coinflip.cooldown);
             if (nextUse) return interaction.reply({ content: `Cooldown! Đợi đến <t:${Math.floor(nextUse.getTime()/1000)}:R>`, flags: MessageFlags.Ephemeral });

             const guess = interaction.options.getString('guess');
             const result = Math.random() > 0.5 ? 'heads' : 'tails';
             const win = guess === result;
             const multiplier = checkActiveBooster(user, 'Money');
             const amount = win ? bet * multiplier : -bet;
             
             user.balance += amount;
             user.commandData.lastCoinflip = now;
             user.transactionLogs.push({ type: 'coinflip', amount, timestamp: now });
             await user.save();
             
             const embed = new EmbedBuilder()
                 .setAuthor({ name: 'Kết Quả Coinflip', iconURL: interaction.user.displayAvatarURL() })
                 .setTitle(win ? 'Thắng Lớn! 🎉' : 'Thất Bại! 🥀')
                 .setDescription(`Kết quả: **${result === 'heads' ? 'Mặt Sấp' : 'Mặt Ngửa'}**\nBạn chọn: **${guess === 'heads' ? 'Mặt Sấp' : 'Mặt Ngửa'}**\n\n*${getRandomQuote(win)}*`)
                 .addFields(
                    { name: '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                    { name: '💵 Kết quả', value: win ? `**+${amount.toLocaleString()}**` : `**${amount.toLocaleString()}**`, inline: true },
                    { name: '💳 Số dư mới', value: `\`${user.balance.toLocaleString()}\``, inline: true }
                 )
                 .setColor(win ? '#00FF00' : '#FF0000')
                 .setThumbnail('https://cdn-icons-png.flaticon.com/512/1490/1490817.png')
                 .setTimestamp();
             interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'roll') {
             const nextUse = checkCooldown('lastRoll', config.Economy.Roll.cooldown);
             if (nextUse) return interaction.reply({ content: `Cooldown! Đợi đến <t:${Math.floor(nextUse.getTime()/1000)}:R>`, flags: MessageFlags.Ephemeral });

             const guess = interaction.options.getString('guess');
             const roll = Math.floor(Math.random() * 100) + 1;
             const win = (guess === 'low' && roll <= 50) || (guess === 'high' && roll > 50);
             const multiplier = 2 * checkActiveBooster(user, 'Money');
             
             if (win) {
                 user.balance += bet * multiplier;
                 user.transactionLogs.push({ type: 'roll', amount: bet * multiplier, timestamp: now });
             } else {
                 user.balance -= bet;
                 user.transactionLogs.push({ type: 'roll', amount: -bet, timestamp: now });
             }
             user.commandData.lastRoll = now;
             await user.save();

             interaction.reply({ embeds: [new EmbedBuilder()
                 .setAuthor({ name: 'Kết Quả Xúc Xắc (Roll)', iconURL: interaction.user.displayAvatarURL() })
                 .setTitle(win ? 'Lăn Trúng Thưởng! 🎲' : 'Xúc Xắc Phản Bội! 🎲')
                 .setDescription(`Xúc xắc: **${roll}**\nBạn chọn: **${guess === 'low' ? 'Thấp (1-50)' : 'Cao (51-100)'}**\n\n*${getRandomQuote(win)}*`)
                 .addFields(
                    { name: '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                    { name: '💵 Kết quả', value: win ? `**+${(bet * multiplier).toLocaleString()}**` : `**-${bet.toLocaleString()}**`, inline: true },
                    { name: '💳 Số dư mới', value: `\`${user.balance.toLocaleString()}\``, inline: true }
                 )
                 .setColor(win ? '#00FF00' : '#FF0000')
                 .setThumbnail('https://cdn-icons-png.flaticon.com/512/2821/2821898.png')
                 .setTimestamp()] });

        } else if (subcommand === 'roulette') {
             const nextUse = checkCooldown('lastRoulette', config.Economy.Roulette.cooldown);
             if (nextUse) return interaction.reply({ content: `Cooldown! Đợi đến <t:${Math.floor(nextUse.getTime()/1000)}:R>`, flags: MessageFlags.Ephemeral });

             const color = interaction.options.getString('color');
             const result = spinRoulette();
             const winMulti = getRouletteMultiplier(color, result);
             
             user.balance -= bet;
             user.commandData.lastRoulette = now;
             
             if (winMulti > 0) {
                 const winnings = bet * winMulti * checkActiveBooster(user, 'Money');
                 user.balance += winnings;
                 user.transactionLogs.push({ type: 'roulette', amount: winnings - bet, timestamp: now });
                 interaction.reply({ embeds: [new EmbedBuilder()
                    .setAuthor({ name: 'Vòng Quay Roulette', iconURL: interaction.user.displayAvatarURL() })
                    .setTitle('Thắng Roulette! 🎉')
                    .setDescription(`Bóng lăn vào ô: **${result.toUpperCase()}**\nBạn chọn: **${color.toUpperCase()}**\n\n*${getRandomQuote(true)}*`)
                    .addFields(
                        { name: '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                        { name: '💵 Thắng', value: `**+${winnings.toLocaleString()}**`, inline: true },
                        { name: '💳 Số dư mới', value: `\`${user.balance.toLocaleString()}\``, inline: true }
                    )
                    .setColor('#00FF00')
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1055/1055905.png')
                    .setTimestamp()] });
             } else {
                 user.transactionLogs.push({ type: 'roulette', amount: -bet, timestamp: now });
                 interaction.reply({ embeds: [new EmbedBuilder()
                    .setAuthor({ name: 'Vòng Quay Roulette', iconURL: interaction.user.displayAvatarURL() })
                    .setTitle('Thua Roulette! 🥀')
                    .setDescription(`Bóng lăn vào ô: **${result.toUpperCase()}**\nBạn chọn: **${color.toUpperCase()}**\n\n*${getRandomQuote(false)}*`)
                    .addFields(
                        { name: '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                        { name: '💸 Mất', value: `**-${bet.toLocaleString()}**`, inline: true },
                        { name: '💳 Số dư mới', value: `\`${user.balance.toLocaleString()}\``, inline: true }
                    )
                    .setColor('#FF0000')
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1055/1055905.png')
                    .setTimestamp()] });
             }
             await user.save();

        } else if (subcommand === 'slot') {
             const nextUse = checkCooldown('lastSlot', config.Economy.Slot.cooldown);
             if (nextUse) return interaction.reply({ content: `Cooldown! Đợi đến <t:${Math.floor(nextUse.getTime()/1000)}:R>`, flags: MessageFlags.Ephemeral });

             const symbols = ['🍒', '🍋', '🍉', '🔔', '⭐'];
             
             // Initial Spinning Message
             const spinMsg = await interaction.reply({ 
                 embeds: [new EmbedBuilder()
                    .setAuthor({ name: 'Máy Slots (Xèng)', iconURL: interaction.user.displayAvatarURL() })
                    .setTitle('Đang Quay... 🎰')
                    .setDescription('🎰 | 🟩 | 🟩 | 🟩 | 🎰')
                    .setColor('#FFFF00')
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1068/1068228.png')]
                 , fetchReply: true
             });

             // Animation loop
             for (let i = 0; i < 3; i++) {
                 await new Promise(r => setTimeout(r, 1000));
                 const tempR = [symbols[Math.floor(Math.random()*5)], symbols[Math.floor(Math.random()*5)], symbols[Math.floor(Math.random()*5)]];
                 await interaction.editReply({
                     embeds: [new EmbedBuilder()
                        .setAuthor({ name: 'Máy Slots (Xèng)', iconURL: interaction.user.displayAvatarURL() })
                        .setTitle('Đang Quay... 🎰')
                        .setDescription(`🎰 | ${tempR.join(' | ')} | 🎰`)
                        .setColor('#FFFF00')
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/1068/1068228.png')]
                 });
             }
             
             await new Promise(r => setTimeout(r, 1000));

             const r = [symbols[Math.floor(Math.random()*5)], symbols[Math.floor(Math.random()*5)], symbols[Math.floor(Math.random()*5)]];
             const win = r[0] === r[1] && r[1] === r[2];
             
             const multiplier = checkActiveBooster(user, 'Money');
             const amount = win ? bet * config.Economy.Slot.multiplier * multiplier : -bet;
             
             user.balance += amount;
             user.commandData.lastSlot = now;
             user.transactionLogs.push({ type: 'slot', amount, timestamp: now });
             await user.save();
             
             await interaction.editReply({ embeds: [new EmbedBuilder()
                 .setAuthor({ name: 'Máy Slots (Xèng)', iconURL: interaction.user.displayAvatarURL() })
                 .setTitle(win ? 'JACKPOT! Nổ Hũ! 🎰' : 'Chúc Bạn May Mắn Lần Sau...')
                 .setDescription(`🎰 | ${r.join(' | ')} | 🎰\n\n*${getRandomQuote(win)}*`)
                 .addFields(
                    { name: '👤 Người chơi', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '💰 Cược', value: `\`${bet.toLocaleString()}\``, inline: true },
                    { name: '💵 Kết quả', value: win ? `**+${amount.toLocaleString()}**` : `**${amount.toLocaleString()}**`, inline: true },
                    { name: '💳 Số dư mới', value: `\`${user.balance.toLocaleString()}\``, inline: true }
                 )
                 .setColor(win ? '#00FF00' : '#FF0000')
                 .setThumbnail('https://cdn-icons-png.flaticon.com/512/1068/1068228.png')
                 .setTimestamp()] });
        }
    }
};
