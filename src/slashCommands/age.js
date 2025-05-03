const { client } = require('../configuration/bot');

const { SlashCommandBuilder } = require('@discordjs/builders');
const { getBabyAgeString } = require('../utilities/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('age')
    .setDescription('Calculates Wrens current age'),

  async execute(interaction) {
    try {
      const wrensAge = getBabyAgeString();

      await interaction.reply({
        content: `Wren is ${wrensAge} old as of today!`,
      });
    } catch (e) {
      console.log(`There was an error with the undefined command: ${e}`);
    }
  },
};
