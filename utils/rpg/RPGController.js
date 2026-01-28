const { EmbedBuilder } = require('discord.js');
const RPGPlayer = require('../../models/RPGPlayer');
const Animal = require('./Animal');
const RNG = require('./RNG');
const BattleSystem = require('./BattleSystem');
const itemsDb = require('./data/items.json');
const MobsDb = require('./data/mobs.json');

class RPGController {

    static async getPlayer(userId) {
        let player = await RPGPlayer.findOne({ userId });
        if (!player) {
            player = await RPGPlayer.create({ userId });
        }
        return player;
    }

    // --- Core Commands ---

    static async hunt(interaction) {
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        const now = Date.now();
        const COOLDOWN_MS = 600000; // 10 minutes
        if (now - player.lastHuntTime < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - player.lastHuntTime)) / 1000);
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            return interaction.reply(`Bạn đang mệt! Hãy nghỉ ngơi **${minutes} phút ${seconds} giây** trước khi đi săn tiếp.`);
        }

        // Biome Flavor
        const biomes = ['Rừng Rậm', 'Hang Động', 'Bờ Sông', 'Núi Tuyết', 'Đồng Cỏ'];
        const biome = biomes[Math.floor(Math.random() * biomes.length)];

        // Event Roll
        const roll = Math.random() * 100;
        let embed = new EmbedBuilder().setTimestamp();

        // 60% Chance: Animal
        if (roll < 60) {
            const animal = RNG.generateAnimal();
            player.zoo.push(animal);

            // Add to Nekodex
            if (!player.nekodex) player.nekodex = [];
            if (!player.nekodex.includes(animal.name)) {
                player.nekodex.push(animal.name);
            }

            const xpGain = 10 + Math.floor(Math.random() * 5);
            player.xp += xpGain;

            embed.setTitle(`🏹 Đi săn tại ${biome}`)
                .setDescription(`Bạn phát hiện một chuyển động trong bụi rậm... và bắt được **${animal.rarity} ${animal.name}**!`)
                .addFields(
                    { name: 'Độ hiếm', value: animal.rarity, inline: true },
                    { name: 'Chỉ số', value: `HP: ${animal.stats.hp} | STR: ${animal.stats.str} | SPD: ${animal.stats.spd}`, inline: true },
                    { name: 'Phần thưởng', value: `+${xpGain} XP`, inline: true }
                )
                .setColor(this.getColorForRarity(animal.rarity));
        }
        // 25% Chance: Treasure (Gold/Item)
        else if (roll < 85) {
            const goldFound = 50 + Math.floor(Math.random() * 100);
            player.gold += goldFound;
            // Small chance for item
            let itemFound = null;
            if (Math.random() < 0.2) { // 20% if treasure found
                const possibleItems = itemsDb.filter(i => i.type === 'CONSUMABLE' || i.type === 'MATERIAL');
                if (possibleItems.length > 0) {
                    const itemDef = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                    itemFound = itemDef;
                    const has = player.inventory.find(s => s.id === itemDef.id);
                    if (has) has.count++;
                    else player.inventory.push({ id: itemDef.id, count: 1 });
                }
            }

            embed.setTitle(`💰 Đi săn tại ${biome}`)
                .setDescription(`Bạn không tìm thấy thú nào, nhưng lại vấp phải một túi đồ bị bỏ quên!`)
                .addFields({ name: 'Nhặt được', value: `**${goldFound} Gold** 🪙${itemFound ? `\n**${itemFound.name}** x1` : ''}` })
                .setColor('Gold');
        }
        // 15% Chance: Nothing
        else {
            embed.setTitle(`🍃 Đi săn tại ${biome}`)
                .setDescription(`Bạn lang thang khắp ${biome} trong nhiều giờ liền nhưng không tìm thấy gì cả.\nCó lẽ lũ thú đã trốn hết rồi.`)
                .setColor('Grey');
        }

        player.lastHuntTime = now;
        await player.save();

        return interaction.reply({ embeds: [embed] });
    }

    static async zoo(interaction) {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const player = await this.getPlayer(targetUser.id);

        if (!player || player.zoo.length === 0) {
            return interaction.reply(`${targetUser.username} chưa có thú cưng nào! Dùng \`/rpg hunt\` để bắt đầu.`);
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(player.zoo.length / itemsPerPage);
        let currentPage = 1;

        const generateEmbed = (page) => {
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const currentAnimals = player.zoo.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle(`Sở thú của ${targetUser.username} 🦁`)
                .setColor('#00AAFF')
                .setFooter({ text: `Trang ${page}/${totalPages} • Tổng cộng: ${player.zoo.length} thú` });

            const description = currentAnimals.map((a, index) => {
                const globalIndex = start + index + 1;
                const equipStatus = player.team && player.team.includes(a.id) ? '🛡️ ' : '';
                return `\`${globalIndex}.\` ${equipStatus}**${a.name}** [${a.rarity}] - Lv${a.level}`;
            }).join('\n');

            embed.setDescription(description || 'Trống rỗng.');
            return embed;
        };

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(totalPages <= 1)
            );

        const response = await interaction.reply({
            embeds: [generateEmbed(currentPage)],
            components: totalPages > 1 ? [row] : []
        });

        if (totalPages <= 1) return;

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Nút này không phải cho bạn!', ephemeral: true });
            }

            if (i.customId === 'prev') {
                if (currentPage > 1) currentPage--;
            } else if (i.customId === 'next') {
                if (currentPage < totalPages) currentPage++;
            }

            row.components[0].setDisabled(currentPage === 1);
            row.components[1].setDisabled(currentPage === totalPages);

            await i.update({ embeds: [generateEmbed(currentPage)], components: [row] });
        });

        collector.on('end', () => {
            // Disable buttons after timeout
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
            // We can't edit the message here easily if we don't have access to it, but response.edit works if the token is valid.
            // Usually best to just leave it or edit via interaction.editReply if possible.
            interaction.editReply({ components: [disabledRow] }).catch(() => { });
        });
    }

    static async inventory(interaction) {
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        const embed = new EmbedBuilder()
            .setTitle(`Túi đồ của ${interaction.user.username} 🎒`)
            .setColor('Gold');

        const weaponName = player.equipment.weapon
            ? itemsDb.find(i => i.id === player.equipment.weapon)?.name || player.equipment.weapon
            : 'Không có';
        const armorName = player.equipment.armor
            ? itemsDb.find(i => i.id === player.equipment.armor)?.name || player.equipment.armor
            : 'Không có';

        embed.addFields({ name: 'Trang bị', value: `⚔️ **Vũ khí**: ${weaponName}\n🛡️ **Giáp**: ${armorName}` });

        if (!player.inventory || player.inventory.length === 0) {
            embed.setDescription(`**Vàng**: ${player.gold} 💰\n**Đá quý**: ${player.gems} 💎\n\nTúi đồ trống.`);
        } else {
            const lines = player.inventory.map(slot => {
                const itemDef = itemsDb.find(i => i.id === slot.id);
                const name = itemDef ? itemDef.name : slot.id;
                return `**${name}** x${slot.count}`;
            });
            embed.setDescription(`**Vàng**: ${player.gold} 💰\n**Đá quý**: ${player.gems} 💎\n\n` + lines.join('\n'));
        }

        return interaction.reply({ embeds: [embed] });
    }

    // --- Management Commands ---

    static async equip(interaction) {
        const itemName = interaction.options.getString('item').toLowerCase();
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        const slotIndex = player.inventory.findIndex(slot => {
            const itemDef = itemsDb.find(i => i.id === slot.id);
            return (itemDef && itemDef.name.toLowerCase() === itemName) || slot.id === itemName;
        });

        if (slotIndex === -1) return interaction.reply('Bạn không có vật phẩm này!');

        const slot = player.inventory[slotIndex];
        const itemDef = itemsDb.find(i => i.id === slot.id);

        if (!itemDef || (itemDef.type !== 'WEAPON' && itemDef.type !== 'ARMOR')) {
            return interaction.reply('Vật phẩm này không thể trang bị!');
        }

        const typeKey = itemDef.type === 'WEAPON' ? 'weapon' : 'armor';
        const currentEquip = player.equipment[typeKey];

        if (currentEquip) {
            const existingSlot = player.inventory.find(s => s.id === currentEquip);
            if (existingSlot) existingSlot.count++;
            else player.inventory.push({ id: currentEquip, count: 1 });
        }

        if (slot.count > 1) {
            slot.count--;
        } else {
            player.inventory.splice(slotIndex, 1);
        }

        player.equipment[typeKey] = itemDef.id;
        await player.save();

        return interaction.reply(`Đã trang bị **${itemDef.name}**!`);
    }

    static async sell(interaction) {
        // Bán thú ở vị trí index
        const index = interaction.options.getInteger('index') - 1;
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        if (index < 0 || index >= player.zoo.length) return interaction.reply('Vị trí thú không hợp lệ.');

        const animal = player.zoo[index];
        // Giá bán = (Level * 10) * Rarity Multiplier
        let rarityMult = 1;
        switch (animal.rarity) {
            case 'Common': rarityMult = 1; break;
            case 'Uncommon': rarityMult = 1.5; break;
            case 'Rare': rarityMult = 3; break;
            case 'Epic': rarityMult = 5; break;
            case 'Legendary': rarityMult = 10; break;
            case 'Mythical': rarityMult = 50; break;
        }
        const price = Math.floor(animal.level * 10 * rarityMult);

        // Xóa
        player.zoo.splice(index, 1);
        // Xóa khỏi team nếu có
        player.team = player.team.filter(id => id !== animal.id);

        player.gold += price;
        await player.save();

        return interaction.reply(`Bạn đã bán **${animal.name}** với giá **${price} Gold** 💰.`);
    }

    static async sacrifice(interaction) {
        const index = interaction.options.getInteger('index') - 1;
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        if (index < 0 || index >= player.zoo.length) return interaction.reply('Vị trí thú không hợp lệ.');

        const animal = player.zoo[index];
        player.zoo.splice(index, 1);
        player.team = player.team.filter(id => id !== animal.id);

        // Reward: Soul Stone (Material)
        const soulItem = 'soul_stone';
        const has = player.inventory.find(s => s.id === soulItem);
        if (has) has.count++;
        else player.inventory.push({ id: soulItem, count: 1 });

        await player.save();
        return interaction.reply(`Bạn đã hiến tế **${animal.name}** và nhận được **1 Soul Stone** 🔮.`);
    }

    static async rename(interaction) {
        const index = interaction.options.getInteger('index') - 1;
        const newName = interaction.options.getString('name');
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        if (index < 0 || index >= player.zoo.length) return interaction.reply('Vị trí thú không hợp lệ.');

        const oldName = player.zoo[index].name;
        player.zoo[index].name = newName;
        await player.save();

        return interaction.reply(`Đã đổi tên **${oldName}** thành **${newName}** ✨.`);
    }

    static async team(interaction) {
        const slots = [
            interaction.options.getInteger('slot1'),
            interaction.options.getInteger('slot2'),
            interaction.options.getInteger('slot3')
        ].filter(s => s !== null);

        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        if (slots.length === 0) {
            // View Team
            if (!player.team || player.team.length === 0) return interaction.reply('Đội hình của bạn đang trống.');
            const teamAnimals = player.team.map(id => player.zoo.find(a => a.id === id)).filter(Boolean);
            const teamNames = teamAnimals.map(a => a.name).join(', ');
            return interaction.reply(`Đội hình hiện tại: **${teamNames}**`);
        }

        const newTeam = [];
        for (const slot of slots) {
            const idx = slot - 1;
            if (idx >= 0 && idx < player.zoo.length) {
                newTeam.push(player.zoo[idx].id);
            }
        }

        player.team = [...new Set(newTeam)]; // Unique IDs
        await player.save();
        return interaction.reply(`Đã cập nhật đội hình chiến đấu (${player.team.length} thú).`);
    }

    // --- New Features ---

    static async autohunt(interaction) {
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        const now = Date.now();
        if (player.autoHuntStartTime > 0) {
            // Đang AFK -> Claim rewards
            const durationMs = now - player.autoHuntStartTime;
            const durationMinutes = Math.floor(durationMs / 60000);

            player.autoHuntStartTime = 0; // Stop
            if (durationMinutes < 1) {
                await player.save();
                return interaction.reply('Bạn vừa bắt đầu Auto Hunt chưa được 1 phút. Không có quà!');
            }

            // Reward: 5 XP + 10 Gold per minute (Max 12h)
            const cappedMins = Math.min(durationMinutes, 720);
            const xpGain = cappedMins * 5;
            const goldGain = cappedMins * 10;

            player.xp += xpGain;
            player.gold += goldGain;
            await player.save();

            return interaction.reply(`🏁 Kết thúc Auto Hunt (${cappedMins} phút).\nBạn nhận được **${xpGain} XP** và **${goldGain} Gold**.`);
        } else {
            // Bắt đầu AFK
            player.autoHuntStartTime = now;
            await player.save();
            return interaction.reply('⏳ Đã bắt đầu **Auto Hunt** (Tự động săn). Treo máy để nhận quà khi quay lại!\nDùng lệnh này lần nữa để nhận thưởng.');
        }
    }

    static async nekodex(interaction) {
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        const collected = player.nekodex || [];
        const uniqueCount = collected.length;

        const embed = new EmbedBuilder()
            .setTitle('📖 Nekodex - Từ điển thú')
            .setDescription(`Bạn đã khám phá **${uniqueCount}** loài thú khác nhau!`)
            .setColor('Green');

        // Show recent discoveries? Or just list
        if (uniqueCount > 0) {
            embed.addFields({ name: 'Đã khám phá', value: collected.slice(-10).join(', ') + (collected.length > 10 ? '...' : '') });
        }

        return interaction.reply({ embeds: [embed] });
    }

    static async lootbox(interaction) {
        const type = interaction.options.getString('type') || 'common'; // lootbox, crate
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        const cost = 100;
        if (player.gold < cost) return interaction.reply(`Bạn cần ${cost} Gold để mở rương!`);

        player.gold -= cost;

        let reward = '';
        const roll = Math.random();

        if (type === 'crate') {
            // Weapon Crate
            let item = itemsDb.find(i => i.id === 'wooden_sword');
            if (roll < 0.1) item = itemsDb.find(i => i.id === 'iron_sword');

            const has = player.inventory.find(s => s.id === item.id);
            if (has) has.count++;
            else player.inventory.push({ id: item.id, count: 1 });

            reward = `Kiếm được **${item.name}**!`;
        } else {
            // Pet Lootbox
            const goldReward = Math.floor(Math.random() * 200);
            player.gold += goldReward;
            reward = `Nhận được **${goldReward} Gold**!`;
        }

        await player.save();
        return interaction.reply(`🎁 Bạn đã mở ${type} và ${reward}`);
    }

    static async dismantle(interaction) {
        // Phân giải item
        // For simplicity: convert item to gold/scrap?
        return interaction.reply('Tính năng đang phát triển.');
    }

    static async battlesetting(interaction) {
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        const autoSkill = interaction.options.getBoolean('autoskill');

        if (autoSkill !== null) {
            if (!player.battleSettings) player.battleSettings = {};
            player.battleSettings.autoSkill = autoSkill;
            await player.save();
            return interaction.reply(`Đã cập nhật cài đặt: Auto Skill = **${autoSkill ? 'Bật' : 'Tắt'}**`);
        }

        return interaction.reply('Cài đặt chiến đấu hiện tại:\nAuto Skill: ' + (player.battleSettings?.autoSkill ? 'Bật' : 'Tắt'));
    }

    // --- Battle ---

    static async battle(interaction) {
        const userId = interaction.user.id;
        const player = await this.getPlayer(userId);

        if (!player || player.zoo.length === 0) {
            return interaction.reply('Bạn cần có thú để chiến đấu! Hãy đi săn trước.');
        }

        // Team Logic
        let playerTeamData = [];
        if (player.team && player.team.length > 0) {
            playerTeamData = player.team.map(id => player.zoo.find(a => a.id === id)).filter(Boolean);
        }
        if (playerTeamData.length === 0) {
            playerTeamData = player.zoo.slice(0, 3);
        }

        const playerTeam = playerTeamData.map(d => new Animal(d));

        const playerStats = RPGPlayer.getPlayerTotalStats(player);
        const bonusStr = Math.floor(playerStats.str / 10);
        const bonusDef = Math.floor(playerStats.def / 10);
        playerTeam.forEach(a => {
            a.stats.str += bonusStr;
            a.stats.def = (a.stats.def || 0) + bonusDef;
        });

        const targetName = interaction.options.getString('target');
        let mobDef;
        if (targetName) {
            const query = targetName.toLowerCase();
            mobDef = MobsDb.find(m => m.name.toLowerCase().includes(query) || m.id === query);
        }
        if (!mobDef) {
            mobDef = MobsDb[Math.floor(Math.random() * MobsDb.length)];
        }

        const enemyTeam = [{
            ...mobDef,
            stats: { ...mobDef.stats },
            skills: mobDef.skills
        }];

        const result = BattleSystem.simulate(playerTeam, enemyTeam);

        let description = '';
        if (result.winner === 'A') {
            const xpGain = 50;
            const goldGain = 100;
            player.xp += xpGain;
            player.gold += goldGain;

            playerTeamData.forEach(original => {
                const realAnimal = player.zoo.find(z => z.id === original.id);
                if (realAnimal) realAnimal.xp = (realAnimal.xp || 0) + 10;
            });
            await player.save();
            description = `🏆 **Chiến thắng!**\nBạn nhận được **${goldGain} Gold** và **${xpGain} XP**!`;
        } else {
            description = `💀 **Thất bại...**\nThú cưng của bạn cần nghỉ ngơi.`;
        }

        let logText = result.log.join('\n');
        if (logText.length > 1000) logText = logText.slice(0, 1000) + '...';

        const embed = new EmbedBuilder()
            .setTitle(`Trận đấu: VS ${mobDef.name}`)
            .setDescription(description + '\n\n' + '```\n' + logText + '\n```')
            .setColor(result.winner === 'A' ? 'Green' : 'Red');

        return interaction.reply({ embeds: [embed] });
    }

    static getColorForRarity(rarity) {
        const colors = {
            'Common': '#808080',
            'Uncommon': '#00FF00',
            'Rare': '#0000FF',
            'Epic': '#800080',
            'Legendary': '#FFA500',
            'Mythical': '#FF0000'
        };
        return colors[rarity] || '#FFFFFF';
    }
}

module.exports = RPGController;
