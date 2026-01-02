/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
                                        
 Thank you for choosing Drako Bot!

 Should you encounter any issues, require assistance, or have suggestions for improving the bot,
 we invite you to connect with us on our Discord server and create a support ticket: 

 http://discord.drakodevelopment.net
 
*/

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const BackupModel = require('../../models/Backup');
const backup = require('discord-backup');
//const yaml = require("js-yaml");
//const fs = require('fs');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

const BACKUP_CHUNK_SIZE = 100;
const BACKUP_OPTIONS = {
    maxMessagesPerChannel: 50,
    jsonBeautify: false,
    saveImages: false,
    doNotBackup: [],
    doNotSave: [],
    getMembers: true,
    getRoles: true,
    saveRolePermissions: true,
    backupMembers: {
        enabled: true,
        roles: true,
        nickname: true
    }
};

async function createAutoBackup(guild, client) {
    try {
        const backupData = await backup.create(guild, BACKUP_OPTIONS);
        
        const backupString = JSON.stringify(backupData);
        if (backupString.length > 15000000) {
            const chunks = [];
            let currentChunk = {};
            
            if (backupData.channels) {
                for (let i = 0; i < backupData.channels.length; i += BACKUP_CHUNK_SIZE) {
                    const channelChunk = backupData.channels.slice(i, i + BACKUP_CHUNK_SIZE);
                    chunks.push({
                        ...backupData,
                        channels: channelChunk,
                        isChunk: true,
                        chunkIndex: chunks.length
                    });
                }
            }

            for (const chunk of chunks) {
                const newBackup = new BackupModel({
                    backupId: `${backupData.id}_${chunk.chunkIndex}`,
                    guildId: guild.id,
                    data: chunk,
                    createdAt: new Date(),
                    isChunk: true,
                    totalChunks: chunks.length
                });
                await newBackup.save();
            }
        } else {
            const newBackup = new BackupModel({
                backupId: backupData.id,
                guildId: guild.id,
                data: backupData,
                createdAt: new Date()
            });
            await newBackup.save();
        }

        if (config.Backup.MaxBackups > 0) {
            const allBackups = await BackupModel.find({ guildId: guild.id })
                .sort({ createdAt: -1 })
                .allowDiskUse(true);

            if (allBackups.length > config.Backup.MaxBackups) {
                const backupsToDelete = allBackups.slice(config.Backup.MaxBackups);
                for (const oldBackup of backupsToDelete) {
                    await BackupModel.deleteOne({ _id: oldBackup._id });
                }
            }
        }

        if (config.Backup.LogsChannelID) {
            const logsChannel = await client.channels.fetch(config.Backup.LogsChannelID).catch(() => null);
            if (logsChannel) {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: 'Automatic Backup Created', iconURL: 'https://i.imgur.com/7SlmRRa.png' })
                    .setColor(config.EmbedColors.Success)
                    .setDescription(`A new backup has been automatically created.\nBackup ID: ${backupData.id}`)
                    .setTimestamp();
                
                await logsChannel.send({ embeds: [embed] });
            }
        }

        return backupData.id;
    } catch (err) {
        console.error('Error creating automatic backup:', err);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription(`Manage server backups`)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a backup of the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a backup')
                .addStringOption(option => option.setName('id').setDescription('The backup ID').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('load')
                .setDescription('Load a backup')
                .addStringOption(option => option.setName('id').setDescription('The backup ID').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all server backups'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a backup')
                .addStringOption(option => option.setName('id').setDescription('The backup ID').setRequired(true))),
    category: 'Utility',
    async execute(interaction, lang) {
        const client = interaction.client;
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
        }

        const subCmd = interaction.options.getSubcommand();
        const backupID = interaction.options.getString("id");

        switch (subCmd) {
            case 'create':
                await createBackup(interaction);
                break;
            case 'delete':
                await deleteBackup(interaction, backupID);
                break;
            case 'load':
                await loadBackup(interaction, backupID);
                break;
            case 'list':
                await listBackups(interaction);
                break;
            case 'info':
                await backupInfo(interaction, backupID);
                break;
            default:
                await interaction.reply({ content: "Unknown subcommand", flags: MessageFlags.Ephemeral });
        }
    },
    createAutoBackup
};

