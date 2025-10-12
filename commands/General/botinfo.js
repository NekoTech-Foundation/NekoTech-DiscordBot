const { SlashCommandBuilder, MessageFlags, EmbedBuilder, version: discordVersion } = require('discord.js');
//const moment = require('moment');
const os = require('os');
const process = require('process');
const { version } = require('../../package.json');
const { getConfig, getLang } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Thong tin ve bot(CPU,RAM,USAGE...)'),
    category: 'General',
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const bot = interaction.client;
            const uptimeTimestamp = Math.floor((Date.now() - bot.uptime) / 1000);
            const memoryUsage = process.memoryUsage();
            const totalMemory = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);

            const totalSystemMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const freeSystemMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
            const usedSystemMemory = (totalSystemMemory - freeSystemMemory).toFixed(2);

            const formatMemory = (total, used) => {
                if (total > 6144) {
                    return `${(used / 1024).toFixed(2)} GB / ${(total / 1024).toFixed(2)} GB`;
                }
                return `${used} MB / ${total} MB`;
            };

            let cpuModel = os.cpus()[0].model;
            const coreCount = os.cpus().length;
          //  const nodeVersion = process.version;
          //  const platform = `${os.type()} ${os.release()}`;

            const createdAt = `<t:${Math.floor(bot.user.createdAt / 1000)}:R>`;
            const joinedAt = interaction.guild.members.cache.get(bot.user.id)?.joinedAt
                ? `<t:${Math.floor(interaction.guild.members.cache.get(bot.user.id).joinedAt / 1000)}:R>`
                : 'Unknown';

            let sent;
            try {
                sent = await interaction.fetchReply();
            } catch (error) {
                console.error('Failed to fetch reply:', error);
                return;
            }
            
            const pingLatency = sent.createdTimestamp - interaction.createdTimestamp;
         //   const wsLatency = bot.ws.ping;

            cpuModel = cpuModel.replace(/\s\d+-Core Processor/, '');

            const botInfo = new EmbedBuilder()
                .setAuthor({ name: bot.user.username, iconURL: bot.user.displayAvatarURL() })
                .setTitle(lang.BotInfo.Embed.Title)
                .setColor(lang.BotInfo.Embed.Color)
                .setThumbnail(bot.user.displayAvatarURL())
                .addFields(
                    { 
                        name: lang.BotInfo.Embed.Fields.BotDetails.Name,
                        value: lang.BotInfo.Embed.Fields.BotDetails.Value
                            .replace('{name}', bot.user.username)
                            .replace('{id}', bot.user.id)
                            .replace('{version}', version)
                            .replace('{createdAt}', createdAt)
                            .replace('{joinedAt}', joinedAt)
                            .replace('{starts}', await getBotStarts(interaction.guild.id)),
                        inline: false
                    },
                    {
                        name: lang.BotInfo.Embed.Fields.Statistics.Name,
                        value: lang.BotInfo.Embed.Fields.Statistics.Value
                            .replace('{users}', bot.users.cache.size)
                            .replace('{channels}', bot.channels.cache.size)
                            .replace('{commands}', bot.commands.size)
                            .replace('{uptime}', `<t:${uptimeTimestamp}:R>`),
                        inline: true
                    },
                    {
                        name: lang.BotInfo.Embed.Fields.Technical.Name,
                        value: lang.BotInfo.Embed.Fields.Technical.Value
                            .replace('{discordVersion}', discordVersion)
                            .replace('{cpuModel}', cpuModel)
                            .replace('{cpuCores}', coreCount),
                        inline: true
                    },
                    {
                        name: lang.BotInfo.Embed.Fields.Performance.Name,
                        value: lang.BotInfo.Embed.Fields.Performance.Value
                            .replace('{botMemory}', formatMemory(totalMemory, usedMemory))
                            .replace('{systemMemory}', `${usedSystemMemory}GB / ${totalSystemMemory}GB`)
                            .replace('{ping}', pingLatency),
                        inline: false
                    }
                )
                .setFooter({ 
                    text: lang.BotInfo.Embed.Footer.Text.replace('{user}', interaction.user.tag), 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();

            try {
                await interaction.editReply({ embeds: [botInfo] });
            } catch (error) {
                if (error.code === 10062) {
                    console.error('Interaction expired before we could edit the reply');
                } else {
                    console.error('Error editing reply:', error);
                }
            }
        } catch (error) {
            console.error('Error in botinfo command: ', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: lang.BotInfo.ErrorMessage, 
                        flags: MessageFlags.Ephemeral 
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({ 
                        content: lang.BotInfo.ErrorMessage 
                    });
                }
            } catch (replyError) {
                console.error('Failed to reply with error message:', replyError);
            }
        }
    }
};

async function getBotStarts(guildId) {
    const GuildData = require('../../models/guildDataSchema');
    const guildData = await GuildData.findOne({ guildID: guildId });
    return guildData ? guildData.timesBotStarted.toString() : '0';
}