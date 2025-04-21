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
    fs.writeFileSync(dataPath, '{}');
  }

  const file = fs.readFileSync(dataPath);
  return JSON.parse(file);
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
};
