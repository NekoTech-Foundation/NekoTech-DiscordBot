// Uma Careers Interaction Handler
const UmaMusume = require('./schemas/UmaMusume');

module.exports = {
    run: async (client) => {
        // Listen for interactions
        client.on('interactionCreate', async (interaction) => {
            try {
                // Handle Uma Careers select menu
                if (interaction.isStringSelectMenu() && interaction.customId.startsWith('uma_careers_select_')) {
                    const userId = interaction.customId.split('_').pop();
                    
                    // Verify the user
                    if (interaction.user.id !== userId) {
                        return interaction.reply({
                            content: '❌ Bạn không thể sử dụng menu này!',
                            flags: 64
                        });
                    }

                    const umaId = interaction.values[0];
                    // Try to prompt support selection; fallback to direct creation
                    try {
                        const UserSupportCard = require('./schemas/SupportCard');
                        const cards = await UserSupportCard.find({ userId }).limit(25);
                        if (cards && cards.length > 0) {
                            const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
                            const menu = new StringSelectMenuBuilder()
                                .setCustomId(`uma_careers_support_pick_${userId}_${umaId}`)
                                .setPlaceholder('Chọn 1-6 Support Cards')
                                .setMinValues(1)
                                .setMaxValues(Math.min(6, cards.length))
                                .addOptions(cards.map(c => ({
                                    label: `${c.name} (${c.rarity})`,
                                    description: `${c.type} | Boost: ${['speed','stamina','power','guts','wisdom','wit'].filter(k => (c.trainingBoost?.[k]||0)>0).map(k=>`${k.toUpperCase()} +${c.trainingBoost[k]}%`).join(' ') || '—'}`.slice(0, 100),
                                    value: c._id.toString()
                                })));
                            const row = new ActionRowBuilder().addComponents(menu);
                            return interaction.update({ content: 'Hãy chọn 1-6 Support Cards cho Career này.', components: [row], embeds: [] });
                        }
                    } catch {}
                    const careersModule = require('./cmd_uma_careers');
                    const { handleUmaSelection } = careersModule;
                    if (handleUmaSelection) await handleUmaSelection(interaction, umaId, userId);
                } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('career_skill_purchase_')) {
                    const careersModule = require('./cmd_uma_careers');
                    const { handleCareerSkillPurchase } = careersModule;

                    if (handleCareerSkillPurchase) {
                        await handleCareerSkillPurchase(interaction);
                    }
                }
                // Support selection result
                if (interaction.isStringSelectMenu() && interaction.customId.startsWith('uma_careers_support_pick_')) {
                    const parts = interaction.customId.split('_');
                    const userId = parts[parts.length - 2];
                    const umaId = parts[parts.length - 1];
                    if (interaction.user.id !== userId) {
                        return interaction.reply({ content: 'Bạn không thể sử dụng menu này!', flags: 64 });
                    }
                    const supportDbIds = interaction.values;
                    const UserSupportCard = require('./schemas/SupportCard');
                    const supportDocs = await UserSupportCard.find({ _id: { $in: supportDbIds } }).limit(6);
                    const careersModule = require('./cmd_uma_careers');
                    const { createCareerWithSupport } = careersModule;
                    if (createCareerWithSupport && supportDocs && supportDocs.length > 0) {
                        await createCareerWithSupport(interaction, userId, umaId, supportDocs);
                    }
                }

                // Handle Uma Careers button interactions
                if (interaction.isButton()) {
                    const customId = interaction.customId;
                    
                    // Check if it's a career-related button
                    const careerButtons = [
                        'career_rest', 'career_training', 'career_skills', 'career_race',
                        'career_end', 'career_view_results', 'career_back', 'skill_shop'
                    ];
                    
                    const isCareerButton = careerButtons.includes(customId) || 
                                         customId.startsWith('train_') ||
                                         customId.startsWith('career_');
                    
                    if (isCareerButton) {
                        const careersModule = require('./cmd_uma_careers');
                        const { handleCareerInteraction } = careersModule;
                        
                        if (handleCareerInteraction) {
                            await handleCareerInteraction(interaction);
                        }
                    }
                }
            } catch (error) {
                console.error('[Uma Careers] Error handling interaction:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Đã xảy ra lỗi khi xử lý tương tác!',
                        flags: 64
                    }).catch(() => {});
                }
            }
        });
    }
};
