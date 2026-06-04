import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

async function tableHasRows(table) {
  const res = await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
  return res.rows.length > 0;
}

async function seed() {
  try {
    const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data');
    // acts
    if (!(await tableHasRows('acts'))) {
      const actsFile = path.join(base, 'acts.json');
      if (fs.existsSync(actsFile)) {
        const acts = JSON.parse(fs.readFileSync(actsFile, 'utf8')) || {};
        const entries = Array.isArray(acts)
          ? acts.map((a) => [a.slug || a.id || a.name || '', a])
          : Object.entries(acts);
        for (const [slug, a] of entries) {
          const q = `INSERT INTO acts (name, slug, tagline, description, image_url, genre, lang, youtube) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`;
          const description = typeof a.description === 'object' ? JSON.stringify(a.description) : a.description || '';
          const tagline = typeof a.tagline === 'object' ? JSON.stringify(a.tagline) : a.tagline || '';
          await pool.query(q, [a.name || a.title || '', slug || null, tagline, description, a.image || a.image_url || null, a.genre || null, a.lang || 'en', a.youtube || a.video || null]);
          console.log('inserted act', a.name || a.title);
        }
      }
    }

    // news
    if (!(await tableHasRows('news'))) {
      const newsFile = path.join(base, 'news.json');
      if (fs.existsSync(newsFile)) {
        const news = JSON.parse(fs.readFileSync(newsFile, 'utf8')) || [];
        for (const n of news) {
          await pool.query(`INSERT INTO news (title, body, image_url, published_at, lang) VALUES ($1,$2,$3,$4,$5)`, [n.title?.en || n.title || '', n.body?.en || n.body || '', n.image || null, n.timestamp ? new Date(n.timestamp) : new Date(), n.lang || 'en']);
          console.log('inserted news', n.title);
        }
      }
    }


// info
if (!(await tableHasRows('info'))) {
  const infoFile = path.join(base, 'info.json');
  if (fs.existsSync(infoFile)) {
    const infoData = JSON.parse(fs.readFileSync(infoFile, 'utf8')) || {};

    // seed meta fields
    if (infoData.meta) {
      for (const [key, value] of Object.entries(infoData.meta)) {
        await pool.query(`INSERT INTO info (key, value, lang) VALUES ($1,$2,$3)`, [key, JSON.stringify(value), 'both']);
        console.log('inserted info meta', key);
      }
    }

    // seed nl sections
    if (Array.isArray(infoData.nl)) {
      for (let i = 0; i < infoData.nl.length; i++) {
        const section = infoData.nl[i];
        const key = section.title?.nl || `section_${i}`;
        await pool.query(`INSERT INTO info (key, value, lang) VALUES ($1,$2,$3)`, [key, JSON.stringify(section), 'nl']);
        console.log('inserted info nl', key);
      }
    }

    // seed en sections
    if (Array.isArray(infoData.en)) {
      for (let i = 0; i < infoData.en.length; i++) {
        const section = infoData.en[i];
        const key = section.title?.en || `section_${i}`;
        await pool.query(`INSERT INTO info (key, value, lang) VALUES ($1,$2,$3)`, [key, JSON.stringify(section), 'en']);
        console.log('inserted info en', key);
      }
    }
  }
}

    // map
    if (!(await tableHasRows('map_points'))) {
      const mapFile = path.join(base, 'map.json');
      if (fs.existsSync(mapFile)) {
        const m = JSON.parse(fs.readFileSync(mapFile, 'utf8')) || { locations: [] };
        const locations = m.locations || m;
        for (const loc of locations) {
          const labelNl = loc.label?.nl || loc.name || loc.label || '';
          const labelEn = loc.label?.en || loc.name || loc.label || '';
          const description = JSON.stringify({ nl: loc.info || '', en: loc.info || '' });
          await pool.query(`INSERT INTO map_points (name, label_nl, label_en, lat, lng, x, y, icon, type, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
            labelEn || loc.id || null,
            labelNl || null,
            labelEn || null,
            loc.lat || loc.latitude || null,
            loc.lng || loc.longitude || null,
            loc.x || null,
            loc.y || null,
            loc.icon || '/marker_stage1_ponton.svg',
            loc.type || null,
            description
          ]);
          console.log('inserted map', loc.id || labelEn);
        }
      }
    }

    // schedule - best-effort
    if (!(await tableHasRows('schedule'))) {
      const scheduleFile = path.join(base, 'schedule.json');
      if (fs.existsSync(scheduleFile)) {
        const schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8')) || {};
        for (const day of Object.keys(schedule)) {
          const groups = schedule[day] || [];
          for (const g of groups) {
            const acts = g.acts || [];
            for (const a of acts) {
              const actSlug = a.id || a.title || null;
              const actResult = await pool.query('SELECT id FROM acts WHERE slug=$1 OR name=$2 LIMIT 1', [actSlug, a.title || null]);
              const actId = actResult.rows[0]?.id || null;
              await pool.query(`INSERT INTO schedule (act_id, stage, day, start_time, end_time) VALUES ($1,$2,$3,$4,$5)`, [actId, g.stage || null, day, a.start || a.start_time || null, a.end || a.end_time || null]);
              console.log('inserted schedule row for', a.title || a.id || 'unknown');
            }
          }
        }
      }
    }

    console.log('Seeding complete');
  } catch (err) {
    console.error('Seeding error', err);
    throw err;
  }
}

export default seed;

try {
  const caller = process.argv[1];
  if (caller && caller.endsWith('seed.js')) {
    seed().then(() => pool.end()).catch((err) => { console.error(err); pool.end(); });
  }
} catch (e) {
  // ignore
}
