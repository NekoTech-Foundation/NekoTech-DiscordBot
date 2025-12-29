const { ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle, ChannelType, MessageFlags } = require('discord.js');
//const yaml = require("js-yaml");
//const fs = require('fs');


const Verification = require('../../models/verificationSchema');
const UserData = require('../../models/UserData');
const { createCanvas } = require('canvas');
const sharp = require('sharp');
const { getConfig, getLang } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();


async function createUnverifiedRoleIfNeeded(guild, verificationData) {
    if (!config.VerificationSettings.Enabled || !config.VerificationSettings.EnableUnverifiedRole) {
        return;
    }

    if (verificationData.unverifiedRoleID) {
        const existingRole = guild.roles.cache.get(verificationData.unverifiedRoleID);
        if (existingRole) {
            return;
        }
    }

    try {
        const unverifiedRole = await guild.roles.create({
            name: 'Unverified',
            color: '#FF5733',
            permissions: [],
            reason: 'Role for unverified members'
        });

        const verificationChannelID = config.VerificationSettings.ChannelID;
        guild.channels.cache.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
                if (channel.id === verificationChannelID) {
                    await channel.permissionOverwrites.create(unverifiedRole, {
                        ViewChannel: true
                    }).catch(console.error);
                } else {
                    await channel.permissionOverwrites.create(unverifiedRole, {
                        ViewChannel: false
                    }).catch(console.error);
                }
            }
        });

        verificationData.unverifiedRoleID = unverifiedRole.id;
        await verificationData.save();
    } catch (error) {
        console.error(`[ERROR] Failed to create unverified role in guild ${guild.id}: `, error);
    }
}

async function sendOrUpdateVerificationMessage(channel, verificationData) {
    if (!config.VerificationSettings.Enabled) {
        return;
    }

    let buttonStyle;

    switch (config.VerificationButton.Color.toLowerCase()) {
        case "primary":
            buttonStyle = ButtonStyle.Primary;
            break;
        case "secondary":
            buttonStyle = ButtonStyle.Secondary;
            break;
        case "success":
            buttonStyle = ButtonStyle.Success;
            break;
        case "danger":
            buttonStyle = ButtonStyle.Danger;
            break;
        default:
            buttonStyle = ButtonStyle.Secondary;
    }

    const button = new ButtonBuilder()
        .setCustomId('verifyButton')
        .setLabel(config.VerificationButton.Name)
        .setStyle(buttonStyle)
        .setEmoji(config.VerificationButton.Emoji);

    const row = new ActionRowBuilder().addComponents(button);

    const verifEmbed = new EmbedBuilder()
        .setTitle(config.VerificationEmbed.Title)
        .setColor(config.EmbedColors)
        .setDescription(config.VerificationEmbed.Description);

    if (config.VerificationEmbed.Image && config.VerificationEmbed.Image.trim() !== '') {
        verifEmbed.setImage(config.VerificationEmbed.Image);
    }

    try {
        let message;
        if (verificationData.msgID) {
            message = await channel.messages.fetch(verificationData.msgID).catch(() => null);
            if (message) {
                const isEmbedSame = message.embeds[0] && message.embeds[0].title === verifEmbed.data.title && message.embeds[0].description === verifEmbed.data.description;
                const isButtonSame = message.components[0] && message.components[0].components[0].label === button.data.label;

                if (isEmbedSame && isButtonSame) {
                    return;
                } else {
                    await message.edit({ embeds: [verifEmbed], components: [row] });
                    return;
                }
            }
        }
        message = await channel.send({ embeds: [verifEmbed], components: [row] });
        verificationData.msgID = message.id;
        await verificationData.save();
    } catch (error) {
        console.error(`[ERROR] Failed to send or update verification message: `, error);
    }
}

