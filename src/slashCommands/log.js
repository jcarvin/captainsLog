const { client } = require('../configuration/bot');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('Initiate a log event '),

  async execute(interaction) {
    try {
      const confirm = new ButtonBuilder()
        .setCustomId('feeding')
        .setLabel('Feeding')
        .setEmoji('🍼')
        .setStyle(ButtonStyle.Success);

      const cancel = new ButtonBuilder()
        .setCustomId('diaperChange')
        .setLabel('Diaper change')
        .setEmoji('🧻')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(cancel, confirm);

      await interaction.reply({
        content: 'What event would you like to log?',
        components: [row],
        withResponse: true,
      });
    } catch (e) {
      console.log(`There was an error with the undefined command: ${e}`);
    }
  },
};
