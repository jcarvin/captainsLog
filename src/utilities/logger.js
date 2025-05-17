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
      '{"diaperChanges": {}, "feedings": {}, "fusses": {}, "sleeps": {}, "pumps": {}}'
    );
  }

  const file = fs.readFileSync(dataPath);
  return JSON.parse(file);
}
function roundToNearestTenth(number) {
  return Math.round(number * 10) / 10;
}

function buildTimestamp(time) {
  const date = new Date(time);
  let hours = date.getHours() + 1; // adjust for thicks timezone
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours; // 0 becomes 12 in 12-hour format
  return `${hours}:${minutes}${ampm}`;
}

function findClusterFeedingWindows(
  feedingsArray,
  gapLimitMs = 45 * 60 * 1000,
  minClusterSize = 3
) {
  const validFeedings = feedingsArray
    .filter(
      (f) => typeof f.startTime === 'number' && typeof f.endTime === 'number'
    )
    .sort((a, b) => a.startTime - b.startTime);

  const clusters = [];
  let cluster = [];

  for (let i = 0; i < validFeedings.length; i++) {
    const current = validFeedings[i];

    if (cluster.length === 0) {
      cluster.push(current);
      continue;
    }

    const prev = cluster[cluster.length - 1];
    const timeBetween = current.startTime - prev.endTime;

    if (timeBetween <= gapLimitMs) {
      cluster.push(current);
    } else {
      // Check if cluster is big enough to record
      if (cluster.length >= minClusterSize) {
        clusters.push({
          startTime: cluster[0].startTime,
          endTime: cluster[cluster.length - 1].endTime,
          feedings: [...cluster],
        });
      }
      // Start new cluster
      cluster = [current];
    }
  }

  // Final check for last cluster
  if (cluster.length >= minClusterSize) {
    clusters.push({
      startTime: cluster[0].startTime,
      endTime: cluster[cluster.length - 1].endTime,
      feedings: [...cluster],
    });
  }

  return clusters;
}

function getMostRecentFeeding() {
  const { feedings } = loadLogs();
  const mostRecentTimestamp = Math.max(...Object.keys(feedings));
  return feedings[mostRecentTimestamp];
}

function getMostRecentPump() {
  const { pumps } = loadLogs();
  if (!pumps) return {};
  const mostRecentTimestamp = Math.max(...Object.keys(pumps));
  return pumps[mostRecentTimestamp];
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

function getBabyAgeString(birthDateStr = '2025-04-11') {
  const birthDate = new Date(birthDateStr);
  const now = new Date();

  // Calculate calendar months difference
  let months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());

  // Handle incomplete current month
  const birthDay = birthDate.getDate();
  if (now.getDate() < birthDay) {
    months--;
  }

  // Calculate date after subtracting full months
  const monthAdjustedDate = new Date(birthDate);
  monthAdjustedDate.setMonth(birthDate.getMonth() + months);

  // Calculate remaining days
  const diffMs = now - monthAdjustedDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;

  // Format parts
  const parts = [];
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? 'week' : 'weeks'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);

  // Join parts with commas and "and"
  if (parts.length === 0) return '0 days';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
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
    if ((applyFilter && side !== sideFilter) || side === 'bottle') continue;

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

function groupFeedings(feedingsArray) {
  return feedingsArray.reduce((acc, currVal, i) => {
    if (i === 0) {
      return [currVal];
    }
    // if time since most recent feeding is less than 7 mins,
    // replace the previous end time with this end time
    // and add the delta to the deductions

    const sevenMinutes = 7 * 60 * 1000;
    const lastVal = acc[acc.length - 1];

    if (currVal.startTime - lastVal.endTime <= sevenMinutes) {
      const newAccumulator = [...acc]; // Create a copy to avoid mutation
      newAccumulator.pop();
      newAccumulator.push({
        ...lastVal,
        endTime: currVal.endTime,
        deductions: [
          ...(lastVal?.deductions || []),
          ...(currVal?.deductions || []),
          currVal.startTime - lastVal.endTime,
        ],
      });
      return newAccumulator;
    } else {
      return [...acc, currVal];
    }
  }, []);
}

