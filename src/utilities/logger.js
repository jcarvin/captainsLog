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
    fs.writeFileSync(dataPath, '{"diaperChanges": {}, "feedings": {}}');
  }

  const file = fs.readFileSync(dataPath);
  return JSON.parse(file);
}

function getMostRecentFeeding() {
  const { feedings } = loadLogs();
  const mostRecentTimestamp = Math.max(...Object.keys(feedings));
  return feedings[mostRecentTimestamp];
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

function timeSinceLastFeeding() {
  const feeding = getMostRecentFeeding();
}

function saveLog(entry) {
  const { diaperChanges, feedings } = loadLogs();
  const newLogs = {
    diaperChanges: { ...diaperChanges, ...entry.diaperChanges },
    feedings: { ...feedings, ...entry.feedings },
  };
  fs.writeFileSync(dataPath, JSON.stringify(newLogs, null, 2));
}

module.exports = {
  loadLogs,
  saveLog,
  getMostRecentFeeding,
  getAverageFeedingTimeBySide,
  timeSinceLastFeeding,
};
