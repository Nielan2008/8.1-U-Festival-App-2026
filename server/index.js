import 'dotenv/config'
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from './db.js';

// Backend API server for CMS and public festival data.
// Contains auth, seed, and CRUD routes for acts, schedule, news, map points, and info.
import seed from './migrations/seed.js';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
const isProd = process.env.NODE_ENV === 'production';

const PgSession = connectPgSimple(session);
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret';

app.set('trust proxy', 1);
app.use(cors({
  origin: isProd
    ? 'https://eight-1-u-festival-app-2026.onrender.com'
    : 'http://localhost:5173',
  credentials: true
}));
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

async function runMigrations() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', 'init.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
      console.log('Migrations applied');
    }

    const alterStatements = [
      `ALTER TABLE acts ADD COLUMN IF NOT EXISTS tagline TEXT`,
      `ALTER TABLE acts ADD COLUMN IF NOT EXISTS slug TEXT`,
      `ALTER TABLE acts ADD COLUMN IF NOT EXISTS youtube TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS acts_slug_unique ON acts (slug)`,
      `ALTER TABLE map_points ADD COLUMN IF NOT EXISTS x INTEGER`,
      `ALTER TABLE map_points ADD COLUMN IF NOT EXISTS y INTEGER`,
      `ALTER TABLE map_points ADD COLUMN IF NOT EXISTS icon TEXT`,
      `ALTER TABLE map_points ADD COLUMN IF NOT EXISTS label_nl TEXT`,
      `ALTER TABLE map_points ADD COLUMN IF NOT EXISTS label_en TEXT`
    ];

    for (const stmt of alterStatements) {
      await pool.query(stmt);
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

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'missing' });
  const cms_password = process.env.CMS_PASSWORD;
  if (!cms_password) {
    console.error('CMS_PASSWORD env variable is not set!');
    return res.status(500).json({ error: 'server misconfigured' });
  }
  if (password === cms_password) {
    req.session.auth = true;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'session error' });
      }
      return res.json({ ok: true });
    });
  } else {
    return res.status(401).json({ error: 'incorrect' });
  }
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

// ─── Seed ────────────────────────────────────────────────────────────────────

