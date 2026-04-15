const express = require('express');
const path = require('path');
const { loadDb, saveDb } = require('./data');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- WORKOUTS ---

// List all workouts
app.get('/api/workouts', (req, res) => {
  const db = loadDb();
  res.json(db.workouts);
});

// Get one workout with its logs
app.get('/api/workouts/:id', (req, res) => {
  const db = loadDb();
  const workout = db.workouts.find(w => w.id === req.params.id);
  if (!workout) return res.status(404).json({ error: 'Workout non trouve' });
  const logs = db.logs.filter(l => l.workoutId === workout.id);
  res.json({ ...workout, logs });
});

// Start a new workout
app.post('/api/workouts', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId requis' });
  const db = loadDb();
  const workout = {
    id: Date.now().toString(),
    sessionId,
    date: new Date().toISOString().split('T')[0],
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'active'
  };
  db.workouts.push(workout);
  saveDb(db);
  res.status(201).json(workout);
});

// Finish a workout
app.put('/api/workouts/:id/finish', (req, res) => {
  const db = loadDb();
  const workout = db.workouts.find(w => w.id === req.params.id);
  if (!workout) return res.status(404).json({ error: 'Workout non trouve' });
  workout.status = 'finished';
  workout.endTime = new Date().toISOString();
  saveDb(db);
  const logs = db.logs.filter(l => l.workoutId === workout.id);
  res.json({ ...workout, logs });
});

// Delete a workout and its logs
app.delete('/api/workouts/:id', (req, res) => {
  const db = loadDb();
  const idx = db.workouts.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Workout non trouve' });
  db.workouts.splice(idx, 1);
  db.logs = db.logs.filter(l => l.workoutId !== req.params.id);
  saveDb(db);
  res.json({ ok: true });
});

// --- LOGS ---

// List all logs (optionally filter by workoutId)
app.get('/api/logs', (req, res) => {
  const db = loadDb();
  if (req.query.workoutId) {
    return res.json(db.logs.filter(l => l.workoutId === req.query.workoutId));
  }
  res.json(db.logs);
});

// Add a log entry
app.post('/api/logs', (req, res) => {
  const { workoutId, sessionId, exercise, sets } = req.body;
  if (!sessionId || !exercise || !sets) {
    return res.status(400).json({ error: 'sessionId, exercise et sets requis' });
  }
  const db = loadDb();
  const entry = {
    id: Date.now().toString(),
    workoutId: workoutId || null,
    date: new Date().toISOString().split('T')[0],
    sessionId,
    exercise,
    sets
  };
  db.logs.push(entry);
  saveDb(db);
  res.status(201).json(entry);
});

// Delete a log
app.delete('/api/logs/:id', (req, res) => {
  const db = loadDb();
  const before = db.logs.length;
  db.logs = db.logs.filter(e => e.id !== req.params.id);
  if (db.logs.length === before) {
    return res.status(404).json({ error: 'Log non trouve' });
  }
  saveDb(db);
  res.json({ ok: true });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Gym Tracker running on http://localhost:${PORT}`));
}

module.exports = app;
