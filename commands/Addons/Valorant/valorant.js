const { SlashCommandBuilder } = require('discord.js');

const stats = require('./handlers/stats');
const unrated = require('./handlers/unrated');
const spikerush = require('./handlers/spikerush');
const deathmatch = require('./handlers/deathmatch');
const escalation = require('./handlers/escalation');
const replication = require('./handlers/replication');
const swiftplay = require('./handlers/swiftplay');
const snowball = require('./handlers/snowball');
const link = require('./handlers/link');
const unlink = require('./handlers/unlink');
const linked = require('./handlers/linked');
const agent = require('./handlers/agent');
const weapon = require('./handlers/weapon');
const map = require('./handlers/map');
const playtime = require('./handlers/playtime');
const lastmatch = require('./handlers/lastmatch');

const usernameTagOption = (option) =>
    option
        .setName('username-tag')
        .setDescription('Your VALORANT Username and Tagline (ex: CMDRVo#CMDR)')
        .setRequired(false);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('valorant')
        .setDescription('Valorant Tracker Commands')
        .addSubcommand((subcommand) =>
            subcommand.setName('stats').setDescription('Get overall competitive stats for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('unrated').setDescription('Get unrated stats for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('spikerush').setDescription('Get Spike Rush stats for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('deathmatch').setDescription('Get Deathmatch stats for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('escalation').setDescription('Get Escalation stats for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('replication').setDescription('Get Replication stats for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('swiftplay').setDescription('Get Swiftplay stats for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('snowball').setDescription('Get Snowball Fight stats for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('link').setDescription('Link your VALORANT account to your Discord ID').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('unlink').setDescription('Unlink a VALORANT account from your Discord ID')
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('linked').setDescription('View your linked VALORANT account')
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('agent').setDescription('Get top 5 ranked agents for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('weapon').setDescription('Get top 5 ranked weapons for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('map').setDescription('Get all ranked map stats for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('playtime').setDescription('Get total playtime for a VALORANT user').addStringOption(usernameTagOption)
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('lastmatch').setDescription('Get last competitive match stats for a VALORANT user').addStringOption(usernameTagOption)
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'stats':
                await stats.execute(interaction, client);
                break;
            case 'unrated':
                await unrated.execute(interaction, client);
                break;
            case 'spikerush':
                await spikerush.execute(interaction, client);
                break;
            case 'deathmatch':
                await deathmatch.execute(interaction, client);
                break;
            case 'escalation':
                await escalation.execute(interaction, client);
                break;
            case 'replication':
                await replication.execute(interaction, client);
                break;
            case 'swiftplay':
                await swiftplay.execute(interaction, client);
                break;
            case 'snowball':
                await snowball.execute(interaction, client);
                break;
            case 'link':
                await link.execute(interaction, client);
                break;
            case 'unlink':
                await unlink.execute(interaction, client);
                break;
            case 'linked':
                await linked.execute(interaction, client);
                break;
            case 'agent':
                await agent.execute(interaction, client);
                break;
            case 'weapon':
                await weapon.execute(interaction, client);
                break;
            case 'map':
                await map.execute(interaction, client);
                break;
            case 'playtime':
                await playtime.execute(interaction, client);
                break;
            case 'lastmatch':
                await lastmatch.execute(interaction, client);
                break;
            default:
                await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
        }
    },
};
