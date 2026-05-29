import 'dotenv/config'
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from './db.js';
import seed from './migrations/seed.js';
import session from 'express-session';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret';

app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

async function runMigrations() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', 'init.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
      console.log('Migrations applied');
    }
  } catch (err) {
    console.error('Migration error', err);
  }
}

(async () => {
  try {
    await runMigrations();
  } catch (err) {
    console.warn('Migration skipped — no DB connection:', err && err.message ? err.message : String(err));
  }
})();

// auth helpers
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'missing' });
  if (process.env.CMS_PASSWORD && password === process.env.CMS_PASSWORD) {
    req.session.auth = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'incorrect' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  res.json({ authed: !!(req.session && req.session.auth) });
});

function requireAuth(req, res, next) {
  if (req.session && req.session.auth) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

// seed endpoint
app.post('/api/seed', requireAuth, async (req, res) => {
  try {
    await seed();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// API routes that require auth
app.get('/api/news', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM news ORDER BY published_at DESC');
  res.json(result.rows);
});

app.post('/api/news', requireAuth, async (req, res) => {
  const { title, body, image_url, published_at, lang } = req.body;
  const q = 'INSERT INTO news (title, body, image_url, published_at, lang) VALUES ($1,$2,$3,$4,$5) RETURNING *';
  const r = await pool.query(q, [title, body, image_url || null, published_at || new Date(), lang || 'en']);
  res.json(r.rows[0]);
});

app.put('/api/news/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { title, body, image_url, published_at, lang } = req.body;
  const q = 'UPDATE news SET title=$1, body=$2, image_url=$3, published_at=$4, lang=$5 WHERE id=$6 RETURNING *';
  const r = await pool.query(q, [title, body, image_url || null, published_at || new Date(), lang || 'en', id]);
  res.json(r.rows[0]);
});

app.delete('/api/news/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  await pool.query('DELETE FROM news WHERE id=$1', [id]);
  res.json({ ok: true });
});

// acts
app.get('/api/acts', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM acts ORDER BY name');
  res.json(result.rows);
});

app.post('/api/acts', requireAuth, async (req, res) => {
  const { name, description, image_url, genre, lang } = req.body;
  const q = 'INSERT INTO acts (name, description, image_url, genre, lang) VALUES ($1,$2,$3,$4,$5) RETURNING *';
  const r = await pool.query(q, [name, description || '', image_url || null, genre || null, lang || 'en']);
  res.json(r.rows[0]);
});

app.put('/api/acts/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { name, description, image_url, genre, lang } = req.body;
  const q = 'UPDATE acts SET name=$1, description=$2, image_url=$3, genre=$4, lang=$5 WHERE id=$6 RETURNING *';
  const r = await pool.query(q, [name, description || '', image_url || null, genre || null, lang || 'en', id]);
  res.json(r.rows[0]);
});

app.delete('/api/acts/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  await pool.query('DELETE FROM acts WHERE id=$1', [id]);
  res.json({ ok: true });
});

// map points
app.get('/api/map', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM map_points');
  res.json(result.rows);
});

app.post('/api/map', requireAuth, async (req, res) => {
  const { name, lat, lng, type, description } = req.body;
  const q = 'INSERT INTO map_points (name, lat, lng, type, description) VALUES ($1,$2,$3,$4,$5) RETURNING *';
  const r = await pool.query(q, [name, lat, lng, type || null, description || null]);
  res.json(r.rows[0]);
});

app.put('/api/map/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { name, lat, lng, type, description } = req.body;
  const q = 'UPDATE map_points SET name=$1, lat=$2, lng=$3, type=$4, description=$5 WHERE id=$6 RETURNING *';
  const r = await pool.query(q, [name, lat, lng, type || null, description || null, id]);
  res.json(r.rows[0]);
});

app.delete('/api/map/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  await pool.query('DELETE FROM map_points WHERE id=$1', [id]);
  res.json({ ok: true });
});

// info
app.get('/api/info', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM info');
  res.json(result.rows);
});

app.post('/api/info', requireAuth, async (req, res) => {
  const { key, value, lang } = req.body;
  const q = 'INSERT INTO info (key, value, lang) VALUES ($1,$2,$3) RETURNING *';
  const r = await pool.query(q, [key, value, lang || 'en']);
  res.json(r.rows[0]);
});

app.put('/api/info/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { key, value, lang } = req.body;
  const q = 'UPDATE info SET key=$1, value=$2, lang=$3 WHERE id=$4 RETURNING *';
  const r = await pool.query(q, [key, value, lang || 'en', id]);
  res.json(r.rows[0]);
});

app.delete('/api/info/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  await pool.query('DELETE FROM info WHERE id=$1', [id]);
  res.json({ ok: true });
});

// schedule (basic CRUD)
app.get('/api/schedule', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM schedule');
  res.json(result.rows);
});

app.post('/api/schedule', requireAuth, async (req, res) => {
  const { act_id, stage, day, start_time, end_time } = req.body;
  const q = 'INSERT INTO schedule (act_id, stage, day, start_time, end_time) VALUES ($1,$2,$3,$4,$5) RETURNING *';
  const r = await pool.query(q, [act_id || null, stage || null, day || null, start_time || null, end_time || null]);
  res.json(r.rows[0]);
});

app.put('/api/schedule/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { act_id, stage, day, start_time, end_time } = req.body;
  const q = 'UPDATE schedule SET act_id=$1, stage=$2, day=$3, start_time=$4, end_time=$5 WHERE id=$6 RETURNING *';
  const r = await pool.query(q, [act_id || null, stage || null, day || null, start_time || null, end_time || null, id]);
  res.json(r.rows[0]);
});

app.delete('/api/schedule/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  await pool.query('DELETE FROM schedule WHERE id=$1', [id]);
  res.json({ ok: true });
});

// serve SPA in production and fallback for client-side routes
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api')) return res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    return next();
  });
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('Server listening on', port));
