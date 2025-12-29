const { ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Verification = require('../../models/verificationSchema');
const { getConfig, getLang } = require('../../utils/configLoader');
const { generateCaptcha } = require('../../utils/captcha');
const { handleVerificationSuccess, createUnverifiedRoleIfNeeded } = require('../../utils/verificationUtils');

// Helper to get fresh config/lang
const config = () => getConfig();
// Lang needs to be fetched per guild ideally, or use default if global event
// Since this is event driven, we can fetch lang inside the function

async function sendOrUpdateVerificationMessage(channel, verificationData, guildId) {
    const cfg = config();
    if (!cfg.VerificationSettings?.Enabled) return;

    const lang = await require('../../utils/langLoader').getLang(guildId);
    
    const settings = cfg.VerificationSettings;
    const btnParams = settings.VerificationButton;
    
    let buttonStyle = ButtonStyle.Secondary;
    if (btnParams.Color === 'PRIMARY') buttonStyle = ButtonStyle.Primary;
    else if (btnParams.Color === 'SUCCESS') buttonStyle = ButtonStyle.Success;
    else if (btnParams.Color === 'DANGER') buttonStyle = ButtonStyle.Danger;

    const button = new ButtonBuilder()
        .setCustomId('verifyButton')
        .setLabel(btnParams.Name)
        .setStyle(buttonStyle)
        .setEmoji(btnParams.Emoji);

    const row = new ActionRowBuilder().addComponents(button);

    const verifEmbed = new EmbedBuilder()
        .setTitle(settings.VerificationEmbed.Title)
        .setColor(cfg.EmbedColors.Default)
        .setDescription(settings.VerificationEmbed.Description);

    if (settings.VerificationEmbed.Image) {
        verifEmbed.setImage(settings.VerificationEmbed.Image);
    }

    try {
        let message;
        if (verificationData.msgID) {
            message = await channel.messages.fetch(verificationData.msgID).catch(() => null);
            if (message) {
                 // Check if update needed
                 await message.edit({ embeds: [verifEmbed], components: [row] });
                 return;
            }
        }
        message = await channel.send({ embeds: [verifEmbed], components: [row] });
        verificationData.msgID = message.id;
        await verificationData.save();
    } catch (error) {
        console.error(`[ERROR] Failed to send/update verification message: `, error);
    }
}

async function handleVerification(client, guild) {
    const cfg = config();
    if (!cfg.VerificationSettings?.Enabled) return;

    try {
        let verificationData = await Verification.findOne({ guildID: guild.id });
        if (!verificationData) {
            verificationData = await Verification.create({ guildID: guild.id });
        }

        const channel = guild.channels.cache.get(cfg.VerificationSettings.ChannelID);
        if (!channel) return;

        await sendOrUpdateVerificationMessage(channel, verificationData, guild.id);
        
        if (cfg.VerificationSettings.EnableUnverifiedRole) {
            await createUnverifiedRoleIfNeeded(guild, verificationData);
        }
    } catch (error) {
        console.error(error);
    }
}

async function handleVerificationInteraction(client, interaction) {
    const cfg = config();
    if (!cfg.VerificationSettings?.Enabled) return;
    
    // Check if it's a verification button
    const isVerifyButton = (interaction.isButton() && interaction.customId === 'verifyButton');
    const isCaptchaButton = (interaction.isButton() && (interaction.customId.startsWith('cell_') || interaction.customId === 'submit_captcha'));

    if (!isVerifyButton && !isCaptchaButton) return;

    const lang = await require('../../utils/langLoader').getLang(interaction.guildId);

    try {
        if (interaction.customId === 'verifyButton') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Check if already verified
            const member = interaction.member;
            const isVerified = cfg.VerificationSettings.VerifiedRoleID.some(roleID => member.roles.cache.has(roleID));
            
            if (isVerified) {
                 return interaction.editReply({ content: lang.Verify.AlreadyVerified });
            }

            const type = cfg.VerificationSettings.VerificationType;

            if (type === 'BUTTON') {
                await handleVerificationSuccess(member);
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

                // Store answer in interaction client cache or temporary map?
                // Simplest is to rely on stateless check if possible, but we generated a random captcha.
                // We must store it.
                // For simplicity in this event rewrite, I'll attach it to the client.tempCaptchas
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
            // Handle Captcha Interaction (Cell click or Submit)
            // Note: Since we deferred reply in 'verifyButton', these subsequent clicks 
            // will be new interactions on the ephemeral message components.
            // We need to update *that* message.
            
            await interaction.deferUpdate();
            
            if (!client.tempCaptchas || !client.tempCaptchas.has(interaction.user.id)) {
                 return interaction.followUp({ content: lang.Verify.Timeout, flags: MessageFlags.Ephemeral });
            }

            const session = client.tempCaptchas.get(interaction.user.id);

            if (interaction.customId === 'submit_captcha') {
                const userAnswer = Array.from(session.selected).sort().join('');
                if (userAnswer === session.answer) {
                    await handleVerificationSuccess(interaction.member);
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
                         // Re-apply style for other selected cells to be safe/consistent
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


module.exports = { handleVerification, handleVerificationInteraction };