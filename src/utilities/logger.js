const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../../data/log.json');
/*
{ 
  diaperChanges: { 123456: {type: 'pee' | 'poop' | 'both'}}
  feedings: {123456: {side: 'left' | 'right', endTime: 123456}}
}
*/

function loadLogs() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(
      dataPath,
      '{"diaperChanges": {}, "feedings": {}, "fusses": {}, "sleeps": {}}'
    );
  }

  const file = fs.readFileSync(dataPath);
  return JSON.parse(file);
}

function getMostRecentFeeding() {
  const { feedings } = loadLogs();
  const mostRecentTimestamp = Math.max(...Object.keys(feedings));
  return feedings[mostRecentTimestamp];
}

function getMostRecentSleep() {
  const { sleeps } = loadLogs();
  const mostRecentTimestamp = Math.max(...Object.keys(sleeps));
  return sleeps[mostRecentTimestamp];
}

function buildDuration(timeMs) {
  const totalMinutes = Math.floor(timeMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }

  if (minutes > 0 || hours === 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }

  return parts.join(' and ');
}

function getAverageIntervalBetweenFeedings(feedingsArray) {
  // Filter out any feedings missing startTime or endTime
  const validFeedings = feedingsArray.filter(
    (f) => typeof f.startTime === 'number' && typeof f.endTime === 'number'
  );

  // Sort by endTime ascending
  validFeedings.sort((a, b) => a.endTime - b.endTime);

  // If fewer than 2 feedings, no intervals can be calculated
  if (validFeedings.length < 2) return 0;

  let totalInterval = 0;
  let intervalCount = 0;

  for (let i = 0; i < validFeedings.length - 1; i++) {
    const currentEnd = validFeedings[i].endTime;
    const nextStart = validFeedings[i + 1].startTime;

    // Make sure nextStart is after currentEnd
    if (nextStart > currentEnd) {
      totalInterval += nextStart - currentEnd;
      intervalCount++;
    }
  }

  return buildDuration(intervalCount > 0 ? totalInterval / intervalCount : 0);
}

function buildTimeDiff(timestamp1, timestamp2) {
  // Get absolute difference in milliseconds
  const diffMs = Math.abs(timestamp1 - timestamp2);

  // If there is no difference, return '0 minutes'
  if (diffMs === 0) return '0 minutes';

  return buildDuration(diffMs);
}

function getAverageFeedingDuration(feedingsArray, sideFilter = null) {
  // Validate side filter
  const validSides = ['left', 'right'];
  const applyFilter = validSides.includes(sideFilter);

  let totalDuration = 0;
  let count = 0;

  for (const feeding of feedingsArray) {
    const { startTime, endTime, side, deductions } = feeding;

    // Skip if required fields are missing
    if (typeof startTime !== 'number' || typeof endTime !== 'number') continue;

    // Apply side filter if valid
    if (applyFilter && side !== sideFilter) continue;

    // Calculate duration
    const baseDuration = endTime - startTime;
    const totalDeductions = Array.isArray(deductions)
      ? deductions.reduce((sum, d) => sum + d, 0)
      : 0;

    const adjustedDuration = baseDuration - totalDeductions;
    totalDuration += adjustedDuration;
    count++;
  }

  const averageDuration = count > 0 ? totalDuration / count : 0;

  return {
    averageDuration: buildDuration(averageDuration),
    feedingCount: count,
  };
}

function getMostRecentMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getTodaysStats() {
  const { feedings, diaperChanges } = loadLogs();
  const todaysFeedings = Object.values(feedings).filter(
    (feeding) => feeding.startTime >= getMostRecentMidnight()
  );
  // const todaysFeedings = Object.values(feedings).filter((feeding) => true); // this is for testing.
  const todaysDiaperChangeTimes = Object.keys(diaperChanges).filter(
    (changeTime) => changeTime >= getMostRecentMidnight()
  );
  // const todaysDiaperChangeTimes = Object.keys(diaperChanges).filter(
  //   (changeTime) => true
  // );
  const totalFeeds = todaysFeedings.length;
  const averageTimeBetweenFeeds =
    getAverageIntervalBetweenFeedings(todaysFeedings);
  const { averageDuration: averageFeedingDuration } =
    getAverageFeedingDuration(todaysFeedings);
  const { averageDuration: averageFeedingDurationLeft } =
    getAverageFeedingDuration(todaysFeedings, 'left');
  const { averageDuration: averageFeedingDurationRight } =
    getAverageFeedingDuration(todaysFeedings, 'right');

  const totalDiaperChanges = todaysDiaperChangeTimes.length;
  const totalPees = todaysDiaperChangeTimes.filter(
    (timestamp) =>
      diaperChanges[timestamp].type === 'pee' ||
      diaperChanges[timestamp].type === 'both'
  ).length;
  const totalPoops = todaysDiaperChangeTimes.filter(
    (timestamp) =>
      diaperChanges[timestamp].type === 'poop' ||
      diaperChanges[timestamp].type === 'both'
  ).length;
  const sortedDiaperChanges = [...todaysDiaperChangeTimes].sort(
    (a, b) => a - b
  );
  const totalDiaperChangeInterval =
    todaysDiaperChangeTimes.length < 2
      ? 0
      : sortedDiaperChanges
          .slice(1)
          .reduce((sum, ts, i) => sum + (ts - sortedDiaperChanges[i]), 0);
  const averageTimeBetweenDiaperChanges = buildDuration(
    totalDiaperChangeInterval / totalDiaperChanges - 1
  );

  return {
    totalFeeds,
    averageTimeBetweenFeeds,
    averageFeedingDuration,
    averageFeedingDurationLeft,
    averageFeedingDurationRight,
    totalDiaperChanges,
    totalPees,
    totalPoops,
    averageTimeBetweenDiaperChanges,
  };
}

function getAverageFeedingTimeBySide(side) {
  const { feedings } = loadLogs();
  const entries = Object.values(feedings);

  const { totalDuration, count } = entries.reduce(
    (acc, entry) => {
      if (entry.endTime && entry.startTime && entry.side === side) {
        acc.totalDuration += entry.endTime - entry.startTime;
        acc.count += 1;
      }
      return acc;
    },
    { totalDuration: 0, count: 0 }
  );
  const averageDurationMs = count > 0 ? totalDuration / count : 0;
  return Math.floor(averageDurationMs / (1000 * 60)); // return in minutes
}

function saveLog(entry) {
  const { diaperChanges, feedings, fusses, sleeps } = loadLogs();
  const newLogs = {
    diaperChanges: { ...diaperChanges, ...entry.diaperChanges },
    feedings: { ...feedings, ...entry.feedings },
    fusses: { ...(fusses || {}), ...entry.fusses },
    sleeps: { ...(sleeps || {}), ...entry.sleeps },
  };
  fs.writeFileSync(dataPath, JSON.stringify(newLogs, null, 2));
}

module.exports = {
  loadLogs,
  saveLog,
  getMostRecentFeeding,
  getMostRecentSleep,
  getAverageFeedingTimeBySide,
  getMostRecentMidnight,
  buildTimeDiff,
  getTodaysStats,
};