function getDailyStats(yesterday = false) {
  const now = new Date();
  const yesterdaysMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  );
  const mostRecentMidnight = getMostRecentMidnight();
  const { feedings, diaperChanges, pumps } = loadLogs();
  const relevantFeedings = Object.values(feedings).filter((feeding) =>
    yesterday
      ? feeding.startTime >= yesterdaysMidnight &&
        feeding.startTime <= mostRecentMidnight
      : feeding.startTime >= mostRecentMidnight
  );
  const relevantPumps = Object.values(pumps).filter((pump) =>
    yesterday
      ? pump.startTime >= yesterdaysMidnight &&
        pump.startTime <= mostRecentMidnight
      : pump.startTime >= mostRecentMidnight
  );
  const groupedFeedings = groupFeedings(relevantFeedings);
  const relevantDiaperChanges = Object.keys(diaperChanges).filter(
    (changeTime) =>
      yesterday
        ? changeTime >= yesterdaysMidnight && changeTime <= mostRecentMidnight
        : changeTime >= mostRecentMidnight
  );
  const totalFeeds = groupedFeedings.length;
  const totalBottleFeeds = relevantFeedings.filter(
    (feeding) => feeding.side === 'bottle'
  ).length;
  const totalBottleFeedOunces = relevantFeedings
    .filter((feeding) => feeding.side === 'bottle')
    .reduce((acc, currFeed) => (acc += currFeed?.amountOz || 0), 0);
  const averageBottleFeedOuncesPerFeed =
    roundToNearestTenth(totalBottleFeedOunces / totalBottleFeeds) || 0;
  const averageTimeBetweenFeeds =
    getAverageIntervalBetweenFeedings(groupedFeedings);
  const { averageDuration: averageFeedingDuration } =
    getAverageFeedingDuration(groupedFeedings);
  const { averageDuration: averageFeedingDurationLeft } =
    getAverageFeedingDuration(relevantFeedings, 'left');
  const { averageDuration: averageFeedingDurationRight } =
    getAverageFeedingDuration(relevantFeedings, 'right');
  const clusters = findClusterFeedingWindows(groupedFeedings);

  const totalOuncesPumped = relevantPumps.reduce(
    (acc, currPump) => (acc += currPump?.amountOz || 0),
    0
  );

  const totalDiaperChanges = relevantDiaperChanges.length;
  const totalPees = relevantDiaperChanges.filter(
    (timestamp) =>
      diaperChanges[timestamp].type === 'pee' ||
      diaperChanges[timestamp].type === 'both'
  ).length;
  const totalPoops = relevantDiaperChanges.filter(
    (timestamp) =>
      diaperChanges[timestamp].type === 'poop' ||
      diaperChanges[timestamp].type === 'both'
  ).length;
  const sortedDiaperChanges = [...relevantDiaperChanges].sort((a, b) => a - b);
  const totalDiaperChangeInterval =
    relevantDiaperChanges.length < 2
      ? 0
      : sortedDiaperChanges
          .slice(1)
          .reduce((sum, ts, i) => sum + (ts - sortedDiaperChanges[i]), 0);
  const averageTimeBetweenDiaperChanges = buildDuration(
    totalDiaperChangeInterval / totalDiaperChanges
  );

  return {
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
  };
}
function getTimePeriodStats(numDays = 7) {
  const mostRecentMidnight = getMostRecentMidnight();
  const now = new Date();
  const midnightXDaysAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - numDays
  );

  const startDay = `${midnightXDaysAgo.getMonth()}/${midnightXDaysAgo.getDate()}/${midnightXDaysAgo.getFullYear()}`;
  const endDay = `${mostRecentMidnight.getMonth()}/${mostRecentMidnight.getDate()}/${mostRecentMidnight.getFullYear()}`;
  const { feedings, diaperChanges, pumps } = loadLogs();
  const relevantFeedings = Object.values(feedings).filter(
    (feeding) =>
      feeding.startTime >= midnightXDaysAgo &&
      feeding.startTime <= mostRecentMidnight
  );
  const relevantPumps = Object.values(pumps).filter(
    (pump) =>
      pump.startTime >= midnightXDaysAgo && pump.startTime <= mostRecentMidnight
  );
  const groupedFeedings = groupFeedings(relevantFeedings);
  const relevantDiaperChanges = Object.keys(diaperChanges).filter(
    (changeTime) =>
      changeTime >= midnightXDaysAgo && changeTime <= mostRecentMidnight
  );
  const totalFeeds = groupedFeedings.length;
  const totalBottleFeeds = relevantFeedings.filter(
    (feeding) => feeding.side === 'bottle'
  ).length;
  const totalBottleFeedOunces = relevantFeedings
    .filter((feeding) => feeding.side === 'bottle')
    .reduce((acc, currFeed) => (acc += currFeed?.amountOz || 0), 0);
  const averageBottleFeedOuncesPerDay = roundToNearestTenth(
    totalBottleFeedOunces / numDays
  );

  const totalOuncesPumped = relevantPumps.reduce(
    (acc, currPump) => (acc += currPump?.amountOz || 0),
    0
  );
  const averageOuncesPumped = roundToNearestTenth(totalOuncesPumped / numDays);

  const averageBottleFeedOuncesPerFeed =
    roundToNearestTenth(totalBottleFeedOunces / totalBottleFeeds) || 0;
  const averageFeedsPerDay = roundToNearestTenth(totalFeeds / numDays);
  const averageTimeBetweenFeeds =
    getAverageIntervalBetweenFeedings(groupedFeedings);
  const { averageDuration: averageFeedingDuration } =
    getAverageFeedingDuration(groupedFeedings);
  const { averageDuration: averageFeedingDurationLeft } =
    getAverageFeedingDuration(relevantFeedings, 'left');
  const { averageDuration: averageFeedingDurationRight } =
    getAverageFeedingDuration(relevantFeedings, 'right');
  const clusters = findClusterFeedingWindows(groupedFeedings);

  const totalDiaperChanges = relevantDiaperChanges.length;
  const totalPees = relevantDiaperChanges.filter(
    (timestamp) =>
      diaperChanges[timestamp].type === 'pee' ||
      diaperChanges[timestamp].type === 'both'
  ).length;
  const totalPoops = relevantDiaperChanges.filter(
    (timestamp) =>
      diaperChanges[timestamp].type === 'poop' ||
      diaperChanges[timestamp].type === 'both'
  ).length;
  const averagePoopsPerDay = roundToNearestTenth(totalPoops / numDays);
  const averagePeesPerDay = roundToNearestTenth(totalPees / numDays);
  const sortedDiaperChanges = [...relevantDiaperChanges].sort((a, b) => a - b);
  const totalDiaperChangeInterval =
    relevantDiaperChanges.length < 2
      ? 0
      : sortedDiaperChanges
          .slice(1)
          .reduce((sum, ts, i) => sum + (ts - sortedDiaperChanges[i]), 0);
  const averageDiaperChangePerDay = roundToNearestTenth(
    totalDiaperChanges / numDays
  );
  const averageTimeBetweenDiaperChanges = buildDuration(
    totalDiaperChangeInterval / totalDiaperChanges
  );

  return {
    startDay,
    endDay,
    totalFeeds,
    averageFeedsPerDay,
    averageTimeBetweenFeeds,
    averageFeedingDuration,
    averageFeedingDurationLeft,
    averageFeedingDurationRight,
    totalBottleFeeds,
    averageBottleFeedOuncesPerDay,
    totalOuncesPumped,
    averageOuncesPumped,
    averageBottleFeedOuncesPerFeed,
    clusters,
    totalDiaperChanges,
    totalPees,
    totalPoops,
    averagePoopsPerDay,
    averagePeesPerDay,
    averageDiaperChangePerDay,
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
  const { diaperChanges, feedings, fusses, sleeps, pumps } = loadLogs();
  const newLogs = {
    diaperChanges: { ...diaperChanges, ...entry.diaperChanges },
    feedings: { ...feedings, ...entry.feedings },
    fusses: { ...(fusses || {}), ...entry.fusses },
    sleeps: { ...(sleeps || {}), ...entry.sleeps },
    pumps: { ...(pumps || {}), ...entry.pumps },
  };
  fs.writeFileSync(dataPath, JSON.stringify(newLogs, null, 2));
}

module.exports = {
  loadLogs,
  buildTimestamp,
  saveLog,
  getMostRecentFeeding,
  getMostRecentPump,
  getMostRecentSleep,
  getAverageFeedingTimeBySide,
  getMostRecentMidnight,
  buildTimeDiff,
  getDailyStats,
  getTimePeriodStats,
  roundToNearestTenth,
  getBabyAgeString,
};
