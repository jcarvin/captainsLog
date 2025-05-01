const { client } = require('../configuration/bot');

const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Shows stats about baby feedings and diaper changes'),

  async execute(interaction) {
    try {
      const yesterdayButton = new ButtonBuilder()
        .setCustomId('yesterdayButton')
        .setLabel('yesterday')
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Primary);

      const todayButton = new ButtonBuilder()
        .setCustomId('todayButton')
        .setLabel('Today')
        .setEmoji('⌚')
        .setStyle(ButtonStyle.Primary);

      const lastSevenDaysButton = new ButtonBuilder()
        .setCustomId('lastSevenDaysButton')
        .setLabel('Last seven days')
        .setEmoji('📆')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(
        yesterdayButton,
        todayButton,
        lastSevenDaysButton
      );

      await interaction.reply({
        content: 'What time period would you like stats for?',
        components: [row],
        withResponse: true,
      });
    } catch (e) {
      console.log(`There was an error with the undefined command: ${e}`);
    }
  },
};
