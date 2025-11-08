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
                    
                    // Import the handler function
                    const careersModule = require('./cmd_uma_careers');
                    const { handleUmaSelection } = careersModule;
                    
                    if (handleUmaSelection) {
                        await handleUmaSelection(interaction, umaId, userId);
                    }
                } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('career_skill_purchase_')) {
                    const careersModule = require('./cmd_uma_careers');
                    const { handleCareerSkillPurchase } = careersModule;

                    if (handleCareerSkillPurchase) {
                        await handleCareerSkillPurchase(interaction);
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
