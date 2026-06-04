# ❤️U Festival App

## What is this?
A festival web app built with React, i18next, and Leaflet. Includes a CMS for editing festival content.

## Tech Stack
- Frontend: React, react-leaflet, i18next
- Backend: Node.js, Express
- Database: PostgreSQL (Render)
- Hosting: Render.com

## Folder Structure
- `/src` — React frontend
- `/src/cms` — CMS pages and components
- `/src/data` — Original JSON data files
- `/server` — Express backend
- `/server/migrations` — Database setup and seed scripts
- `/public` — Static assets and service worker

## Environment Variables
Create a `.env` file in the project root:

```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=anyrandomstring
CMS_PASSWORD=yourpassword
SEED_KEY=myseedkey123
PORT=3001
NODE_ENV=development
```

## How to run locally

```bash
npm install
npm run dev
```

Note: You need PostgreSQL installed locally OR you can skip local DB and deploy directly to Render.

## How to build

```bash
npm run build
```

## How to seed the database

After deploying to Render, visit:

```text
https://your-app.onrender.com/api/seed-db?key=YOUR_SEED_KEY
```

## How to deploy to Render

1. Push code to GitHub
2. Go to render.com
3. New > PostgreSQL — create a free database
4. New > Web Service — connect your GitHub repo
5. Build command: `npm install && npm run build`
6. Start command: `npm run start`
7. Add environment variables in Render dashboard
8. Deploy and visit `/api/seed-db?key=YOUR_SEED_KEY` once

## CMS Usage

- Login: `https://your-app.onrender.com/cms/login`
- Dashboard: `https://your-app.onrender.com/cms/dashboard`
- Use `CMS_PASSWORD` to login
- Edit acts, news, schedule, info, and map data
- Changes save directly to PostgreSQL

## Issues fixed during development

- Render running Vite preview instead of Node server
- PostgreSQL SSL connection requiring `rejectUnauthorized: false`
- Database suspended on free tier (manual resume needed)
- Service worker intercepting API calls and breaking sessions
- Session cookies not persisting due to missing trust proxy
- `info.json` nested structure causing seed script to fail
- Duplicate `useTranslation` import in `Schedule.jsx`
- `vite: Permission denied` on Render (moved Vite to dependencies)
- Node 24 ESM resolver issues (downgraded to Node 20)
- Missing `.frankfurt-postgres.render.com` in `DATABASE_URL`

## Developer prompts used

- Add a QR code feature to the home page that allows users to download or install the web app.
- Check if everything in the CMS is working correctly.
- Add comments throughout the codebase and put all prompts into README.md.
- Audit map, schedule, artist, bilingual, PWA, and CMS functionality.
- Ensure environment-aware install URLs and fallback download behavior.

## Important notes

- Free PostgreSQL on Render suspends after 90 days inactivity
- Resume it manually from the Render dashboard if APIs return 500
- After resuming, trigger a manual redeploy of the web service
- The `SEED_KEY` endpoint should be removed after initial seeding
