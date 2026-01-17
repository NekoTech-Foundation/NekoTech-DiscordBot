const { EmbedBuilder } = require('discord.js');

// Helper to get color safely
const getColor = () => global.config?.EmbedColor || '#FF4655';
const getFooter = () => ({ text: global.config?.Footer?.Text || 'NekoBuckets', iconURL: global.config?.Footer?.Icon || null });

// Helper to get lang
// We use a function to fetch the lang object at runtime, ensuring global.lang is available
const getLang = () => global.lang?.Valorant || {};

const noAccountEmbed = () => new EmbedBuilder()
  .setColor(getColor())
  .setFooter(getFooter())
  .addFields({
    name: 'Error Status',
    value: getLang().Errors?.NoAccount || 'Please connect your VALORANT account to your Discord ID using `/link` to view player statistics.',
    inline: true,
  });

const maintenanceEmbed = () => new EmbedBuilder()
  .setColor(getColor())
  .setFooter(getFooter())
  .addFields({
    name: 'Maintenance Status',
    value: getLang().Errors?.Maintenance || 'Valorant Tracker currently has issues in retrieving stats. Please try again later.',
    inline: true,
  });

const errorEmbed = () => new EmbedBuilder()
  .setColor(getColor())
  .setFooter(getFooter())
  .addFields({
    name: 'Error Status',
    value: getLang().Errors?.Generic || 'Please ensure the account you are trying to view has logged into tracker.gg/valorant and linked their account!',
    inline: true,
  });

const noStatsEmbed = () => new EmbedBuilder()
  .setColor(getColor())
  .setFooter(getFooter())
  .addFields({
    name: 'Error Status',
    value: getLang().Errors?.NoStats || 'This user does not have statistics to retrieve for this gamemode.',
    inline: true,
  });

const helpEmbed = () => new EmbedBuilder()
  .setColor(getColor())
  .setFooter(getFooter())
  .setTitle(getLang().Embeds?.HelpTitle || 'Valorant Tracker Commands')
  .addFields(
    {
      name: 'Competitive Stats',
      value:
        '`/lastmatch` - Last Comp Match\n' +
        '`/stats` - Competitive Stats\n' +
        '`/unrated` - Unrated Stats\n' +
        '`/spikerush` - Spike Rush Stats\n' +
        '`/deathmatch` - Deathmatch Stats\n' +
        '`/escalation` - Escalation Stats\n' +
        '`/replication` - Replication Stats\n' +
        '`/swiftplay` - Swiftplay Stats\n' +
        '`/snowball` - Snowball Stats\n' +
        '`/playtime` - Total Playtime\n' +
        '`/agent` - Top 5 Ranked Agents\n' +
        '`/weapon` - Top 5 Ranked Weapons\n' +
        '`/map` - All Ranked Map Stats',
      inline: true
    },
    {
      name: 'Utility',
      value:
        '`/link` - Link a VALORANT account\n' +
        '`/unlink` - Unlink VALORANT account\n' +
        '`/linked` - View linked account',
      inline: true
    },
    {
      name: 'Setup',
      value: getLang().Embeds?.HelpSetupValue || "1. 'Sign in with Riot ID' on https://tracker.gg/valorant\n2. Connect your VALORANT account to your Discord ID by typing `/link YOUR_USERNAME#TAG`",
      inline: false
    }
  );

function linkEmbed(args) {
  const msg = getLang().Success?.Linked?.replace('{account}', args) || `Successfully linked the VALORANT account \`${args}\` to your Discord ID.`;
  return new EmbedBuilder()
    .setColor(getColor())
    .setFooter(getFooter())
    .addFields({
      name: 'Success!',
      value: msg,
      inline: true,
    });
}

const unlinkEmbed = () => {
  const msg = getLang().Success?.Unlinked || 'Successfully unlinked any VALORANT accounts connected to your Discord ID.';
  return new EmbedBuilder()
    .setColor(getColor())
    .setFooter(getFooter())
    .addFields({
      name: 'Success!',
      value: msg,
      inline: true,
    });
}

function linkedEmbed(args) {
  const msg = getLang().Status?.Description?.replace('{account}', args) || `Your linked account is \`${args}\``;
  const title = getLang().Status?.Title || 'Status';
  return new EmbedBuilder()
    .setColor(getColor())
    .setFooter(getFooter())
    .addFields({
      name: title,
      value: msg,
      inline: true,
    });
}

const noLinkEmbed = () => new EmbedBuilder()
  .setColor(getColor())
  .setFooter(getFooter())
  .addFields({
    name: 'Error Status',
    value: getLang().Errors?.NoLink || 'You do not have an account linked!\nUse `/link USERNAME#TAG` to link a VALORANT account to your Discord ID',
    inline: true,
  });

module.exports = {
  noAccountEmbed,
  maintenanceEmbed,
  errorEmbed,
  noStatsEmbed,
  helpEmbed,
  linkEmbed,
  unlinkEmbed,
  linkedEmbed,
  noLinkEmbed
};
