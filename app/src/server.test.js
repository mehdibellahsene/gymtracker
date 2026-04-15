const fs = require('fs');
const path = require('path');
const http = require('http');

const DATA_FILE = path.join(__dirname, '..', 'data.json');
let app;

beforeEach(() => {
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
  jest.resetModules();
  app = require('./server');
});

afterEach(() => {
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
});

function request(method, url, body) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = { hostname: 'localhost', port, path: url, method, headers: { 'Content-Type': 'application/json' } };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe('Workouts API', () => {
  test('GET /api/workouts returns empty array', async () => {
    const res = await request('GET', '/api/workouts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('POST /api/workouts creates a workout', async () => {
    const res = await request('POST', '/api/workouts', { sessionId: 'session1' });
    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBe('session1');
    expect(res.body.status).toBe('active');
  });

  test('POST /api/workouts returns 400 without sessionId', async () => {
    const res = await request('POST', '/api/workouts', {});
    expect(res.status).toBe(400);
  });

  test('PUT /api/workouts/:id/finish finishes a workout', async () => {
    const created = await request('POST', '/api/workouts', { sessionId: 'session2' });
    const res = await request('PUT', `/api/workouts/${created.body.id}/finish`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('finished');
    expect(res.body.endTime).toBeTruthy();
  });

  test('GET /api/workouts/:id returns workout with logs', async () => {
    const w = await request('POST', '/api/workouts', { sessionId: 'session1' });
    await request('POST', '/api/logs', {
      workoutId: w.body.id, sessionId: 'session1', exercise: 'Squats', sets: [{ reps: 8, poids: 100 }]
    });
    const res = await request('GET', `/api/workouts/${w.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(1);
    expect(res.body.logs[0].exercise).toBe('Squats');
  });

  test('DELETE /api/workouts/:id removes workout and its logs', async () => {
    const w = await request('POST', '/api/workouts', { sessionId: 'session1' });
    await request('POST', '/api/logs', {
      workoutId: w.body.id, sessionId: 'session1', exercise: 'Squats', sets: [{ reps: 8, poids: 100 }]
    });
    const del = await request('DELETE', `/api/workouts/${w.body.id}`);
    expect(del.status).toBe(200);
    const logs = await request('GET', '/api/logs');
    expect(logs.body).toEqual([]);
  });
});

describe('Logs API', () => {
  test('GET /api/logs returns empty array', async () => {
    const res = await request('GET', '/api/logs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('POST /api/logs creates a log', async () => {
    const res = await request('POST', '/api/logs', {
      sessionId: 'session1', exercise: 'Tractions', sets: [{ reps: 10, poids: 0 }]
    });
    expect(res.status).toBe(201);
    expect(res.body.exercise).toBe('Tractions');
  });

  test('POST /api/logs returns 400 if missing fields', async () => {
    const res = await request('POST', '/api/logs', { exercise: 'Squats' });
    expect(res.status).toBe(400);
  });

  test('GET /api/logs?workoutId filters by workout', async () => {
    const w = await request('POST', '/api/workouts', { sessionId: 'session1' });
    await request('POST', '/api/logs', {
      workoutId: w.body.id, sessionId: 'session1', exercise: 'A', sets: [{ reps: 5, poids: 50 }]
    });
    await request('POST', '/api/logs', {
      sessionId: 'session2', exercise: 'B', sets: [{ reps: 5, poids: 50 }]
    });
    const res = await request('GET', `/api/logs?workoutId=${w.body.id}`);
    expect(res.body.length).toBe(1);
    expect(res.body[0].exercise).toBe('A');
  });

  test('DELETE /api/logs/:id removes a log', async () => {
    const created = await request('POST', '/api/logs', {
      sessionId: 's1', exercise: 'X', sets: [{ reps: 10, poids: 0 }]
    });
    const del = await request('DELETE', `/api/logs/${created.body.id}`);
    expect(del.status).toBe(200);
  });
});
