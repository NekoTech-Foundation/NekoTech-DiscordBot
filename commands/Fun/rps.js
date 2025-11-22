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

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('✌️ Trò chơi Kéo Búa Bao'),
    category: 'Fun',
    async execute(interaction) {

        try {
            const embed = new EmbedBuilder()
                .setColor(lang.RockPaperScissors.Embed.Color)
                .setTitle(lang.RockPaperScissors.Embed.Title)
                .setDescription(lang.RockPaperScissors.Embed.Description)
                .addFields(
                    { name: lang.RockPaperScissors.Embed.Fields.Rock.Name, value: lang.RockPaperScissors.Embed.Fields.Rock.Value, inline: true },
                    { name: lang.RockPaperScissors.Embed.Fields.Paper.Name, value: lang.RockPaperScissors.Embed.Fields.Paper.Value, inline: true },
                    { name: lang.RockPaperScissors.Embed.Fields.Scissors.Name, value: lang.RockPaperScissors.Embed.Fields.Scissors.Value, inline: true }
                )
                .setFooter({ text: lang.RockPaperScissors.Embed.Footer.Text, iconURL: interaction.user.avatarURL() })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rock_${interaction.id}`)
                        .setLabel(lang.RockPaperScissors.Embed.Buttons.Rock.Text)
                        .setStyle(getButtonStyle(lang.RockPaperScissors.Embed.Buttons.Rock.Style.toUpperCase()))
                        .setEmoji(lang.RockPaperScissors.Embed.Buttons.Rock.Emoji),
                    new ButtonBuilder()
                        .setCustomId(`paper_${interaction.id}`)
                        .setLabel(lang.RockPaperScissors.Embed.Buttons.Paper.Text)
                        .setStyle(getButtonStyle(lang.RockPaperScissors.Embed.Buttons.Paper.Style.toUpperCase()))
                        .setEmoji(lang.RockPaperScissors.Embed.Buttons.Paper.Emoji),
                    new ButtonBuilder()
                        .setCustomId(`scissors_${interaction.id}`)
                        .setLabel(lang.RockPaperScissors.Embed.Buttons.Scissors.Text)
                        .setStyle(getButtonStyle(lang.RockPaperScissors.Embed.Buttons.Scissors.Style.toUpperCase()))
                        .setEmoji(lang.RockPaperScissors.Embed.Buttons.Scissors.Emoji),
                );

            await interaction.reply({ embeds: [embed], components: [row] });

            const filter = i => i.customId.includes(interaction.id);
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: lang.RockPaperScissors.Messages.CantPlaySomeoneElsesGame, flags: MessageFlags.Ephemeral });
                    return;
                }

                const choice = i.customId.split('_');
                const userChoice = choice[0];
                const choices = ['rock', 'paper', 'scissors'];
                const botChoice = choices[Math.floor(Math.random() * choices.length)];

                const resultEmbed = new EmbedBuilder()
                    .setColor(lang.RockPaperScissors.Embed.Color)
                    .setDescription(lang.RockPaperScissors.Messages.YourChoice.replace("{userChoice}", userChoice).replace("{botChoice}", botChoice))
                    .setFooter({ text: lang.RockPaperScissors.Messages.ThanksForPlaying, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();

                let resultMessage;
                if (userChoice === botChoice) {
                    resultMessage = lang.RockPaperScissors.Messages.Tie.replace(`{user}`, `<@${interaction.user.id}>`);
                } else if (
                    (userChoice === 'scissors' && botChoice === 'paper') ||
                    (userChoice === 'rock' && botChoice === 'scissors') ||
                    (userChoice === 'paper' && botChoice === 'rock')
                ) {
                    resultMessage = lang.RockPaperScissors.Messages.Win.replace(`{user}`, `<@${interaction.user.id}>`);
                } else {
                    resultMessage = lang.RockPaperScissors.Messages.Lost.replace(`{user}`, `<@${interaction.user.id}>`);
                }
                resultEmbed.setTitle(lang.RockPaperScissors.Embed.Title)
                resultEmbed.setDescription(resultMessage);

                await i.update({ embeds: [resultEmbed], components: [] });
            });
        } catch (error) {
            console.error(error);
        }
    },
};

function getButtonStyle(color) {
    const colorMap = {
        'PRIMARY': ButtonStyle.Primary,
        'SECONDARY': ButtonStyle.Secondary,
        'SUCCESS': ButtonStyle.Success,
        'DANGER': ButtonStyle.Danger,
    };
    return colorMap[color] || ButtonStyle.Success;
}