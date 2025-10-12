/*
  _____                     _         ____          _   
 |  __ \                   | |       |  _ \        | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                              
                                              
  Cảm ơn bạn đã chọn Drako Bot!

  Nếu bạn gặp bất kỳ vấn đề nào, cần hỗ trợ, hoặc có đề xuất để cải thiện bot,
  chúng tôi mời bạn kết nối với chúng tôi trên máy chủ Discord và tạo một phiếu hỗ trợ: 

  http://discord.drakodevelopment.net
 
*/

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const moment = require('moment');
const UserData = require('../../models/UserData');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

const badgesFlags = {
    Nhân_viên_Discord: 1,
    Chủ_máy_chủ_Đối_tác: 2,
    Sự_kiện_HypeSquad: 4,
    Thợ_săn_lỗi_Cấp_1: 8,
    Nhà_Dũng_cảm: 64,
    Nhà_Thông_thái: 128,
    Nhà_Cân_bằng: 256,
    Người_ủng_hộ_sớm: 512,
    Thợ_săn_lỗi_Cấp_2: 16384,
    Nhà_phát_triển_Bot_được_xác_minh_sớm: 131072,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Lấy hồ sơ, ảnh đại diện, hoặc ảnh bìa của người dùng')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Thông tin cần lấy')
                .setRequired(true)
                .addChoices(
                    { name: 'Hồ sơ', value: 'profile' },
                    { name: 'Ảnh đại diện', value: 'avatar' },
                    { name: 'Ảnh bìa', value: 'banner' },
                    { name: 'Cả Ảnh đại diện & Ảnh bìa', value: 'both' },
                ))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng cần lấy thông tin')
                .setRequired(false)),
    category: 'Chung',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const user = interaction.options.getUser('user') || interaction.user;
            const type = interaction.options.getString('type');

            const fullUser = await interaction.client.users.fetch(user.id, { force: true });
            const member = await interaction.guild.members.fetch(user.id);
            const avatarUrl = user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
            const bannerUrl = fullUser.bannerURL({ format: 'png', dynamic: true, size: 1024 });
            const userIcon = avatarUrl;
            const guildIcon = interaction.guild.iconURL({ format: 'png', dynamic: true, size: 1024 });

            const embed = new EmbedBuilder().setColor(config.EmbedColors);

            if (type === 'profile') {
                const flags = member.user.flags?.bitfield ?? 0;
                let badges = Object.keys(badgesFlags).filter(badge => (flags & badgesFlags[badge]) === badgesFlags[badge])
                    .map(badge => badge.replace(/_/g, ' '));

                if (badges.length === 0) badges = ['Không có'];

                const userData = await UserData.findOne(
                    { userId: user.id, guildId: interaction.guild.id },
                    'xp level balance bank totalMessages inventory commandData.dailyStreak'
                );

                const creationTimestamp = Math.floor(user.createdAt.getTime() / 1000);

                let description = lang.Profile.Embed.Description.map(line => {
                    return line
                        .replace("{joinDate}", `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`)
                        .replace("{role}", member.roles.highest.toString())
                        .replace("{nickname}", member.nickname || "*Không có*")
                        .replace("{userID}", user.id)
                        .replace("{user}", user.username)
                        .replace("{creationDate}", `<t:${creationTimestamp}:F>`)
                        .replace("{creationDays}", `<t:${creationTimestamp}:R>`)
                        .replace("{badges}", badges.join(', '))
                        .replace("{xp}", userData ? userData.xp.toLocaleString() : '0')
                        .replace("{level}", userData ? userData.level : '0')
                        .replace("{balance}", userData ? userData.balance.toLocaleString() : '0')
                        .replace("{bank}", userData ? userData.bank.toLocaleString() : '0')
                        .replace("{totalMessages}", userData ? userData.totalMessages.toLocaleString() : '0')
                        .replace("{inventoryItems}", userData && userData.inventory.length > 0 ? userData.inventory.map(item => `${item.itemId} x${item.quantity}`).join(', ') : '*Không có*')
                        .replace("{dailyStreak}", userData ? `${userData.commandData.dailyStreak} ngày` : '*Không có*');
                }).join('\n');

                embed.setDescription(description);

                if (lang.Profile.Embed.Title) {
                    embed.setTitle(lang.Profile.Embed.Title);
                }

                if (lang.Profile.Embed.Footer.Text) {
                    let footerText = lang.Profile.Embed.Footer.Text.replace("{userIcon}", userIcon).replace("{guildIcon}", guildIcon);
                    let footerIcon = lang.Profile.Embed.Footer.Icon.replace("{userIcon}", userIcon).replace("{guildIcon}", guildIcon);
                    embed.setFooter({
                        text: footerText,
                        iconURL: footerIcon || undefined
                    });
                }

                const authorText = lang.Profile.Embed.Author.Text.replace("{nickname}", member.nickname || user.username);
                if (authorText) {
                    embed.setAuthor({
                        name: authorText,
                        iconURL: lang.Profile.Embed.Author.Icon.replace("{userIcon}", userIcon).replace("{guildIcon}", guildIcon) || undefined
                    });
                }

                if (lang.Profile.Embed.Thumbnail) {
                    embed.setThumbnail(lang.Profile.Embed.Thumbnail.replace("{userIcon}", userIcon).replace("{guildIcon}", guildIcon) || undefined);
                }

                if (lang.Profile.Embed.Image) {
                    embed.setImage(lang.Profile.Embed.Image);
                }

                await interaction.editReply({ embeds: [embed] });

            } else if (type === 'avatar') {
                embed.setTitle(`Ảnh đại diện của ${user.username}`)
                    .setImage(avatarUrl)
                    .setFooter({ text: `${lang.AvatarSearchedBy} ${interaction.user.username}` });

                await interaction.editReply({ embeds: [embed] });

            } else if (type === 'banner') {
                if (bannerUrl) {
                    embed.setTitle(`Ảnh bìa của ${user.username}`)
                        .setImage(bannerUrl)
                        .setFooter({ text: `${lang.BannerSearchedBy} ${interaction.user.username}` });

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply({ content: lang.NoBannerSet, flags: MessageFlags.Ephemeral });
                }

            } else if (type === 'both') {
                if (bannerUrl) {
                    embed.setTitle(`Ảnh đại diện & Ảnh bìa của ${user.username}`)
                        .setImage(bannerUrl)
                        .setThumbnail(avatarUrl)
                        .setFooter({ text: `${lang.BannerSearchedBy} ${interaction.user.username}` });

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply({ content: lang.NoBannerSet, flags: MessageFlags.Ephemeral });
                }
            }

        } catch (error) {
            console.error("Lỗi trong lệnh user: ", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.editReply({ content: 'Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn.', flags: MessageFlags.Ephemeral });
            }
        }
    },
};