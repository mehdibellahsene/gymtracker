const fs = require('fs');
const path = require('path');
const { loadDb, saveDb } = require('./data');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

afterEach(() => {
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
});

describe('loadDb', () => {
  test('returns empty db when file does not exist', () => {
    const db = loadDb();
    expect(db).toEqual({ workouts: [], logs: [] });
  });

  test('returns empty db when file is empty', () => {
    fs.writeFileSync(DATA_FILE, '');
    expect(loadDb()).toEqual({ workouts: [], logs: [] });
  });

  test('migrates old array format to new format', () => {
    const oldData = [{ id: '1', exercise: 'Squats', sets: [] }];
    fs.writeFileSync(DATA_FILE, JSON.stringify(oldData));
    const db = loadDb();
    expect(db.workouts).toEqual([]);
    expect(db.logs).toEqual(oldData);
  });

  test('returns parsed db from file', () => {
    const data = { workouts: [{ id: 'w1' }], logs: [{ id: 'l1' }] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data));
    const db = loadDb();
    expect(db.workouts).toEqual([{ id: 'w1' }]);
    expect(db.logs).toEqual([{ id: 'l1' }]);
  });
});

describe('saveDb', () => {
  test('writes db to file', () => {
    const db = { workouts: [], logs: [{ id: '1' }] };
    saveDb(db);
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    expect(JSON.parse(raw)).toEqual(db);
  });
});