async function handleVerification(client, guild) {
    if (!config.VerificationSettings.Enabled) {
        return;
    }

    try {
        let verificationData = await Verification.findOne({ guildID: guild.id });
        if (!verificationData) {
            verificationData = await Verification.create({ guildID: guild.id });
        }

        const channel = guild.channels.cache.get(config.VerificationSettings.ChannelID);
        if (!channel) {
            return;
        }

        await sendOrUpdateVerificationMessage(channel, verificationData);
    } catch (error) {
        console.log(error);
    }
}

async function handleVerificationInteraction(client, interaction) {
    if (!config.VerificationSettings.Enabled || !interaction.isButton() || interaction.customId !== 'verifyButton') {
        return;
    }

    try {
        if (interaction.deferred || interaction.replied) {
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const member = interaction.member;

        const isAlreadyVerified = config.VerificationSettings.VerifiedRoleID.some(roleID => member.roles.cache.has(roleID));

        if (isAlreadyVerified) {
            await interaction.editReply({ content: lang.Verify.AlreadyVerified, flags: MessageFlags.Ephemeral });
            return;
        }

        if (config.VerificationSettings.VerificationType === 'CALCULATOR') {
            let input = '';
            let result = 0;

            const operations = ['+', '-'];
            const randomOperation = operations[Math.floor(Math.random() * operations.length)];
            const num1 = Math.floor(Math.random() * 10) + 1;
            const num2 = Math.floor(Math.random() * 10) + 1;
            const question = lang.Verify.QuestionFormat.replace('{num1}', num1).replace('{operator}', randomOperation).replace('{num2}', num2);

            try {
                result = eval(`${num1} ${randomOperation} ${num2}`);
            } catch {
                result = 'Error';
            }

            const updateEmbed = () => {
                return new EmbedBuilder()
                    .setTitle(lang.Verify.Required)
                    .setDescription(`**${question}**\n\`\`\`${input || ' '}\`\`\``)
                    .setColor(0x00AE86);
            };

            const calculatorRow = (buttons) => {
                return new ActionRowBuilder().addComponents(
                    buttons
                        .filter(b => b)
                        .map(b => new ButtonBuilder()
                            .setCustomId(`calc_${b.label}`)
                            .setLabel(b.label)
                            .setStyle(b.style)
                        )
                );
            };

            const getCalculatorButtons = () => {
                return [
                    calculatorRow([
                        { label: 'clear', style: ButtonStyle.Danger },
                        { label: '(', style: ButtonStyle.Primary },
                        { label: ')', style: ButtonStyle.Primary },
                        { label: '/', style: ButtonStyle.Primary }
                    ]),
                    calculatorRow([
                        { label: '7', style: ButtonStyle.Secondary },
                        { label: '8', style: ButtonStyle.Secondary },
                        { label: '9', style: ButtonStyle.Secondary },
                        { label: '*', style: ButtonStyle.Primary }
                    ]),
                    calculatorRow([
                        { label: '4', style: ButtonStyle.Secondary },
                        { label: '5', style: ButtonStyle.Secondary },
                        { label: '6', style: ButtonStyle.Secondary },
                        { label: '-', style: ButtonStyle.Primary }
                    ]),
                    calculatorRow([
                        { label: '1', style: ButtonStyle.Secondary },
                        { label: '2', style: ButtonStyle.Secondary },
                        { label: '3', style: ButtonStyle.Secondary },
                        { label: '+', style: ButtonStyle.Primary }
                    ]),
                    calculatorRow([
                        { label: '.', style: ButtonStyle.Secondary },
                        { label: '0', style: ButtonStyle.Secondary },
                        { label: '00', style: ButtonStyle.Secondary },
                        { label: '=', style: ButtonStyle.Success }
                    ])
                ];
            };

            let calculatorMessage = await interaction.editReply({
                embeds: [updateEmbed()],
                components: getCalculatorButtons(),
                flags: MessageFlags.Ephemeral,
            });

            const filter = i => i.user.id === interaction.user.id;

            const collector = calculatorMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId.startsWith('calc_')) {
                    const value = i.customId.split('_')[1];

                    if (value === 'clear') {
                        input = '';
                        await i.update({
                            embeds: [updateEmbed()],
                            components: getCalculatorButtons(),
                            flags: MessageFlags.Ephemeral
                        });
                    } else if (value === '=') {
                        try {
                            const userAnswer = eval(input);
                            if (userAnswer === result) {
                                input = userAnswer.toString();
                                await i.update({ content: lang.Verify.Success, components: [], flags: MessageFlags.Ephemeral });
                                await handleVerificationSuccess(interaction.member);
                                collector.stop();
                            } else {
                                input = '';
                                await i.update({
                                    embeds: [updateEmbed()],
                                    content: lang.Verify.Incorrect,
                                    components: getCalculatorButtons(),
                                    flags: MessageFlags.Ephemeral
                                });
                            }
                        } catch {
                            input = 'Error';
                            await i.update({
                                embeds: [updateEmbed()],
                                content: lang.Verify.Incorrect,
                                components: getCalculatorButtons(),
                                flags: MessageFlags.Ephemeral
                            });
                        }
                    } else {
                        input += value;
                        await i.update({
                            embeds: [updateEmbed()],
                            components: getCalculatorButtons(),
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    await interaction.editReply({ content: lang.Verify.Timeout, components: [], flags: MessageFlags.Ephemeral });
                }
            });

        } else if (config.VerificationSettings.VerificationType === 'BUTTON') {
            await handleVerificationSuccess(interaction.member);
            await interaction.editReply({ content: lang.Verify.Success, flags: MessageFlags.Ephemeral });

        } else if (config.VerificationSettings.VerificationType === 'CAPTCHA') {
            await handleCaptchaVerification(interaction);
        }

    } catch (error) {
        console.error('Error during verification process:', error);
        await interaction.editReply({ content: lang.Verify.Error, flags: MessageFlags.Ephemeral });
    }
}

async function handleCaptchaVerification(interaction) {
    const { captcha, captchaImage, shapePositions, targetShape } = await generateCaptcha();

    const captchaEmbed = new EmbedBuilder()
        .setTitle(lang.Verify.CaptchaTitle)
        .setDescription(lang.Verify.CaptchaDescription.replace('{shape}', targetShape))
        .setImage('attachment://captcha.png')
        .setColor(config.EmbedColors);

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

    await interaction.editReply({
        embeds: [captchaEmbed],
        components: buttonRows,
        files: [{ attachment: captchaImage, name: 'captcha.png' }],
        flags: MessageFlags.Ephemeral
    });

    const selectedCells = new Set();
    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId.startsWith('cell_')) {
            const position = i.customId.split('_')[1];
            
            if (selectedCells.has(position)) {
                selectedCells.delete(position);
            } else {
                selectedCells.add(position);
            }

            const components = i.message.components.map(row => {
                const newRow = new ActionRowBuilder();
                row.components.forEach(button => {
                    const newButton = ButtonBuilder.from(button);
                    if (button.customId === i.customId) {
                        newButton.setStyle(
                            button.style === ButtonStyle.Secondary ? 
                            ButtonStyle.Primary : 
                            ButtonStyle.Secondary
                        );
                    }
                    newRow.addComponents(newButton);
                });
                return newRow;
            });

            await i.update({ components });
        } else if (i.customId === 'submit_captcha') {
            const userAnswer = Array.from(selectedCells).sort().join('');
            
            if (userAnswer === captcha) {
                await handleVerificationSuccess(interaction.member);
                await i.update({ 
                    content: lang.Verify.Success, 
                    components: [], 
                    embeds: [],
                    files: [],
                    flags: MessageFlags.Ephemeral 
                });
                collector.stop();
            } else {
                await i.reply({ 
                    content: lang.Verify.IncorrectCaptcha, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    });

    collector.on('end', async collected => {
        if (collected.size === 0) {
            await interaction.editReply({ 
                content: lang.Verify.Timeout, 
                components: [], 
                embeds: [],
                files: [],
                flags: MessageFlags.Ephemeral 
            });
        }
    });
}

async function generateCaptcha() {
    const gridSize = 3;
    const cellSize = 100;
    const padding = 10;
    const width = gridSize * cellSize + (gridSize + 1) * padding;
    const height = gridSize * cellSize + (gridSize + 1) * padding;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    const shapes = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5'];
    const selectedShapes = [];
    const shapePositions = [];
    let captchaAnswer = '';

    const targetShape = shapes[Math.floor(Math.random() * shapes.length)];

    const guaranteedPositions = [];
    const targetShapeCount = 2 + Math.floor(Math.random() * 2);
    while (guaranteedPositions.length < targetShapeCount) {
        const pos = Math.floor(Math.random() * (gridSize * gridSize)) + 1;
        if (!guaranteedPositions.includes(pos)) {
            guaranteedPositions.push(pos);
        }
    }

    const availablePositions = Array.from({length: gridSize * gridSize}, (_, i) => i + 1)
        .filter(pos => !guaranteedPositions.includes(pos));

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const position = row * gridSize + col + 1;
            const x = col * (cellSize + padding) + padding;
            const y = row * (cellSize + padding) + padding;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, cellSize, cellSize);

            if (guaranteedPositions.includes(position)) {
                selectedShapes.push({ 
                    x, y, 
                    shape: targetShape, 
                    color: colors[Math.floor(Math.random() * colors.length)] 
                });
                shapePositions.push({ shape: targetShape, position: position.toString() });
                captchaAnswer += position.toString();
            }
        }
    }

    availablePositions.forEach(position => {
        if (Math.random() < 0.7) {
            const row = Math.floor((position - 1) / gridSize);
            const col = (position - 1) % gridSize;
            const x = col * (cellSize + padding) + padding;
            const y = row * (cellSize + padding) + padding;

            const availableShapes = shapes.filter(s => s !== targetShape);
            const randomShape = availableShapes[Math.floor(Math.random() * availableShapes.length)];
            
            selectedShapes.push({ 
                x, y, 
                shape: randomShape, 
                color: colors[Math.floor(Math.random() * colors.length)] 
            });
            shapePositions.push({ shape: randomShape, position: position.toString() });
        }
    });

    captchaAnswer = captchaAnswer.split('').sort().join('');

    selectedShapes.forEach(({ x, y, shape, color }) => {
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const size = cellSize * 0.6;
        const rotation = (Math.random() - 0.5) * 0.5;

        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);

        switch (shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;

            case 'square':
                ctx.fillRect(-size / 2, -size / 2, size, size);
                ctx.strokeRect(-size / 2, -size / 2, size, size);
                break;

            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(0, -size / 2);
                ctx.lineTo(size / 2, size / 2);
                ctx.lineTo(-size / 2, size / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'star':
                const spikes = 5;
                const outerRadius = size / 2;
                const innerRadius = size / 4;
                ctx.beginPath();
                for (let i = 0; i < spikes * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i * Math.PI) / spikes;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'heart':
                ctx.beginPath();
                ctx.moveTo(0, size / 4);
                ctx.bezierCurveTo(size / 4, -size / 4, size / 2, 0, 0, size / 2);
                ctx.bezierCurveTo(-size / 2, 0, -size / 4, -size / 4, 0, size / 4);
                ctx.fill();
                ctx.stroke();
                break;

            case 'diamond':
                ctx.beginPath();
                ctx.moveTo(0, -size / 2);
                ctx.lineTo(size / 2, 0);
                ctx.lineTo(0, size / 2);
                ctx.lineTo(-size / 2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
        }
        ctx.restore();
    });

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#2c3e50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < gridSize * gridSize; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const x = col * (cellSize + padding) + padding + cellSize - 20;
        const y = row * (cellSize + padding) + padding + 20;
        ctx.fillText((i + 1).toString(), x, y);
    }

    const buffer = canvas.toBuffer('image/png');
    const optimizedBuffer = await sharp(buffer)
        .png({ quality: 90, compressionLevel: 8 })
        .toBuffer();

    return { 
        captcha: captchaAnswer,
        captchaImage: optimizedBuffer,
        shapePositions: shapePositions,
        targetShape: targetShape
    };
}

