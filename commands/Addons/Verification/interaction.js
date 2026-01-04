const { ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Verification = require('../../../models/verificationSchema');
const { getConfig } = require('../../../utils/configLoader');
const { generateCaptcha } = require('../../../utils/captcha');
const { handleVerificationSuccess } = require('../../../utils/verificationUtils');

// Helper to get fresh config
const config = () => getConfig();

async function handleVerificationInteraction(client, interaction) {
    const cfg = config();
    
    // Check if it's a verification button
    const isVerifyButton = (interaction.isButton() && interaction.customId === 'verifyButton');
    const isCaptchaButton = (interaction.isButton() && (interaction.customId.startsWith('cell_') || interaction.customId === 'submit_captcha'));

    if (!isVerifyButton && !isCaptchaButton) return;

    const lang = await require('../../../utils/langLoader').getLang(interaction.guildId);

    try {
        // Fetch Verification Data from DB
        const verificationData = await Verification.findOne({ guildID: interaction.guildId });
        
        // If no data, or feature disabled, fail gracefully or check config fallback
        // The new system relies on DB.
        if (!verificationData) {
             return interaction.reply({ content: 'Verification system is not set up.', flags: MessageFlags.Ephemeral });
        }

        if (interaction.customId === 'verifyButton') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Check if already verified
            const member = interaction.member;
            // Use Role ID from DB
            const roleID = verificationData.roleID;
            
            if (roleID && member.roles.cache.has(roleID)) {
                 return interaction.editReply({ content: lang.Verify.AlreadyVerified });
            }

            const type = verificationData.mode || 'CAPTCHA';

            if (type === 'BUTTON') {
                await handleSuccess(member, verificationData);
                return interaction.editReply({ content: lang.Verify.Success });
            } 
            else if (type === 'CAPTCHA') {
                // Generate CAPTCHA
                const { captcha, captchaImage, shapePositions, targetShape } = await generateCaptcha();

                const captchaEmbed = new EmbedBuilder()
                    .setTitle(lang.Verify.CaptchaTitle)
                    .setDescription(lang.Verify.CaptchaDescription.replace('{shape}', targetShape))
                    .setImage('attachment://captcha.png')
                    .setColor(cfg.EmbedColors.Default);

                const buttonRows = [];
                const gridSize = 3;
                
                for (let row = 0; row < gridSize; row++) {
                    const actionRow = new ActionRowBuilder();
                    for (let col = 0; col < gridSize; col++) {
                        const position = row * gridSize + col + 1;
                        actionRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`cell_${position}`)
                                .setLabel(`${position}`)
                                .setStyle(ButtonStyle.Secondary)
                        );
                    }
                    buttonRows.push(actionRow);
                }

                const submitRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('submit_captcha')
                            .setLabel(lang.Verify.SubmitCaptcha)
                            .setStyle(ButtonStyle.Success)
                    );
                buttonRows.push(submitRow);

                if (!client.tempCaptchas) client.tempCaptchas = new Map();
                client.tempCaptchas.set(interaction.user.id, { answer: captcha, selected: new Set() });

                await interaction.editReply({
                    embeds: [captchaEmbed],
                    components: buttonRows,
                    files: [{ attachment: captchaImage, name: 'captcha.png' }]
                });
            }
        } 
        else if (isCaptchaButton) {
            await interaction.deferUpdate();
            
            if (!client.tempCaptchas || !client.tempCaptchas.has(interaction.user.id)) {
                 return interaction.followUp({ content: lang.Verify.Timeout, flags: MessageFlags.Ephemeral });
            }

            const session = client.tempCaptchas.get(interaction.user.id);

            if (interaction.customId === 'submit_captcha') {
                const userAnswer = Array.from(session.selected).sort().join('');
                if (userAnswer === session.answer) {
                    await handleSuccess(interaction.member, verificationData);
                    client.tempCaptchas.delete(interaction.user.id);
                    await interaction.editReply({ content: lang.Verify.Success, components: [], embeds: [], files: [] });
                } else {
                    await interaction.followUp({ content: lang.Verify.IncorrectCaptcha, flags: MessageFlags.Ephemeral });
                }
            } else if (interaction.customId.startsWith('cell_')) {
                const position = interaction.customId.split('_')[1];
                if (session.selected.has(position)) session.selected.delete(position);
                else session.selected.add(position);
                
                // Update button styles
                const msg = interaction.message;
                const newRows = msg.components.map(row => {
                    const newRow = new ActionRowBuilder();
                    row.components.forEach(comp => {
                         const btn = ButtonBuilder.from(comp);
                         if (btn.data.custom_id === `cell_${position}`) {
                             btn.setStyle(session.selected.has(position) ? ButtonStyle.Primary : ButtonStyle.Secondary);
                         }
                         const pos = btn.data.custom_id.split('_')[1];
                         if (pos && session.selected.has(pos)) btn.setStyle(ButtonStyle.Primary);
                         
                         newRow.addComponents(btn);
                    });
                    return newRow;
                });
                
                await interaction.editReply({ components: newRows });
            }
        }

    } catch (error) {
        console.error('Error in verification interaction:', error);
        if (!interaction.replied) interaction.reply({ content: lang.Verify.Error, flags: MessageFlags.Ephemeral });
    }
}

async function handleSuccess(member, data) {
    try {
        const roleID = data.roleID;
        if (roleID) {
            await member.roles.add(roleID).catch(console.error);
        }
        
        // Remove unverified role if set
        if (data.unverifiedRoleID) {
            await member.roles.remove(data.unverifiedRoleID).catch(() => null);
        }
    } catch (e) {
        console.error("Failed to add role:", e);
    }
}

module.exports = { handleVerificationInteraction };
