import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import seed from './migrations/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// serve static SPA files
app.use('/', express.static(path.join(__dirname, '..', 'dist')));

// simple API endpoints
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/news', async (req, res) => {
  const result = await pool.query('SELECT * FROM news ORDER BY published_at DESC');
  res.json(result.rows);
});

app.get('/api/acts', async (req, res) => {
  const result = await pool.query('SELECT * FROM acts ORDER BY name');
  res.json(result.rows);
});

app.get('/api/map', async (req, res) => {
  const result = await pool.query('SELECT * FROM map_points');
  res.json(result.rows);
});

// run seed when /api/seed?force=true
app.post('/api/seed', async (req, res) => {
  try {
    await seed();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server listening on', port));