async function handleJoinRoles(member) {
    
    if (config.JoinRoleSettings.Enabled) {
        
        for (const roleID of config.JoinRoleSettings.JoinRoles) {
            const role = member.guild.roles.cache.get(roleID);
            if (role) {
                await member.roles.add(role).catch(error => {
                });
            } else {
            }
        }
    }

    if (config.JoinRoleSettings.RestoreRoles.Enabled) {
        await restoreUserRoles(member);
    } else {
    }
}

async function restoreUserRoles(member) {
    try {
        
        const userData = await UserData.findOne({ userId: member.id, guildId: member.guild.id });
        
        if (!userData) {
            return;
        }
        
        if (!userData.roles || userData.roles.length === 0) {
            return;
        }
        
        const rolesToRestore = [];
        const { Blacklist, Whitelist } = config.JoinRoleSettings.RestoreRoles;
        
        const validWhitelist = Array.isArray(Whitelist) && Whitelist.length > 0 && 
                              !Whitelist.every(id => id === "ROLE_ID" || id === "");
        
        const validBlacklist = Array.isArray(Blacklist) && Blacklist.length > 0 && 
                              !Blacklist.every(id => id === "ROLE_ID" || id === "");

        for (const roleID of userData.roles) {
            const role = member.guild.roles.cache.get(roleID);

            if (!role) {
                continue;
            }
            
            let skipRole = false;

            if (validWhitelist && !Whitelist.includes(roleID)) {
                skipRole = true;
            }

            if (validBlacklist && Blacklist.includes(roleID)) {
                skipRole = true;
            }
            
            if (!skipRole) {
                rolesToRestore.push(roleID);
            }
        }

        for (const roleID of rolesToRestore) {
            const role = member.guild.roles.cache.get(roleID);
            await member.roles.add(roleID).catch(error => {
            });
        }
        
    } catch (error) {
        console.error(`Error restoring user roles for ${member.user.tag}:`, error);
    }
}

