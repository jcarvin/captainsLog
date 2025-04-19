const { client } = require("../configuration/bot");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("log")
    .setDescription("Initiate a log event "),

  async execute(interaction) {
    try {
      const confirm = new ButtonBuilder()
        .setCustomId("confirm")
        .setLabel("Confirm Ban")
        .setStyle(ButtonStyle.Danger);

      const cancel = new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(cancel, confirm);

      const response = await interaction.reply({
        content: "Pong",
        components: [row],
        withResponse: true,
      });
      try {
        console.log("what is this", response);
        const confirmation =
          await response.resource.message.awaitMessageComponent({
            time: 60_000,
          });

        console.log("confirmation", confirmation);
      } catch (e) {
        console.log(`There was an error with the undefined command: ${e}`);
      }
    } catch (e) {
      console.log(`There was an error with the undefined command: ${e}`);
    }
  },
};
