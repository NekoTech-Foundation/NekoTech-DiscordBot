const { PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const VoiceMaster = require('../../../models/VoiceMaster');
const VoiceMasterChannel = require('../../../models/VoiceMasterChannel');
const VoiceMasterUserSettings = require('../../../models/VoiceMasterUserSettings');
const VoiceMasterGuildSettings = require('../../../models/VoiceMasterGuildSettings');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const interactionHandler = require('./interaction_kentavoice');

// Load config
const configPath = path.join(__dirname, 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

// Helper function to check and delete empty channels
async function checkAndDeleteEmptyChannel(client, channel, category, channelData) {
    if (!channel || channel.members.size > 0) return;

    try {
        const channelId = channel.id;
        const channelName = channel.name;

        await channel.delete();
        await VoiceMasterChannel.deleteOne({ voiceId: channelId });

        // Try delete linked text channel
        const guild = channel.guild;
        let textChannel = null;

        // Priority 1: Use ID from DB
        if (channelData && channelData.textChannelId) {
            textChannel = guild.channels.cache.get(channelData.textChannelId);
        }

        // Priority 2: Fallback to name guessing (for old channels)
        if (!textChannel && category) {
            const textChannelName = `chat-${channelName.toLowerCase().replace(/\s+/g, '-')}`;
            textChannel = guild.channels.cache.find(c => c.parentId === category.id && c.name === textChannelName && c.type === 0);
        }

        if (textChannel) {
            await textChannel.delete().catch(() => { });
        }

        console.log(`[KentaVoice] Deleted empty channel: ${channelName}`);
    } catch (error) {
        console.error('Error deleting empty channel:', error);
    }
}

module.exports = {
    onLoad: async (client) => {
        console.log('KentaVoice addon loaded.');

        // Cleanup orphaned channels on startup
        client.once('ready', async () => {
            console.log('[KentaVoice] Checking for orphaned voice channels...');

            try {
                const allChannels = await VoiceMasterChannel.find({});

                for (const channelData of allChannels) {
                    // Try to find the channel in all guilds
                    let found = false;
                    for (const [guildId, guild] of client.guilds.cache) {
                        const channel = guild.channels.cache.get(channelData.voiceId);
                        if (channel) {
                            found = true;
                            // Check if it's empty
                            if (channel.members.size === 0) {
                                const voiceMaster = await VoiceMaster.findOne({ guildId: guild.id });
                                const category = voiceMaster ? guild.channels.cache.get(voiceMaster.voiceCategoryId) : null;
                                await checkAndDeleteEmptyChannel(client, channel, category, channelData);
                            }
                            break;
                        }
                    }

                    // If channel not found in any guild, remove from DB
                    if (!found) {
                        await VoiceMasterChannel.deleteOne({ voiceId: channelData.voiceId });
                        console.log(`[KentaVoice] Removed orphaned DB entry: ${channelData.voiceId}`);
                    }
                }

                console.log('[KentaVoice] Cleanup completed.');
            } catch (error) {
                console.error('[KentaVoice] Error during cleanup:', error);
            }
        });

        // Handle Interactions
        client.on('interactionCreate', async (interaction) => {
            try {
                await interactionHandler.handleInteraction(client, interaction);
            } catch (error) {
                console.error('Error handling KentaVoice interaction:', error);
            }
        });

        client.on('voiceStateUpdate', async (oldState, newState) => {
            try {
                const member = newState.member;
                const guild = newState.guild;
                const guildId = guild.id;

                // Check if user joined a voice channel
                if (!oldState.channel && newState.channel) {
                    // Get VoiceMaster settings for this guild
                    const voiceMaster = await VoiceMaster.findOne({ guildId });

                    if (!voiceMaster) return;

                    // Check if the joined channel is the "Join to Create" channel
                    if (newState.channel.id === voiceMaster.voiceChannelId) {
                        // Check cooldown
                        const existingChannel = await VoiceMasterChannel.findOne({ userId: member.id });
                        if (existingChannel) {
                            const cooldownTime = config.cooldown_seconds * 1000;
                            const timeSinceCreation = Date.now() - existingChannel.createdAt.getTime();

                            if (timeSinceCreation < cooldownTime) {
                                const remainingTime = Math.ceil((cooldownTime - timeSinceCreation) / 1000);
                                try {
                                    await member.send(`⏳ Bạn đang tạo channel quá nhanh! Vui lòng đợi ${remainingTime} giây nữa.`);
                                } catch (error) {
                                    console.log('Could not DM user about cooldown');
                                }
                                return;
                            }
                        }

                        // Get user settings
                        const userSettings = await VoiceMasterUserSettings.findOne({ userId: member.id });
                        const guildSettings = await VoiceMasterGuildSettings.findOne({ guildId });

                        // Determine channel name
                        let channelName = `${member.user.username}'s channel`;

                        // Determine channel limit (DEFAULT 0, NOT LOADED FROM USER SETTINGS AS PER REQUEST)
                        let channelLimit = 0;

                        if (userSettings && userSettings.channelName) {
                            channelName = userSettings.channelName;
                        }

                        if (guildSettings && guildSettings.channelLimit > 0) {
                            channelLimit = guildSettings.channelLimit;
                        }

                        // Get category
                        const category = guild.channels.cache.get(voiceMaster.voiceCategoryId);
                        if (!category) {
                            console.error('KentaVoice category not found');
                            return;
                        }

                        // Create voice channel
                        const newChannel = await guild.channels.create({
                            name: channelName,
                            type: 2, // Voice channel
                            parent: category.id,
                            userLimit: channelLimit
                        });

                        // Set permissions
                        await newChannel.permissionOverwrites.create(client.user, {
                            Connect: true,
                            ViewChannel: true
                        });

                        await newChannel.permissionOverwrites.create(member, {
                            Connect: true,
                            ViewChannel: true
                        });

                        // Move user to new channel
                        await member.voice.setChannel(newChannel);

                        // Save to database
                        await VoiceMasterChannel.create({
                            userId: member.id,
                            voiceId: newChannel.id,
                            createdAt: new Date()
                        });

                        // --- SEND CONTROL PANEL EMBED ---
                        const controlEmbed = new EmbedBuilder()
                            .setTitle('🎛️ KentaVoice Control Panel')
                            .setDescription(`Chào mừng **${member.user.username}**! Đây là kênh voice riêng của bạn.\nSử dụng các nút bên dưới để quản lý kênh.`)
                            .setColor('#00AAFF')
                            .addFields(
                                { name: 'Cài đặt kênh', value: 'Sửa tên, Limit, Status, Bitrate, Temp Text', inline: true },
                                { name: 'Quyền hạn', value: 'Khóa/Mở, Ẩn/Hiện, Mời, Kick', inline: true }
                            )
                            .setFooter({ text: 'KentaVoice System' });

                        // Row 1: Settings
                        const row1 = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId('kv_rename').setEmoji('✏️').setLabel('Tên').setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId('kv_limit').setEmoji('👥').setLabel('Limit').setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId('kv_status').setEmoji('💬').setLabel('Status').setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId('kv_bitrate').setEmoji('📶').setLabel('Bitrate').setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder().setCustomId('kv_temptext').setEmoji('📝').setLabel('Text').setStyle(ButtonStyle.Primary)
                            );

                        // Row 2: Permissions
                        const row2 = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId('kv_lock').setEmoji('🔒').setLabel('Khóa/Mở').setStyle(ButtonStyle.Danger),
                                new ButtonBuilder().setCustomId('kv_hide').setEmoji('👁️').setLabel('Ẩn/Hiện').setStyle(ButtonStyle.Danger),
                                new ButtonBuilder().setCustomId('kv_invite').setEmoji('📩').setLabel('Mời').setStyle(ButtonStyle.Success),
                                new ButtonBuilder().setCustomId('kv_kick').setEmoji('🚫').setLabel('Kick').setStyle(ButtonStyle.Danger),
                                new ButtonBuilder().setCustomId('kv_claim').setEmoji('👑').setLabel('Claim').setStyle(ButtonStyle.Primary)
                            );

                        await newChannel.send({ content: `${member}`, embeds: [controlEmbed], components: [row1, row2] });
                    }
                }

                // Check if someone left a voice channel
                if (oldState.channel && oldState.channel.id !== newState.channel?.id) {
                    const leftChannel = oldState.channel;

                    // Check if this is a KentaVoice managed channel
                    const channelData = await VoiceMasterChannel.findOne({ voiceId: leftChannel.id });
                    if (channelData) {
                        // Check if channel is now empty
                        if (leftChannel.members.size === 0) {
                            const voiceMaster = await VoiceMaster.findOne({ guildId: guild.id });
                            const category = voiceMaster ? guild.channels.cache.get(voiceMaster.voiceCategoryId) : null;
                            await checkAndDeleteEmptyChannel(client, leftChannel, category, channelData);
                        }
                    }
                }
            } catch (error) {
                console.error('Error in KentaVoice voiceStateUpdate:', error);
            }
        });
    }
};