async function createBackup(interaction) {
    const loadingEmbed = new EmbedBuilder()
        .setAuthor({ name: 'Creating Backup...', iconURL: 'https://i.imgur.com/7SlmRRa.png' })
        .setColor(config.EmbedColors?.Default || '#0099ff')
        .setDescription('⏳ Please wait while the backup is being created...')
        .setTimestamp();

    await interaction.reply({ embeds: [loadingEmbed], flags: MessageFlags.Ephemeral });
    
    try {
        const backupData = await backup.create(interaction.guild, BACKUP_OPTIONS);
        
        const backupString = JSON.stringify(backupData);
        if (backupString.length > 15000000) {
            const chunks = [];
            
            if (backupData.channels) {
                for (let i = 0; i < backupData.channels.length; i += BACKUP_CHUNK_SIZE) {
                    const channelChunk = backupData.channels.slice(i, i + BACKUP_CHUNK_SIZE);
                    chunks.push({
                        ...backupData,
                        channels: channelChunk,
                        isChunk: true,
                        chunkIndex: chunks.length
                    });
                }
            }

            for (const chunk of chunks) {
                const newBackup = new BackupModel({
                    backupId: `${backupData.id}_${chunk.chunkIndex}`,
                    guildId: interaction.guild.id,
                    data: chunk,
                    createdAt: new Date(),
                    isChunk: true,
                    totalChunks: chunks.length
                });
                await newBackup.save();
            }
        } else {
            const newBackup = new BackupModel({
                backupId: backupData.id,
                guildId: interaction.guild.id,
                data: backupData,
                createdAt: new Date()
            });
            await newBackup.save();
        }

        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Backup Created', iconURL: 'https://i.imgur.com/7SlmRRa.png' })
            .setColor(config.EmbedColors.Success)
            .setDescription(`✅ Backup created successfully!\n\n**Backup ID:** \`${backupData.id}\`\n\nUse \`/backup info ${backupData.id}\` to view details.`)
            .setFooter({ text: interaction.guild.name })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (err) {
        console.error('Error creating backup:', err);
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Error', iconURL: 'https://i.imgur.com/MdiCK2c.png' })
            .setColor(config.EmbedColors.Error)
            .setDescription('❌ An error occurred while creating the backup.\nPlease try again with fewer channels or messages.')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

async function deleteBackup(interaction, backupID) {
    try {
        const deletedBackup = await BackupModel.findOneAndDelete({ backupId: backupID });
        if (!deletedBackup) {
            const errorEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Error', iconURL: 'https://i.imgur.com/MdiCK2c.png' })
                .setColor(config.EmbedColors.Error)
                .setDescription(`❌ No backup found with ID: \`${backupID}\``)
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            return;
        }

        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Backup Deleted', iconURL: 'https://i.imgur.com/7SlmRRa.png' })
            .setColor(config.EmbedColors.Success)
            .setDescription(`✅ Successfully deleted backup with ID: \`${backupID}\``)
            .setFooter({ text: interaction.guild.name })
            .setTimestamp();
        
        await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (err) {
        console.error('Error deleting backup:', err);
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Error', iconURL: 'https://i.imgur.com/MdiCK2c.png' })
            .setColor(config.EmbedColors.Error)
            .setDescription(`❌ An error occurred while deleting the backup: ${err.message}`)
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

async function loadBackup(interaction, backupID) {
    try {
        const backupExists = await BackupModel.findOne({ backupId: backupID });
        if (!backupExists) {
            const errorEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Error', iconURL: 'https://i.imgur.com/MdiCK2c.png' })
                .setColor(config.EmbedColors.Error)
                .setDescription(`❌ No backup found with ID: \`${backupID}\``)
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            return;
        }

        const warningEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Warning', iconURL: 'https://i.imgur.com/MdiCK2c.png' })
            .setColor('#FFA500')
            .setDescription('⚠️ **IMPORTANT WARNING**\n\nLoading this backup will:\n• Delete all current channels\n• Delete all current roles\n• Reset server settings\n\nThis action cannot be undone! Are you sure you want to proceed?')
            .setFooter({ text: 'You have 30 seconds to confirm' })
            .setTimestamp();

        const loadingEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Loading Backup', iconURL: 'https://i.imgur.com/7SlmRRa.png' })
            .setColor(config.EmbedColors?.Default || '#0099ff')
            .setDescription('⏳ Loading backup, please wait...')
            .setTimestamp();

        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Backup Loaded', iconURL: 'https://i.imgur.com/7SlmRRa.png' })
            .setColor(config.EmbedColors.Success)
            .setDescription('✅ Backup loaded successfully!')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_backup')
                    .setLabel('Confirm Load')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_backup')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.reply({ embeds: [warningEmbed], components: [row], flags: MessageFlags.Ephemeral });

        try {
            const confirmation = await response.awaitMessageComponent({ time: 30_000 });

            if (confirmation.customId === 'confirm_backup') {
                await confirmation.update({ embeds: [loadingEmbed], components: [] });

                const chunks = await BackupModel.find({
                    backupId: { $regex: new RegExp(`^${backupID}_\\d+$`) },
                    isChunk: true
                }).sort({ 'data.chunkIndex': 1 });

                if (chunks.length > 0) {
                    const fullBackup = {
                        ...chunks[0].data,
                        channels: chunks.reduce((acc, chunk) => [...acc, ...chunk.data.channels], [])
                    };
                    delete fullBackup.isChunk;
                    delete fullBackup.chunkIndex;

                    await backup.load(fullBackup, interaction.guild);
                } else {
                    const backupDoc = await BackupModel.findOne({ backupId: backupID });
                    await backup.load(backupDoc.data, interaction.guild);
                }

                await confirmation.editReply({ embeds: [successEmbed], components: [] });
            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setAuthor({ name: 'Cancelled', iconURL: 'https://i.imgur.com/MdiCK2c.png' })
                    .setColor(config.EmbedColors.Error)
                    .setDescription('❌ Backup load cancelled.')
                    .setTimestamp();

                await confirmation.update({ embeds: [cancelEmbed], components: [] });
            }
        } catch (e) {
            const timeoutEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Timeout', iconURL: 'https://i.imgur.com/MdiCK2c.png' })
                .setColor(config.EmbedColors.Error)
                .setDescription('❌ Backup load cancelled - No response received within 30 seconds.')
                .setTimestamp();

            await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
        }
    } catch (err) {
        console.error('Error loading backup:', err);
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Error', iconURL: 'https://i.imgur.com/MdiCK2c.png' })
            .setColor(config.EmbedColors.Error)
            .setDescription(`❌ An error occurred while loading the backup: ${err.message}`)
            .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed], components: [] });
    }
}

async function listBackups(interaction) {
    try {
        const backups = await BackupModel.find({ guildId: interaction.guild.id })
            .sort({ createdAt: -1 })
            .allowDiskUse(true);

        if (backups.length === 0) {
            const noBackupsEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Server Backups', iconURL: interaction.guild.iconURL() })
                .setColor(config.EmbedColors.Error)
                .setDescription('❌ No backups available for this server.')
                .setTimestamp();
            
            await interaction.reply({ embeds: [noBackupsEmbed], flags: MessageFlags.Ephemeral });
            return;
        }

        const backupList = backups.map((backup, index) => {
            const timestamp = Math.floor(backup.createdAt.getTime() / 1000);
            return `\`${index + 1}.\` ID: \`${backup.backupId}\`\n📅 Created: <t:${timestamp}:F> (<t:${timestamp}:R>)`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Server Backups', iconURL: interaction.guild.iconURL() })
            .setColor(config.EmbedColors?.Default || '#0099ff')
            .setDescription(backupList)
            .addFields(
                { name: 'Total Backups', value: `\`${backups.length}\``, inline: true },
                { name: 'Max Backups', value: `\`${config.Backup.MaxBackups}\``, inline: true },
                { name: 'Auto Backup', value: config.Backup.Enabled ? '✅ Enabled' : '❌ Disabled', inline: true }
            )
            .setFooter({ text: `${interaction.guild.name} • Use /backup info <id> for more details` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (err) {
        console.error('Error listing backups:', err);
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: lang.ErrorEmbedTitle, iconURL: 'https://i.imgur.com/MdiCK2c.png' })
            .setColor(config.EmbedColors.Error)
            .setDescription('An error occurred while listing the backups.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

async function backupInfo(interaction, backupID) {
    try {
        const backupDoc = await BackupModel.findOne({ backupId: backupID });
        if (!backupDoc) {
            const errorEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Error', iconURL: 'https://i.imgur.com/MdiCK2c.png' })
                .setColor(config.EmbedColors.Error)
                .setDescription(`❌ No backup found with ID: \`${backupID}\``)
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            return;
        }

        const timestamp = Math.floor(backupDoc.createdAt.getTime() / 1000);
        const isChunked = backupDoc.data.isChunk || false;
        const size = JSON.stringify(backupDoc.data).length;
        const sizeInMB = (size / (1024 * 1024)).toFixed(2);

        const memberCount = backupDoc.data.members?.length || 0;
        const roleCount = backupDoc.data.roles?.length || 0;
        const channelCount = backupDoc.data.channels?.length || 0;

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Backup Information', iconURL: interaction.guild.iconURL() })
            .setColor(config.EmbedColors?.Default || '#0099ff')
            .setDescription(`Information about backup \`${backupID}\``)
            .addFields(
                { name: '📅 Created', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: false },
                { name: '🔍 Backup ID', value: `\`${backupDoc.backupId}\``, inline: true },
                { name: '📊 Size', value: `\`${sizeInMB} MB\``, inline: true },
                { name: '🔄 Chunked', value: isChunked ? '✅ Yes' : '❌ No', inline: true },
                { name: '👥 Members', value: `\`${memberCount.toLocaleString()}\``, inline: true },
                { name: '🎭 Roles', value: `\`${roleCount.toLocaleString()}\``, inline: true },
                { name: '📺 Channels', value: `\`${channelCount.toLocaleString()}\``, inline: true }
            )
            .setFooter({ text: `Guild ID: ${backupDoc.guildId}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (err) {
        console.error('Error retrieving backup info:', err);
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Error', iconURL: 'https://i.imgur.com/MdiCK2c.png' })
            .setColor(config.EmbedColors.Error)
            .setDescription(`❌ An error occurred while retrieving backup information: ${err.message}`)
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}