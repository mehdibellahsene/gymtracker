const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

function loadDb() {
  if (!fs.existsSync(DATA_FILE)) return { workouts: [], logs: [] };
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  if (!raw.trim()) return { workouts: [], logs: [] };
  const data = JSON.parse(raw);
  // Migration: old format was an array of logs
  if (Array.isArray(data)) return { workouts: [], logs: data };
  if (!data.workouts) data.workouts = [];
  if (!data.logs) data.logs = [];
  return data;
}

function saveDb(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

module.exports = { loadDb, saveDb };
