const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const UserData = require('../../models/UserData');
const { getConfig, getLang } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

const badgesFlags = {
    Nhan_vien_Discord: 1,
    Chu_may_chu_Doi_tac: 2,
    Su_kien_HypeSquad: 4,
    Tho_san_loi_Cap_1: 8,
    Nha_Dung_cam: 64,
    Nha_Thong_thai: 128,
    Nha_Can_bang: 256,
    Nguoi_ung_ho_som: 512,
    Tho_san_loi_Cap_2: 16384,
    Nha_phat_trien_Bot_xac_minh_som: 131072
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Lấy hồ sơ, ảnh đại diện hoặc ảnh bìa của người dùng')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Chọn loại thông tin bạn muốn xem')
                .setRequired(true)
                .addChoices(
                    { name: '📄 Hồ sơ', value: 'profile' },
                    { name: '🖼️ Ảnh đại diện', value: 'avatar' },
                    { name: '🖼️ Ảnh bìa', value: 'banner' },
                    { name: '🖼️ Cả avatar & banner', value: 'both' }
                )
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Người dùng cần lấy thông tin (để trống để xem chính bạn)')
                .setRequired(false)
        ),
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
                let badges = Object.keys(badgesFlags)
                    .filter(badge => (flags & badgesFlags[badge]) === badgesFlags[badge])
                    .map(badge => badge.replace(/_/g, ' '));

                if (badges.length === 0) badges = ['Không có'];

                const userData = await UserData.findOne(
                    { userId: user.id, guildId: 'global' },
                    'xp level balance bank totalMessages inventory commandData.dailyStreak'
                );

                const creationTimestamp = Math.floor(user.createdAt.getTime() / 1000);

                let description = lang.Profile.Embed.Description.map(line =>
                    line
                        .replace('{joinDate}', `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`)
                        .replace('{role}', member.roles.highest.toString())
                        .replace('{nickname}', member.nickname || '*Không có*')
                        .replace('{userID}', user.id)
                        .replace('{user}', user.username)
                        .replace('{creationDate}', `<t:${creationTimestamp}:F>`)
                        .replace('{creationDays}', `<t:${creationTimestamp}:R>`)
                        .replace('{badges}', badges.join(', '))
                        .replace('{xp}', userData ? userData.xp.toLocaleString() : '0')
                        .replace('{level}', userData ? userData.level : '0')
                        .replace('{balance}', userData ? userData.balance.toLocaleString() : '0')
                        .replace('{bank}', userData ? userData.bank.toLocaleString() : '0')
                        .replace('{totalMessages}', userData ? userData.totalMessages.toLocaleString() : '0')
                        .replace(
                            '{inventoryItems}',
                            userData && userData.inventory.length > 0
                                ? userData.inventory
                                      .map(item => `• ${item.itemId} x${item.quantity}`)
                                      .join('\n')
                                : '*Không có*'
                        )
                        .replace(
                            '{dailyStreak}',
                            userData ? `${userData.commandData.dailyStreak} ngày` : '*Không có*'
                        )
                ).join('\n');

                embed
                    .setAuthor({
                        name: `👤 Hồ sơ của ${member.displayName}`,
                        iconURL: userIcon
                    })
                    .setDescription(description);

                if (lang.Profile.Embed.Title) {
                    embed.setTitle(lang.Profile.Embed.Title);
                }

                if (lang.Profile.Embed.Footer?.Text) {
                    const footerText = lang.Profile.Embed.Footer.Text
                        .replace('{userIcon}', userIcon)
                        .replace('{guildIcon}', guildIcon);
                    const footerIcon = (lang.Profile.Embed.Footer.Icon || '')
                        .replace('{userIcon}', userIcon)
                        .replace('{guildIcon}', guildIcon);

                    embed.setFooter({
                        text: footerText,
                        iconURL: footerIcon || undefined
                    });
                } else {
                    embed.setFooter({
                        text: `Yêu cầu bởi ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    });
                }

                if (lang.Profile.Embed.Thumbnail) {
                    embed.setThumbnail(
                        lang.Profile.Embed.Thumbnail
                            .replace('{userIcon}', userIcon)
                            .replace('{guildIcon}', guildIcon) || undefined
                    );
                } else {
                    embed.setThumbnail(userIcon);
                }

                if (lang.Profile.Embed.Image) {
                    embed.setImage(lang.Profile.Embed.Image);
                }

                await interaction.editReply({ embeds: [embed] });
            } else if (type === 'avatar') {
                embed
                    .setTitle(`🖼️ Ảnh đại diện của ${user.username}`)
                    .setDescription(
                        [
                            `> 👤 **Người dùng:** ${user.tag}`,
                            `> 🆔 **ID:** ${user.id}`,
                            '',
                            'Nhấn vào ảnh để xem kích thước đầy đủ.'
                        ].join('\n')
                    )
                    .setImage(avatarUrl)
                    .setFooter({
                        text: `${lang.AvatarSearchedBy} ${interaction.user.username}`
                    });

                await interaction.editReply({ embeds: [embed] });
            } else if (type === 'banner') {
                if (bannerUrl) {
                    embed
                        .setTitle(`🖼️ Ảnh bìa của ${user.username}`)
                        .setDescription(
                            [
                                `> 👤 **Người dùng:** ${user.tag}`,
                                `> 🆔 **ID:** ${user.id}`,
                                '',
                                'Nhấn vào ảnh để xem kích thước đầy đủ.'
                            ].join('\n')
                        )
                        .setImage(bannerUrl)
                        .setFooter({
                            text: `${lang.BannerSearchedBy} ${interaction.user.username}`
                        });

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply({
                        content: `⚠️ ${lang.NoBannerSet}`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } else if (type === 'both') {
                if (bannerUrl) {
                    embed
                        .setTitle(`🖼️ Avatar & Banner của ${user.username}`)
                        .setDescription(
                            [
                                `> 👤 **Người dùng:** ${user.tag}`,
                                `> 🆔 **ID:** ${user.id}`,
                                '',
                                'Ảnh đại diện ở thumbnail, ảnh bìa phía dưới.'
                            ].join('\n')
                        )
                        .setImage(bannerUrl)
                        .setThumbnail(avatarUrl)
                        .setFooter({
                            text: `${lang.BannerSearchedBy} ${interaction.user.username}`
                        });

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply({
                        content: `⚠️ ${lang.NoBannerSet}`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        } catch (error) {
            console.error('Lỗi trong lệnh user:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.editReply({
                    content:
                        '⚠️ Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};

