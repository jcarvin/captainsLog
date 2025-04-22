const { client } = require('../configuration/bot');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getMostRecentFeeding } = require('../utilities/logger');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('Initiate a log event '),

  async execute(interaction) {
    try {
      const feeding = getMostRecentFeeding();
      const finishedMostRecentFeeding = !feeding || !!feeding?.endTime;
      const mostRecentSide = feeding?.side;
      const isPaused = !feeding || !!feeding?.pauseTime;
      if (finishedMostRecentFeeding) {
        const feedingButton = new ButtonBuilder()
          .setCustomId('feeding')
          .setLabel('Feeding')
          .setEmoji('🍼')
          .setStyle(ButtonStyle.Success);

        const diaperButton = new ButtonBuilder()
          .setCustomId('diaperChange')
          .setLabel('Diaper change')
          .setEmoji('🧻')
          .setStyle(ButtonStyle.Success);

        const fussyButton = new ButtonBuilder()
          .setCustomId('fussyButton')
          .setLabel('Fussy')
          .setEmoji('😫')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(
          diaperButton,
          feedingButton,
          fussyButton
        );

        await interaction.reply({
          content: 'What event would you like to log?',
          components: [row],
          withResponse: true,
        });
      } else {
        const finishButton = new ButtonBuilder()
          .setCustomId('finishButton')
          .setLabel('Finish now')
          .setEmoji('🏁')
          .setStyle(ButtonStyle.Success);
        const forgotButton = new ButtonBuilder()
          .setCustomId('forgotButton')
          .setLabel('I forgot')
          .setEmoji('😳')
          .setStyle(ButtonStyle.Danger);
        const pauseButton = new ButtonBuilder()
          .setCustomId('pauseButton')
          .setLabel('Pause feeding')
          .setEmoji('⏸️')
          .setStyle(ButtonStyle.Primary);
        const resumeButton = new ButtonBuilder()
          .setCustomId('resumeButton')
          .setLabel('Resume feeding')
          .setEmoji('▶️')
          .setStyle(ButtonStyle.Primary);
        const dynamicActionButton = isPaused ? resumeButton : pauseButton;

        const endFeedingButtons = new ActionRowBuilder().addComponents(
          finishButton,
          forgotButton,
          dynamicActionButton
        );
        await interaction.reply({
          content: `Would you like to end the most recent feeding on the ${mostRecentSide} side?`,
          components: [endFeedingButtons],
          withResponse: true,
        });
      }
    } catch (e) {
      console.log(`There was an error with the undefined command: ${e}`);
    }
  },
};
