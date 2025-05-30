const { client } = require('./bot');
const {
  InteractionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
} = require('discord.js');
const messageListeners = require('../events');
const {
  saveLog,
  buildTimestamp,
  getMostRecentFeeding,
  getMostRecentPump,
  getMostRecentSleep,
  getMostRecentMidnight,
  getAverageFeedingTimeBySide,
  buildTimeDiff,
  getDailyStats,
  getTimePeriodStats,
  roundToNearestTenth,
} = require('../utilities/logger');

function buildFeedEmoji(type, side) {
  return `${
    type === 'start'
      ? '🍼'
      : type === 'pause'
      ? '⏸️'
      : type === 'resume'
      ? '▶️'
      : '🏁'
  }${side === 'left' ? '👈' : '👉'}`;
}

function buildNextFeedTime(endTime) {
  nextTime = endTime + 180 * 60 * 1000;
  return `\n Next feed ETA: ${buildTimestamp(nextTime)}`;
}

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
    const pump = getMostRecentPump();
    const time = new Date().getTime();
    const side = feeding?.side;
    const averageFeedingTimeInMinutes = getAverageFeedingTimeBySide(side);
    let endTime;

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

            const bottleButton = new ButtonBuilder()
              .setCustomId('bottleButton')
              .setLabel('Bottle')
              .setEmoji('🍼')
              .setStyle(ButtonStyle.Success);

            // const manualStartButton = new ButtonBuilder()
            //   .setCustomId('manualStartButton')
            //   .setLabel('Manual')
            //   .setEmoji('🍼')
            //   .setStyle(ButtonStyle.Primary);

            const feedingButtons = new ActionRowBuilder().addComponents(
              leftBoob,
              rightBoob,
              bottleButton
              // manualStartButton
            );
            await interaction.message.delete();
            await interaction.channel.send({
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
            await interaction.channel.send({
              content: `${buildFeedEmoji(
                'start',
                'left'
              )} Feeding started on left side at ${buildTimestamp(time)}`,
            });
            break;
          case 'rightBoob':
            saveLog({
              feedings: {
                [time]: { side: 'right', startTime: time },
              },
            });
            await interaction.message.delete();
            await interaction.channel.send({
              content: `${buildFeedEmoji(
                'start',
                'right'
              )} Feeding started on right side at ${buildTimestamp(time)}`,
            });
            break;
          case 'bottleButton':
            saveLog({
              feedings: {
                [time]: {
                  side: 'bottle',
                  startTime: time,
                },
              },
            });
            const ozSelect = new StringSelectMenuBuilder()
              .setCustomId('bottleOzs')
              .setPlaceholder(`Roughly how many ounces did she eat?`)
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('.5oz')
                  .setValue('.5'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('1oz')
                  .setValue('1'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('1.5oz')
                  .setValue('1.5'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('2oz')
                  .setValue('2'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('2.5oz')
                  .setValue('2.5'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('3oz')
                  .setValue('3'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('3.5oz')
                  .setValue('3.5'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('4oz')
                  .setValue('4'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('4.5oz')
                  .setValue('4.5'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('5oz')
                  .setValue('5')
              );
            const ozRow = new ActionRowBuilder().addComponents(ozSelect);
            await interaction.message.delete();
            await interaction.channel.send({
              content: 'Set feeding amount',
              components: [ozRow],
              withResponse: true,
            });
            break;
          case 'pumpButton':
            saveLog({
              pumps: {
                [time]: {
                  startTime: time,
                },
              },
            });
            const pumpSelect = new StringSelectMenuBuilder()
              .setCustomId('pumpOz')
              .setPlaceholder(`Roughly how many ounces did you paump?`)
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('.5oz')
                  .setValue('.5'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('1oz')
                  .setValue('1'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('1.5oz')
                  .setValue('1.5'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('2oz')
                  .setValue('2'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('2.5oz')
                  .setValue('2.5'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('3oz')
                  .setValue('3'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('3.5oz')
                  .setValue('3.5'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('4oz')
                  .setValue('4'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('4.5oz')
                  .setValue('4.5'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('5oz')
                  .setValue('5')
              );
            const pumpRow = new ActionRowBuilder().addComponents(pumpSelect);
            await interaction.message.delete();
            await interaction.channel.send({
              content: 'Set pump amount',
              components: [pumpRow],
              withResponse: true,
            });
            break;
          case 'bottleOzs':
            switch (interaction.values[0]) {
              case '.5':
                endTime = time;
                amountOz = 0.5;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🍼 Ended bottle feeding at ${buildTimestamp(
                    time
                  )} and set amount to .5oz. ${buildNextFeedTime(
                    feeding?.pauseTime || time
                  )}`,
                });
                break;
              case '1':
                endTime = time;
                amountOz = 1;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🍼 Ended bottle feeding at ${buildTimestamp(
                    time
                  )} and set amount to 1oz. ${buildNextFeedTime(
                    feeding?.pauseTime || time
                  )}`,
                });
                break;
              case '1.5':
                endTime = time;
                amountOz = 1.5;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🍼 Ended bottle feeding at ${buildTimestamp(
                    time
                  )} and set amount to 1.5oz. ${buildNextFeedTime(
                    feeding?.pauseTime || time
                  )}`,
                });
                break;
              case '2':
                endTime = time;
                amountOz = 2;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🍼 Ended bottle feeding at ${buildTimestamp(
                    time
                  )} and set amount to 2oz. ${buildNextFeedTime(
                    feeding?.pauseTime || time
                  )}`,
                });
                break;
              case '2.5':
                endTime = time;
                amountOz = 2.5;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🍼 Ended bottle feeding at ${buildTimestamp(
                    time
                  )} and set amount to 2.5oz. ${buildNextFeedTime(
                    feeding?.pauseTime || time
                  )}`,
                });
                break;
              case '3':
                endTime = time;
                amountOz = 3;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🍼 Ended bottle feeding at ${buildTimestamp(
                    time
                  )} and set amount to 3oz. ${buildNextFeedTime(
                    feeding?.pauseTime || time
                  )}`,
                });
                break;
              case '3.5':
                endTime = time;
                amountOz = 3.5;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🍼 Ended bottle feeding at ${buildTimestamp(
                    time
                  )} and set amount to 3.5oz. ${buildNextFeedTime(
                    feeding?.pauseTime || time
                  )}`,
                });
                break;
              case '4':
                endTime = time;
                amountOz = 4;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🍼 Ended bottle feeding at ${buildTimestamp(
                    time
                  )} and set amount to 4oz. ${buildNextFeedTime(
                    feeding?.pauseTime || time
                  )}`,
                });
                break;
              case '4.5':
                endTime = time;
                amountOz = 4.5;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🍼 Ended bottle feeding at ${buildTimestamp(
                    time
                  )} and set amount to 4.5oz. ${buildNextFeedTime(
                    feeding?.pauseTime || time
                  )}`,
                });
                break;
              case '5':
                endTime = time;
                amountOz = 5;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🍼 Ended bottle feeding at ${buildTimestamp(
                    time
                  )} and set amount to 5oz. ${buildNextFeedTime(
                    feeding?.pauseTime || time
                  )}`,
                });
                break;
              default:
                console.log('Unknown value');
                // await interaction.message.delete();
                // await interaction.reply({
                //   content: 'Unable to update the log 😞',
                // });
                break;
            }
            break;
          case 'pumpOz':
            switch (interaction.values[0]) {
              case '.5':
                endTime = time;
                amountOz = 0.5;
                saveLog({
                  pumps: {
                    [pump.startTime]: {
                      ...pump,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🐄 Logged pump at ${buildTimestamp(
                    time
                  )} and set amount to .5oz.`,
                });
                break;
              case '1':
                endTime = time;
                amountOz = 1;
                saveLog({
                  pumps: {
                    [pump.startTime]: {
                      ...pump,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🐄 Logged pump at ${buildTimestamp(
                    time
                  )} and set amount to 1oz.`,
                });
                break;
              case '1.5':
                endTime = time;
                amountOz = 1.5;
                saveLog({
                  pumps: {
                    [pump.startTime]: {
                      ...pump,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🐄 Logged pump at ${buildTimestamp(
                    time
                  )} and set amount to 1.5oz.`,
                });
                break;
              case '2':
                endTime = time;
                amountOz = 2;
                saveLog({
                  pumps: {
                    [pump.startTime]: {
                      ...pump,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🐄 Logged pump at ${buildTimestamp(
                    time
                  )} and set amount to 2oz.`,
                });
                break;
              case '2.5':
                endTime = time;
                amountOz = 2.5;
                saveLog({
                  pumps: {
                    [pump.startTime]: {
                      ...pump,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🐄 Logged pump at ${buildTimestamp(
                    time
                  )} and set amount to 2.5oz.`,
                });
                break;
              case '3':
                endTime = time;
                amountOz = 3;
                saveLog({
                  pumps: {
                    [pump.startTime]: {
                      ...pump,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🐄 Logged pump at ${buildTimestamp(
                    time
                  )} and set amount to 3oz.`,
                });
                break;
              case '3.5':
                endTime = time;
                amountOz = 3.5;
                saveLog({
                  pumps: {
                    [pump.startTime]: {
                      ...pump,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🐄 Logged pump at ${buildTimestamp(
                    time
                  )} and set amount to 3.5oz.`,
                });
                break;
              case '4':
                endTime = time;
                amountOz = 4;
                saveLog({
                  pumps: {
                    [pump.startTime]: {
                      ...pump,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🐄 Logged pump at ${buildTimestamp(
                    time
                  )} and set amount to 4oz.`,
                });
                break;
              case '4.5':
                endTime = time;
                amountOz = 4.5;
                saveLog({
                  pumps: {
                    [pump.startTime]: {
                      ...pump,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🐄 Logged pump at ${buildTimestamp(
                    time
                  )} and set amount to 4.5oz.`,
                });
                break;
              case '5':
                endTime = time;
                amountOz = 5;
                saveLog({
                  pumps: {
                    [pump.startTime]: {
                      ...pump,
                      endTime,
                      amountOz,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `🏁🐄 Logged pump at ${buildTimestamp(
                    time
                  )} and set amount to 5oz.`,
                });
                break;
              default:
                console.log('Unknown value');
                // await interaction.message.delete();
                // await interaction.reply({
                //   content: 'Unable to update the log 😞',
                // });
                break;
            }
            break;
          case 'finishButton':
            const deductions =
              feeding?.deductions?.reduce((sum, current) => sum + current, 0) ||
              0;
            const duration = Math.floor(
              ((feeding?.pauseTime || time) - feeding.startTime - deductions) /
                (1000 * 60)
            );
            saveLog({
              feedings: {
                [feeding.startTime]: {
                  ...feeding,
                  endTime: feeding?.pauseTime || time,
                },
              },
            });
            await interaction.channel.send({
              content: `${buildFeedEmoji(
                false,
                side
              )} Feeding on ${side} side started at ${buildTimestamp(
                feeding?.startTime
              )} finished at ${buildTimestamp(
                feeding?.pauseTime || time
              )}. Feeding lasted ${duration} minutes ${buildNextFeedTime(
                feeding?.pauseTime || time
              )}`,
            });
            await interaction.message.delete();
            break;
          case 'pauseButton':
            saveLog({
              feedings: {
                [feeding.startTime]: {
                  ...feeding,
                  pauseTime: time,
                },
              },
            });
            await interaction.channel.send({
              content: `${buildFeedEmoji(
                'pause',
                side
              )} Paused feeding on ${side} side at ${buildTimestamp(time)}.`,
            });
            await interaction.message.delete();
            break;
          case 'resumeButton':
            const pauseDuration = time - feeding.pauseTime;
            const pauseDurationInMinutes = roundToNearestTenth(
              pauseDuration / (1000 * 60)
            );
            saveLog({
              feedings: {
                [feeding.startTime]: {
                  ...feeding,
                  pauseTime: null,
                  deductions: [...(feeding?.deductions || []), pauseDuration],
                },
              },
            });
            await interaction.channel.send({
              content: `${buildFeedEmoji(
                'resume',
                side
              )} Paused for ${pauseDurationInMinutes} minutes. Resume feeding on ${side} side at ${buildTimestamp(
                time
              )}.`,
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
            await interaction.channel.send({
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

                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the average time of ${averageFeedingTimeInMinutes} for the ${side} side.  ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '10':
                endTime = feeding.startTime + 10 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 10 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '15':
                endTime = feeding.startTime + 15 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 15 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '20':
                endTime = feeding.startTime + 20 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 20 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '25':
                endTime = feeding.startTime + 25 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 25 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '30':
                endTime = feeding.startTime + 30 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 30 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '35':
                endTime = feeding.startTime + 35 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 35 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '40':
                endTime = feeding.startTime + 40 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 40 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '45':
                endTime = feeding.startTime + 45 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 45 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '50':
                endTime = feeding.startTime + 50 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 50 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '55':
                endTime = feeding.startTime + 55 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 55 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              case '60':
                endTime = feeding.startTime + 60 * 60 * 1000;
                saveLog({
                  feedings: {
                    [feeding.startTime]: {
                      ...feeding,
                      endTime,
                    },
                  },
                });
                await interaction.message.delete();
                await interaction.channel.send({
                  content: `${buildFeedEmoji(
                    false,
                    side
                  )}  Set end time to ${buildTimestamp(
                    endTime
                  )} to give the feeding the length of 60 minutes. ${buildNextFeedTime(
                    endTime
                  )}`,
                });
                break;
              default:
                console.log('Unknown value');
                // await interaction.message.delete();
                // await interaction.reply({
                //   content: 'Unable to update the log 😞',
                // });
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
            await interaction.channel.send({
              content: "What was in the 'package'?",
              components: [diaperButtons],
              withResponse: true,
            });
            break;
          case 'peeButton':
            saveLog({
              diaperChanges: { [time]: { type: 'pee' } },
            });
            await interaction.message.delete();
            await interaction.channel.send({
              content: `💧 Pee logged at ${buildTimestamp(time)}`,
            });
            break;
          case 'poopButton':
            saveLog({
              diaperChanges: { [time]: { type: 'poop' } },
            });
            await interaction.message.delete();
            await interaction.channel.send({
              content: `💩 Poop logged at ${buildTimestamp(time)}`,
            });
            break;
          case 'poopAndPeeButton':
            saveLog({
              diaperChanges: { [time]: { type: 'both' } },
            });
            await interaction.message.delete();
            await interaction.channel.send({
              content: `💧/💩 Pee and poop logged at ${buildTimestamp(time)}`,
            });
            break;
          // fussy logic
          case 'fussyButton':
            saveLog({
              fusses: { [time]: { type: 'madge' } },
            });
            await interaction.message.delete();
            await interaction.channel.send({
              content: `😫 Fussiness logged at ${buildTimestamp(time)}`,
            });
            break;
          case 'sleepButton':
            const fellAsleepButton = new ButtonBuilder()
              .setCustomId('fellAsleepButton')
              .setLabel('Fell asleep')
              .setEmoji('😴')
              .setStyle(ButtonStyle.Primary);

            const wokeUpButton = new ButtonBuilder()
              .setCustomId('wokeUpButton')
              .setLabel('Woke up')
              .setEmoji('🥱')
              .setStyle(ButtonStyle.Success);

            const sleepButtons = new ActionRowBuilder().addComponents(
              fellAsleepButton,
              wokeUpButton
            );
            await interaction.message.delete();
            await interaction.channel.send({
              // content: 'What side did she feed from',
              components: [sleepButtons],
              withResponse: true,
            });
            break;
          case 'fellAsleepButton':
            saveLog({
              sleeps: { [time]: { startTime: time } },
            });
            await interaction.message.delete();
            await interaction.channel.send({
              content: `😴 Sleep logged at ${buildTimestamp(time)}`,
            });
            break;
          case 'wokeUpButton':
            const mostRecentSleep = getMostRecentSleep();
            if (!!mostRecentSleep.endTime) {
              saveLog({
                sleeps: { [time]: { endTime: time } },
              });
            } else {
              saveLog({
                sleeps: {
                  [mostRecentSleep.startTime]: {
                    ...mostRecentSleep,
                    endTime: time,
                  },
                },
              });
            }
            await interaction.message.delete();
            await interaction.channel.send({
              content: `🥱 Wake time logged at ${buildTimestamp(time)} ${
                (!mostRecentSleep.endTime &&
                  `Slept for ${Math.floor(
                    (time - mostRecentSleep.startTime) / (1000 * 60)
                  )} minutes`) ||
                ''
              }`,
            });
            break;
          // stats logic
          case 'todayButton': // inside a command, event listener, etc.
            const {
              totalFeeds,
              averageTimeBetweenFeeds,
              averageFeedingDuration,
              averageFeedingDurationLeft,
              averageFeedingDurationRight,
              totalBottleFeeds,
              totalBottleFeedOunces,
              totalOuncesPumped,
              averageBottleFeedOuncesPerFeed,
              clusters,
              totalDiaperChanges,
              totalPees,
              totalPoops,
              averageTimeBetweenDiaperChanges,
            } = getDailyStats();
            const clustersMessage = clusters
              .map(
                (cluster) =>
                  `• ${buildTimestamp(cluster.startTime)}-${buildTimestamp(
                    cluster.endTime
                  )}`
              )
              .join('\n');
            const todayEmbed = new EmbedBuilder()
              .setColor(0xd16b86)
              .setTitle('Todays stats')
              .setAuthor({
                name: 'Captain Wren',
              })
              .setDescription(
                `Averages since 12am this morning (${buildTimeDiff(
                  getMostRecentMidnight(),
                  time
                )} ago):`
              )
              .addFields(
                { name: '\u200B', value: '\u200B' },
                { name: 'Feeding stats:', value: '' },
                {
                  name: 'Total feeds since 12am',
                  value: `${totalFeeds}`,
                },
                {
                  name: 'Average time between feeds',
                  value: `${averageTimeBetweenFeeds}`,
                },
                {
                  name: 'Average feeding duration overall',
                  value: `${averageFeedingDuration}`,
                },
                {
                  name: 'Average feeding duration left',
                  value: `${averageFeedingDurationLeft}`,
                  inline: true,
                },
                {
                  name: 'Average feeding duration right',
                  value: `${averageFeedingDurationRight}`,
                  inline: true,
                },
                {
                  name: clusters.length ? 'Cluster feeding windows' : '',
                  value: clustersMessage,
                },
                { name: '\u200B', value: '\u200B' },
                { name: 'Bottle feeding stats:', value: '' },
                {
                  name: 'Total bottle feeds',
                  value: `${totalBottleFeeds}`,
                },
                {
                  name: 'Total bottle feed ounces',
                  value: `${totalBottleFeedOunces}oz`,
                },
                {
                  name: 'Average ounces per feed',
                  value: `${averageBottleFeedOuncesPerFeed}oz`,
                },
                {
                  name: 'Total ounces pumped',
                  value: `${totalOuncesPumped}oz`,
                },
                { name: '\u200B', value: '\u200B' },
                { name: 'Diaper stats:', value: '' },
                {
                  name: 'Total diaper changes since 12am',
                  value: `${totalDiaperChanges}`,
                },
                {
                  name: 'Total pees',
                  value: `${totalPees}`,
                },
                {
                  name: 'Total poops',
                  value: `${totalPoops}`,
                },
                {
                  name: 'Average time between changes',
                  value: `${averageTimeBetweenDiaperChanges}`,
                }
              )
              .setTimestamp();
            // .setFooter({
            //   text: 'Some footer text here',
            //   iconURL: 'https://i.imgur.com/AfFp7pu.png',
            // });
            await interaction.message.delete();
            await interaction.channel.send({ embeds: [todayEmbed] });
            break;
          case 'yesterdayButton': // inside a command, event listener, etc.
            const {
              totalFeeds: yesterday_totalFeeds,
              clusters: yesterday_clusters,
              averageTimeBetweenFeeds: yesterday_averageTimeBetweenFeeds,
              averageFeedingDuration: yesterday_averageFeedingDuration,
              averageFeedingDurationLeft: yesterday_averageFeedingDurationLeft,
              averageFeedingDurationRight:
                yesterday_averageFeedingDurationRight,
              totalBottleFeeds: yesterday_totalBottleFeeds,
              totalBottleFeedOunces: yesterday_totalBottleFeedOunces,
              totalOuncesPumped: yesterday_totalOuncesPumped,
              averageBottleFeedOuncesPerFeed:
                yesterday_averageBottleFeedOuncesPerFeed,
              totalDiaperChanges: yesterday_totalDiaperChanges,
              totalPees: yesterday_totalPees,
              totalPoops: yesterday_totalPoops,
              averageTimeBetweenDiaperChanges:
                yesterday_averageTimeBetweenDiaperChanges,
            } = getDailyStats(true);
            const yesterdayClustersMessage = yesterday_clusters
              .map(
                (cluster) =>
                  `• ${buildTimestamp(cluster.startTime)}-${buildTimestamp(
                    cluster.endTime
                  )}`
              )
              .join('\n');
            const yesterdayEmbed = new EmbedBuilder()
              .setColor(0xd772b3)
              .setTitle('Yesterdays stats')
              .setAuthor({
                name: 'Captain Wren',
              })
              .setDescription(`Yesterdays averages:`)
              .addFields(
                { name: '\u200B', value: '\u200B' },
                { name: 'Feeding stats:', value: '' },
                {
                  name: 'Total feeds yesterday',
                  value: `${yesterday_totalFeeds}`,
                },
                {
                  name: 'Average time between feeds',
                  value: `${yesterday_averageTimeBetweenFeeds}`,
                },
                {
                  name: 'Average feeding duration overall',
                  value: `${yesterday_averageFeedingDuration}`,
                },
                {
                  name: 'Average feeding duration left',
                  value: `${yesterday_averageFeedingDurationLeft}`,
                  inline: true,
                },
                {
                  name: 'Average feeding duration right',
                  value: `${yesterday_averageFeedingDurationRight}`,
                  inline: true,
                },
                {
                  name: yesterday_clusters.length
                    ? 'Cluster feeding windows'
                    : '',
                  value: yesterdayClustersMessage,
                },
                { name: '\u200B', value: '\u200B' },
                { name: 'Bottle feeding stats:', value: '' },
                {
                  name: 'Total bottle feeds',
                  value: `${yesterday_totalBottleFeeds}`,
                },
                {
                  name: 'Total bottle feed ounces',
                  value: `${yesterday_totalBottleFeedOunces}oz`,
                },
                {
                  name: 'Average ounces per feed',
                  value: `${yesterday_averageBottleFeedOuncesPerFeed}oz`,
                },
                {
                  name: 'Total ounces pumped',
                  value: `${yesterday_totalOuncesPumped}oz`,
                },
                { name: '\u200B', value: '\u200B' },
                { name: 'Diaper stats:', value: '' },
                {
                  name: 'Total diaper changes yesterday',
                  value: `${yesterday_totalDiaperChanges}`,
                },
                {
                  name: 'Total pees',
                  value: `${yesterday_totalPees}`,
                },
                {
                  name: 'Total poops',
                  value: `${yesterday_totalPoops}`,
                },
                {
                  name: 'Average time between changes',
                  value: `${yesterday_averageTimeBetweenDiaperChanges}`,
                }
              )
              .setTimestamp();
            // .setFooter({
            //   text: 'Some footer text here',
            //   iconURL: 'https://i.imgur.com/AfFp7pu.png',
            // });
            await interaction.message.delete();
            await interaction.channel.send({ embeds: [yesterdayEmbed] });
            break;
          case 'lastSevenDaysButton':
            const {
              startDay,
              endDay,
              totalFeeds: lastSevenDays_totalFeeds,
              averageFeedsPerDay,
              averageTimeBetweenFeeds: lastSevenDays_averageTimeBetweenFeeds,
              averageFeedingDuration: lastSevenDays_averageFeedingDuration,
              averageFeedingDurationLeft:
                lastSevenDays_averageFeedingDurationLeft,
              averageFeedingDurationRight:
                lastSevenDays_averageFeedingDurationRight,
              totalBottleFeeds: lastSevenDays_totalBottleFeeds,
              averageBottleFeedOuncesPerDay:
                lastSevenDays_averageBottleFeedOuncesPerDay,
              totalOuncesPumped: lastSevenDays_totalOuncesPumped,
              averageOuncesPumped,
              averageBottleFeedOuncesPerFeed:
                lastSevenDays_averageBottleFeedOuncesPerFeed,
              clusters: lastSevenDays_clusters,
              totalDiaperChanges: lastSevenDays_totalDiaperChanges,
              averageDiaperChangePerDay,
              totalPees: lastSevenDays_totalPees,
              totalPoops: lastSevenDays_totalPoops,
              averageTimeBetweenDiaperChanges:
                lastSevenDays_averageTimeBetweenDiaperChanges,
              averagePeesPerDay,
              averagePoopsPerDay,
            } = getTimePeriodStats();
            const lastSevenDaysClustersMessage = lastSevenDays_clusters
              .map((cluster) => {
                const clusterDate = new Date(
                  cluster.feedings[0].startTime || null
                );
                return `• ${buildTimestamp(cluster.startTime)}-${buildTimestamp(
                  cluster.endTime
                )} ${clusterDate.getMonth()}/${clusterDate.getDate()}`;
              })
              .join('\n');
            const sevenDaysEmbed = new EmbedBuilder()
              .setColor(0x8866aa)
              .setTitle('Last 7 days stats')
              .setAuthor({
                name: 'Captain Wren',
              })
              .setDescription(`Stats from 12am ${startDay} to 12am ${endDay}`)
              .addFields(
                { name: '\u200B', value: '\u200B' },
                { name: 'Feeding stats:', value: '' },
                {
                  name: 'Total feeds',
                  value: `${lastSevenDays_totalFeeds}`,
                  inline: true,
                },
                {
                  name: 'Average feeds per day',
                  value: `${averageFeedsPerDay}`,
                  inline: true,
                },
                {
                  name: 'Average time between feeds',
                  value: `${lastSevenDays_averageTimeBetweenFeeds}`,
                },
                {
                  name: 'Average feeding duration overall',
                  value: `${lastSevenDays_averageFeedingDuration}`,
                },
                {
                  name: 'Average feeding duration left',
                  value: `${lastSevenDays_averageFeedingDurationLeft}`,
                  inline: true,
                },
                {
                  name: 'Average feeding duration right',
                  value: `${lastSevenDays_averageFeedingDurationRight}`,
                  inline: true,
                },
                {
                  name: lastSevenDaysClustersMessage.length
                    ? 'Cluster feeding windows'
                    : '',
                  value: lastSevenDaysClustersMessage,
                },
                { name: '\u200B', value: '\u200B' },
                { name: 'Bottle feeding stats:', value: '' },
                {
                  name: 'Total bottle feeds',
                  value: `${lastSevenDays_totalBottleFeeds}`,
                },
                {
                  name: 'Average bottle feed per day',
                  value: `${lastSevenDays_averageBottleFeedOuncesPerDay}`,
                },
                {
                  name: 'Average ounces per feed',
                  value: `${lastSevenDays_averageBottleFeedOuncesPerFeed}oz`,
                },
                {
                  name: 'Average ounces pumped per day',
                  value: `${averageOuncesPumped}oz`,
                },
                { name: '\u200B', value: '\u200B' },
                { name: 'Diaper stats:', value: '' },
                {
                  name: 'Total diaper changes over the last 7 days',
                  value: `${lastSevenDays_totalDiaperChanges}`,
                },
                {
                  name: 'Average diaper changes per day',
                  value: `${averageDiaperChangePerDay}`,
                },
                {
                  name: 'Total pees',
                  value: `${lastSevenDays_totalPees}`,
                  inline: true,
                },
                {
                  name: 'Average pees per day',
                  value: `${averagePeesPerDay}`,
                  inline: true,
                },
                {
                  name: '',
                  value: ``,
                },
                {
                  name: 'Total poops',
                  value: `${lastSevenDays_totalPoops}`,
                  inline: true,
                },
                {
                  name: 'Average poops per day',
                  value: `${averagePoopsPerDay}`,
                  inline: true,
                },
                {
                  name: 'Average time between changes',
                  value: `${lastSevenDays_averageTimeBetweenDiaperChanges}`,
                }
              )
              .setTimestamp();
            // .setFooter({
            //   text: 'Some footer text here',
            //   iconURL: 'https://i.imgur.com/AfFp7pu.png',
            // });
            await interaction.message.delete();
            await interaction.channel.send({ embeds: [sevenDaysEmbed] });
            break;
        }
      case 'ApplicationCommandAutocomplete':
        // console.log('Command autocomplete event received');
        break;
      case 'ModalSubmit':
        console.log('Modal submit even received');
        break;

      default:
        console.log(`Unknown interaction type: ${interactionType}`);
        break;
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
    // console.log('presenceUpdate', message);
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