async function handleVerificationSuccess(member) {
    try {
        
        const guildMember = await member.guild.members.fetch(member.id).catch(() => null);
        if (!guildMember) {
            return;
        }

        if (config.VerificationSettings.VerifiedRoleID && config.VerificationSettings.VerifiedRoleID.length > 0) {
            for (const roleID of config.VerificationSettings.VerifiedRoleID) {
                await guildMember.roles.add(roleID).catch(error => {
                });
            }
        }
        
        if (config.VerificationSettings.RoleToRemove) {
            await guildMember.roles.remove(config.VerificationSettings.RoleToRemove).catch(error => {
            });
        }

        if (config.VerificationSettings.EnableUnverifiedRole) {
            const verificationData = await Verification.findOne({ guildID: member.guild.id });
            if (verificationData && verificationData.unverifiedRoleID) {
                const unverifiedRole = member.guild.roles.cache.get(verificationData.unverifiedRoleID);
                if (unverifiedRole && guildMember.roles.cache.has(unverifiedRole.id)) {
                    await guildMember.roles.remove(unverifiedRole).catch(error => {
                    });
                }
            }
        }

        await handleJoinRoles(guildMember);
    } catch (error) {
        console.log(`[VERIFICATION] Error during verification success handling for member ${member.id}: ${error.message}`);
    }
}

module.exports = { handleVerification, createUnverifiedRoleIfNeeded, handleVerificationInteraction, handleJoinRoles };