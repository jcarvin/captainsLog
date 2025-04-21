const { client } = require('./bot');
const {
  InteractionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const messageListeners = require('../events');
const {
  saveLog,
  getMostRecentFeeding,
  loadLogs,
  getAverageFeedingTimeBySide,
} = require('../utilities/logger');

module.exports = () => {
  // **************************
  // ******** Messages ********
  // **************************
  client.on('messageCreate', async (message) => {
    messageListeners['messages']?.forEach((listener) =>
      listener(message, 'create')
    );
  });

  client.on('messageDelete', async (message) => {
    messageListeners['messages']?.forEach((listener) =>
      listener(message, 'delete')
    );
  });

  client.on('messageDeleteBulk', async (message) => {
    messageListeners['messages']?.forEach((listener) =>
      listener(message, 'deleteBulk')
    );
  });

  client.on('messageUpdate', async (message) => {
    messageListeners['messages']?.forEach((listener) =>
      listener(message, 'update')
    );
  });

  client.on('messageReactionAdd', async (message) => {
    messageListeners['messageReactions']?.forEach((listener) =>
      listener(message, 'add')
    );
  });

  client.on('messageReactionRemove', async (message) => {
    messageListeners['messageReactions']?.forEach((listener) =>
      listener(message, 'remove')
    );
  });

  client.on('messageReactionRemoveEmoji', async (message) => {
    messageListeners['messageReactions']?.forEach((listener) =>
      listener(message, 'remove')
    );
  });

  client.on('messageReactionRemoveAll', async (message) => {
    messageListeners['messageReactions']?.forEach((listener) =>
      listener(message, 'removeAll')
    );
  });

  // **************************
  // ********* Guilds *********
  // **************************
  client.on('guildCreate', async (message) => {
    messageListeners['guildJoinLeave']?.forEach((listener) =>
      listener(message, 'create')
    );
  });

  client.on('guildDelete', async (message) => {
    messageListeners['guildJoinLeave']?.forEach((listener) =>
      listener(message, 'delete')
    );
  });

  client.on('guildUpdate', async (message) => {
    messageListeners['guildUpdate']?.forEach((listener) => listener(message));
  });

  client.on('guildScheduledEventCreate', async (message) => {
    messageListeners['guildScheduledEvent']?.forEach((listener) =>
      listener(message, 'create')
    );
  });

  client.on('guildScheduledEventDelete', async (message) => {
    messageListeners['guildScheduledEvent']?.forEach((listener) =>
      listener(message, 'delete')
    );
  });

  client.on('guildScheduledEventUpdate', async (message) => {
    messageListeners['guildScheduledEvent']?.forEach((listener) =>
      listener(message, 'update')
    );
  });

  client.on('guildScheduledEventUserAdd', async (message) => {
    messageListeners['guildScheduledEventsMembers']?.forEach((listener) =>
      listener(message, 'subscribe')
    );
  });

  client.on('guildScheduledEventUserRemove', async (message) => {
    messageListeners['guildScheduledEventsMembers']?.forEach((listener) =>
      listener(message, 'unsubscribe')
    );
  });

  // **************************
  // ******** Channels ********
  // **************************
  client.on('channelCreate', async (message) => {
    messageListeners['channels']?.forEach((listener) =>
      listener(message, 'create')
    );
  });

  client.on('channelDelete', async (message) => {
    messageListeners['channels']?.forEach((listener) =>
      listener(message, 'delete')
    );
  });

  client.on('channelUpdate', async (message) => {
    messageListeners['channels']?.forEach((listener) =>
      listener(message, 'update')
    );
  });

  // **************************
  // ****** Interactions ******
  // **************************
  client.on('interactionCreate', async (interaction) => {
    const interactionType = InteractionType[interaction.type];
    const feeding = getMostRecentFeeding();
    const time = new Date().getTime();
    const side = feeding?.side;
    const averageFeedingTimeInMinutes = getAverageFeedingTimeBySide(side);
    let endTime;
    let endDate;
    let hours;
    let minutes;
    let ampm;

    switch (interactionType) {
      case 'Ping':
        messageListeners['ping']?.forEach((listener) => listener(interaction));
        break;
      case 'ApplicationCommand':
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
          await command.execute(interaction);
        } catch (error) {
          await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
          });
        }

        break;
      case 'MessageComponent':
        console.log('Message component event received');
        switch (interaction.customId) {
          // feeding logic
          case 'feeding':
            const leftBoob = new ButtonBuilder()
              .setCustomId('leftBoob')
              .setLabel('Left')
              .setEmoji('👈')
              .setStyle(ButtonStyle.Success);

            const rightBoob = new ButtonBuilder()
              .setCustomId('rightBoob')
              .setLabel('Right')
              .setEmoji('👉')
              .setStyle(ButtonStyle.Success);

            const feedingButtons = new ActionRowBuilder().addComponents(
              leftBoob,
              rightBoob
            );
            await interaction.message.delete();
            await interaction.reply({
              content: 'What side did she feed from',
              components: [feedingButtons],
              withResponse: true,
            });
            break;
          case 'leftBoob':
            saveLog({
              feedings: {
                [time]: { side: 'left', startTime: time },
              },
            });
            await interaction.message.delete();
            await interaction.reply({
              content: 'Updated log!',
            });
            break;
          case 'rightBoob':
            saveLog({
              feedings: {
                [time]: { side: 'right', startTime: time },
              },
            });
            await interaction.message.delete();
            await interaction.reply({
              content: 'Updated log!',
            });
            break;
          case 'finishButton':
            saveLog({
              feedings: {
                [feeding.startTime]: {
                  ...feeding,
                  endTime: new Date().getTime(),
                },
              },
            });
            await interaction.reply({
              content: 'Updated log!',
            });
            await interaction.message.delete();
            break;
          case 'forgotButton':
            const select = new StringSelectMenuBuilder()
              .setCustomId('customTime')
              .setPlaceholder(
                `Roughly how long did she feed on the ${
                  feeding?.side || 'most recent'
                } side?`
              )
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('No idea')
                  .setValue('idk'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('10 mins')
                  .setValue('10'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('15 mins')
                  .setValue('15'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('20 mins')
                  .setValue('20'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('25 mins')
                  .setValue('25'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('30 mins')
                  .setValue('30'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('35 mins')
                  .setValue('35'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('40 mins')
                  .setValue('40'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('45 mins')
                  .setValue('45'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('50 mins')
                  .setValue('50'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('55 mins')
                  .setValue('55'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('60 mins')
                  .setValue('60')
              );

            const row = new ActionRowBuilder().addComponents(select);
            await interaction.message.delete();
            await interaction.reply({
              content: 'Lets set a manual end time real quick',
              components: [row],
              withResponse: true,
            });
            break;
          case 'customTime':
            switch (interaction.values[0]) {
              case 'idk':
                endTime =
                  feeding.startTime + averageFeedingTimeInMinutes * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format

                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes}${ampm} to give the feeding the average time of ${averageFeedingTimeInMinutes} for the ${side} side.`,
                });
                break;
              case '10':
                endTime = feeding.startTime + 10 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 10 minutes.`,
                });
                break;
              case '15':
                endTime = feeding.startTime + 15 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 15 minutes.`,
                });
                break;
              case '20':
                endTime = feeding.startTime + 20 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 20 minutes.`,
                });
                break;
              case '25':
                endTime = feeding.startTime + 25 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 25 minutes.`,
                });
                break;
              case '30':
                endTime = feeding.startTime + 30 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 30 minutes.`,
                });
                break;
              case '35':
                endTime = feeding.startTime + 35 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 35 minutes.`,
                });
                break;
              case '40':
                endTime = feeding.startTime + 40 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 40 minutes.`,
                });
                break;
              case '45':
                endTime = feeding.startTime + 45 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 45 minutes.`,
                });
                break;
              case '50':
                endTime = feeding.startTime + 50 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 50 minutes.`,
                });
                break;
              case '55':
                endTime = feeding.startTime + 55 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 55 minutes.`,
                });
                break;
              case '60':
                endTime = feeding.startTime + 60 * 60 * 1000;
                endDate = new Date(endTime);
                hours = endDate.getHours();
                minutes = endDate.getMinutes().toString().padStart(2, '0');
                ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.reply({
                  content: `Set end time to ${hours}:${minutes} to give the feeding the length of 60 minutes.`,
                });
                break;
              default:
                console.log('Unknown value');
                await interaction.message.delete();
                await interaction.reply({
                  content: 'Unable to update the log 😞',
                });
                break;
            }
            break;
          // diaper logic
          case 'diaperChange':
            const peeButton = new ButtonBuilder()
              .setCustomId('peeButton')
              .setLabel('Pee')
              .setEmoji('💧')
              .setStyle(ButtonStyle.Success);

            const poopButton = new ButtonBuilder()
              .setCustomId('poopButton')
              .setLabel('Poop')
              .setEmoji('💩')
              .setStyle(ButtonStyle.Success);

            const poopAndPeeButton = new ButtonBuilder()
              .setCustomId('poopAndPeeButton')
              .setLabel('Both')
              .setEmoji('🤠')
              .setStyle(ButtonStyle.Success);

            const diaperButtons = new ActionRowBuilder().addComponents(
              peeButton,
              poopButton,
              poopAndPeeButton
            );
            await interaction.message.delete();
            await interaction.reply({
              content: "What was in the 'package'?",
              components: [diaperButtons],
              withResponse: true,
            });
            break;
          case 'peeButton':
            saveLog({
              diaperChanges: { [new Date().getTime()]: { type: 'pee' } },
            });
            await interaction.message.delete();
            await interaction.reply({
              content: 'Updated log!',
            });
            break;
          case 'poopButton':
            saveLog({
              diaperChanges: { [new Date().getTime()]: { type: 'poop' } },
            });
            await interaction.message.delete();
            await interaction.reply({
              content: 'Updated log!',
            });
            break;
          case 'poopAndPeeButton':
            saveLog({
              diaperChanges: { [new Date().getTime()]: { type: 'both' } },
            });
            await interaction.message.delete();
            await interaction.reply({
              content: 'Updated log!',
            });
            break;
          default:
            console.log('Unknown id');
            await interaction.message.delete();
            await interaction.reply({
              content: 'Unable to update the log 😞',
            });
            break;
        }

        break;
      case 'ApplicationCommandAutocomplete':
        console.log('Command autocomplete event received');
        break;
      case 'ModalSubmit':
        console.log('Modal submit even received');
        break;

      default:
        console.log(`Unknown interaction type: ${interactionType}`);
    }
  });

  // **************************
  // ********** User **********
  // **************************
  client.on('guildMemberAdd', async (message) => {
    messageListeners['userJoinLeave']?.forEach((listener) =>
      listener(message, 'join')
    );
  });

  client.on('guildMemberRemove', async (message) => {
    messageListeners['userJoinLeave']?.forEach((listener) =>
      listener(message, 'leave')
    );
  });

  client.on('guildMemberUpdate', async (message) => {
    messageListeners['userUpdate']?.forEach((listener) =>
      listener(message, 'update')
    );
  });

  client.on('userUpdate', async (message) => {
    messageListeners['userUpdate']?.forEach((listener) =>
      listener(message, 'update')
    );
  });

  client.on('presenceUpdate', async (message) => {
    messageListeners['userPresence']?.forEach((listener) => listener(message));
  });

  client.on('typingStart', async (message) => {
    messageListeners['typingStart']?.forEach((listener) => listener(message));
  });

  // **************************
  // ********* Bans ***********
  // **************************
  client.on('guilBanAdd', async (message) => {
    messageListeners['bans']?.forEach((listener) => listener(message, 'add'));
  });

  client.on('guildBanRemove', async (message) => {
    messageListeners['bans']?.forEach((listener) =>
      listener(message, 'remove')
    );
  });

  // **************************
  // ******** Emojis **********
  // **************************
  client.on('emojiCreate', async (message) => {
    messageListeners['emojis']?.forEach((listener) =>
      listener(message, 'create')
    );
  });

  client.on('emojiDelete', async (message) => {
    messageListeners['emojis']?.forEach((listener) =>
      listener(message, 'delete')
    );
  });

  client.on('emojiUpdate', async (message) => {
    messageListeners['emojis']?.forEach((listener) =>
      listener(message, 'update')
    );
  });

  // **************************
  // ******** Invites *********
  // **************************
  client.on('inviteCreate', async (message) => {
    messageListeners['invites']?.forEach((listener) =>
      listener(message, 'create')
    );
  });

  client.on('inviteDelete', async (message) => {
    messageListeners['invites']?.forEach((listener) =>
      listener(message, 'delete')
    );
  });

  // **************************
  // ********** Bot ***********
  // **************************
  client.on('ready', async (message) => {
    messageListeners['botReady']?.forEach((listener) => listener(message));
  });

  // **************************
  // ********* Roles **********
  // **************************
  client.on('roleCreate', async (message) => {
    messageListeners['roles']?.forEach((listener) =>
      listener(message, 'create')
    );
  });

  client.on('roleDelete', async (message) => {
    messageListeners['roles']?.forEach((listener) =>
      listener(message, 'delete')
    );
  });

  client.on('roleUpdate', async (message) => {
    messageListeners['roles']?.forEach((listener) =>
      listener(message, 'update')
    );
  });

  // **************************
  // ********* Shards *********
  // **************************
  client.on('shardReady', async (shardId, unavailableGuilds) => {
    messageListeners['shards']?.forEach((listener) =>
      listener(
        {
          shardId,
          unavailableGuilds,
          event: null,
          error: null,
          replayedEvents: null,
        },
        'ready'
      )
    );
  });

  client.on('shardDisconnect', async (event, shardId) => {
    messageListeners['shards']?.forEach((listener) =>
      listener(
        {
          shardId,
          unavailableGuilds: null,
          event,
          error: null,
          replayedEvents: null,
        },
        'disconnect'
      )
    );
  });

  client.on('shardError', async (error, shardId) => {
    messageListeners['shards']?.forEach((listener) =>
      listener(
        {
          shardId,
          unavailableGuilds: null,
          event: null,
          error,
          replayedEvents: null,
        },
        'error'
      )
    );
  });

  client.on('shardReconnecting', async (shardId) => {
    messageListeners['shards']?.forEach((listener) =>
      listener(
        {
          shardId,
          unavailableGuilds: null,
          event: null,
          error: null,
          replayedEvents: null,
        },
        'reconnecting'
      )
    );
  });

  client.on('shardResume', async (shardId, replayedEvents) => {
    messageListeners['shards']?.forEach((listener) =>
      listener(
        {
          shardId,
          unavailableGuilds: null,
          event: null,
          error: null,
          replayedEvents,
        },
        'resume'
      )
    );
  });

  // **************************
  // ********* Stages *********
  // **************************
  client.on('stageInstanceCreate', async (message) => {
    messageListeners['stages']?.forEach((listener) =>
      listener(message, 'create')
    );
  });

  client.on('stageInstanceDelete', async (message) => {
    messageListeners['stages']?.forEach((listener) =>
      listener(message, 'delete')
    );
  });

  client.on('stageInstanceUpdate', async (message) => {
    messageListeners['stages']?.forEach((listener) =>
      listener(message, 'update')
    );
  });

  // **************************
  // ******** Stickers ********
  // **************************
  client.on('stickerCreate', async (message) => {
    messageListeners['stickers']?.forEach((listener) =>
      listener(message, 'create')
    );
  });

  client.on('stickerDelete', async (message) => {
    messageListeners['stickers']?.forEach((listener) =>
      listener(message, 'delete')
    );
  });

  client.on('stickerUpdate', async (message) => {
    messageListeners['stickers']?.forEach((listener) =>
      listener(message, 'update')
    );
  });

  // **************************
  // ******** Threads *********
  // **************************
  client.on('threadCreate', async (message) => {
    messageListeners['threads']?.forEach((listener) =>
      listener(message, 'create')
    );
  });

  client.on('threadDelete', async (message) => {
    messageListeners['threads']?.forEach((listener) =>
      listener(message, 'delete')
    );
  });

  client.on('threadUpdate', async (message) => {
    messageListeners['threads']?.forEach((listener) =>
      listener(message, 'update')
    );
  });

  client.on('threadMembersUpdate', async (oldMembers, newMembers) => {
    messageListeners['threadMembers']?.forEach((listener) =>
      listener(oldMembers, newMembers, 'update')
    );
  });

  client.on('threadMemberUpdate', async (oldMembers, newMembers) => {
    messageListeners['threadMembers']?.forEach((listener) =>
      listener(oldMembers, newMembers, 'update')
    );
  });

  // **************************
  // ********* Voice **********
  // **************************
  client.on('voiceStateUpdate', async (oldState, newState) => {
    messageListeners['voice']?.forEach((listener) =>
      listener(oldState, newState)
    );
  });

  // **************************
  // ******** Webhooks ********
  // **************************
  client.on('webhookUpdate', async (message) => {
    messageListeners['webhooks']?.forEach((listener) => listener(message));
  });
};