app.post('/api/seed', requireAuth, async (req, res) => {
  try {
    await seed();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/api/seed-db', async (req, res) => {
  const key = req.query.key;
  if (!process.env.SEED_KEY || key !== process.env.SEED_KEY) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  try {
    await seed();
    return res.json({ success: true, message: 'Database seeded!' });
  } catch (err) {
    console.error('Seed error', err);
    return res.status(500).json({ success: false, error: err && err.message ? err.message : String(err) });
  }
});

// ─── News ────────────────────────────────────────────────────────────────────

// PUBLIC - no auth needed, festival visitors can read this
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY published_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PROTECTED - only CMS admin can write
app.post('/api/news', requireAuth, async (req, res) => {
  try {
    const { title, body, image_url, published_at, lang } = req.body;
    const q = 'INSERT INTO news (title, body, image_url, published_at, lang) VALUES ($1,$2,$3,$4,$5) RETURNING *';
    const r = await pool.query(q, [title, body, image_url || null, published_at || new Date(), lang || 'en']);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/news/:id', requireAuth, async (req, res) => {
  try {
    const { title, body, image_url, published_at, lang } = req.body;
    const q = 'UPDATE news SET title=$1, body=$2, image_url=$3, published_at=$4, lang=$5 WHERE id=$6 RETURNING *';
    const r = await pool.query(q, [title, body, image_url || null, published_at || new Date(), lang || 'en', req.params.id]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/news/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM news WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Acts ────────────────────────────────────────────────────────────────────

// PUBLIC
app.get('/api/acts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM acts ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PROTECTED
app.post('/api/acts', requireAuth, async (req, res) => {
  try {
    const { name, slug, tagline, description, image_url, genre, lang, youtube } = req.body;
    const safeDescription = typeof description === 'object' ? JSON.stringify(description) : description || '';
    const safeTagline = typeof tagline === 'object' ? JSON.stringify(tagline) : tagline || '';
    const q = 'INSERT INTO acts (name, slug, tagline, description, image_url, genre, lang, youtube) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *';
    const r = await pool.query(q, [name, slug || null, safeTagline, safeDescription, image_url || null, genre || null, lang || 'en', youtube || null]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/acts/:id', requireAuth, async (req, res) => {
  try {
    const { name, slug, tagline, description, image_url, genre, lang, youtube } = req.body;
    const safeDescription = typeof description === 'object' ? JSON.stringify(description) : description || '';
    const safeTagline = typeof tagline === 'object' ? JSON.stringify(tagline) : tagline || '';
    const q = 'UPDATE acts SET name=$1, slug=$2, tagline=$3, description=$4, image_url=$5, genre=$6, lang=$7, youtube=$8 WHERE id=$9 RETURNING *';
    const r = await pool.query(q, [name, slug || null, safeTagline, safeDescription, image_url || null, genre || null, lang || 'en', youtube || null, req.params.id]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/acts/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM acts WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Map ─────────────────────────────────────────────────────────────────────

// PUBLIC
app.get('/api/map', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM map_points');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PROTECTED
app.post('/api/map', requireAuth, async (req, res) => {
  try {
    const { name, lat, lng, type, label_nl, label_en, x, y, icon, description } = req.body;
    const safeDescription = typeof description === 'object' ? JSON.stringify(description) : description || null;
    const q = 'INSERT INTO map_points (name, lat, lng, type, label_nl, label_en, x, y, icon, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *';
    const r = await pool.query(q, [name, lat || null, lng || null, type || null, label_nl || null, label_en || null, x || null, y || null, icon || null, safeDescription]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/map/:id', requireAuth, async (req, res) => {
  try {
    const { name, lat, lng, type, label_nl, label_en, x, y, icon, description } = req.body;
    const safeDescription = typeof description === 'object' ? JSON.stringify(description) : description || null;
    const q = 'UPDATE map_points SET name=$1, lat=$2, lng=$3, type=$4, label_nl=$5, label_en=$6, x=$7, y=$8, icon=$9, description=$10 WHERE id=$11 RETURNING *';
    const r = await pool.query(q, [name, lat || null, lng || null, type || null, label_nl || null, label_en || null, x || null, y || null, icon || null, safeDescription, req.params.id]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/map/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM map_points WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Info ────────────────────────────────────────────────────────────────────

// PUBLIC
app.get('/api/info', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM info');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PROTECTED
app.post('/api/info', requireAuth, async (req, res) => {
  try {
    const { key, value, lang } = req.body;
    const q = 'INSERT INTO info (key, value, lang) VALUES ($1,$2,$3) RETURNING *';
    const r = await pool.query(q, [key, value, lang || 'en']);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/info/:id', requireAuth, async (req, res) => {
  try {
    const { key, value, lang } = req.body;
    const q = 'UPDATE info SET key=$1, value=$2, lang=$3 WHERE id=$4 RETURNING *';
    const r = await pool.query(q, [key, value, lang || 'en', req.params.id]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/info/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM info WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Schedule ────────────────────────────────────────────────────────────────

// PUBLIC
app.get('/api/schedule', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schedule');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PROTECTED
app.post('/api/schedule', requireAuth, async (req, res) => {
  try {
    const { act_id, stage, day, start_time, end_time } = req.body;
    const q = 'INSERT INTO schedule (act_id, stage, day, start_time, end_time) VALUES ($1,$2,$3,$4,$5) RETURNING *';
    const r = await pool.query(q, [act_id || null, stage || null, day || null, start_time || null, end_time || null]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/schedule/:id', requireAuth, async (req, res) => {
  try {
    const { act_id, stage, day, start_time, end_time } = req.body;
    const q = 'UPDATE schedule SET act_id=$1, stage=$2, day=$3, start_time=$4, end_time=$5 WHERE id=$6 RETURNING *';
    const r = await pool.query(q, [act_id || null, stage || null, day || null, start_time || null, end_time || null, req.params.id]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/schedule/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM schedule WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── SPA fallback ────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('Server listening on', port));