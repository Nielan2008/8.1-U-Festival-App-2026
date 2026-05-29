# ❤️U Festival App

A mobile-first React + Vite Progressive Web App for the ❤️U Festival on August 15–16, 2026 in Strijkviertel, Utrecht.

## Run locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Features

- React + Vite mobile-first app
- Leaflet festival map with stage markers and GPS location
- Schedule page with favourite acts and Notification API support
- Info page with accordion sections
- NL/EN language toggle powered by i18next
- PWA manifest and service worker for offline-friendly caching

## AI Prompts Log

### Prompt 3 — Dark mode text fixes, .gitignore, PHP CMS
**Description:**
Fix language toggle button styling and dark mode text color. Fix schedule text color in dark mode.
Add node_modules to .gitignore. Build a PHP-based CMS at /cms that reads and writes the PWA's
JSON data files, with session login, and a Leaflet map editor that supports GPS location capture
and click-to-place marker positioning.

PROMPT:
Fix the following bugs and add the following features to the existing ❤️U Festival PWA. Do not rebuild anything from scratch — work with the existing codebase only.

### Prompt 4 — Node modules / build fix
**Description:**
Resolve the Render deployment build errors by fixing package configuration and ensuring the project does not commit node_modules. Update script paths or dependency versions so Vite works correctly in the build environment.

PROMPT:
GIT IGNORE NODE_MODULES FIX

### Prompt 5 — Render build dependency conflict and Vite permission fix
**Description:**
Fix the Render deploy failure where `npm install` fails due to a Vite/@vitejs/plugin-react peer dependency conflict and `npm run build` fails with `sh: 1: vite: Permission denied`.

PROMPT:
==> Cloning from https://github.com/Nielan2008/8.1-U-Festival-App-2026
==> Checking out commit 52dfecfe0611f7df47f6f8edadf5c98ccfea6204 in branch main
==> Using Node.js version 24.14.1 (default)
==> Docs on specifying a Node.js version: https://render.com/docs/node-version
==> Running build command 'npm install; npm run build'...
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: @vitejs/plugin-react@4.7.0
npm error Found: vite@8.0.14
npm error node_modules/vite
npm error   dev vite@"^8.0.14" from the root project
npm error
npm error Could not resolve dependency:
npm error peer vite@"^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0" from @vitejs/plugin-react@4.7.0
npm error node_modules/@vitejs/plugin-react
npm error   dev @vitejs/plugin-react@"^4.3.1" from the root project
npm error
npm error Conflicting peer dependency: vite@7.3.3
npm error node_modules/vite
npm error   peer vite@"^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0" from @vitejs/plugin-react@4.7.0
npm error   node_modules/@vitejs/plugin-react
npm error     dev @vitejs/plugin-react@"^4.3.1" from the root project
npm error
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
npm error to accept an incorrect (and potentially broken) dependency resolution.
npm error
npm error
npm error For a full report see:
npm error /opt/render/.cache/_logs/2026-05-29T07_57_40_842Z-eresolve-report.txt
npm error A complete log of this run can be found in: /opt/render/.cache/_logs/2026-05-29T07_57_40_842Z-debug-0.log
> loveu-festival-app@0.1.0 build
> npx vite build
sh: 1: vite: Permission denied
==> Build failed 😞
==> Common ways to troubleshoot your deploy: https://render.com/docs/node-version

### Prompt 6 — Render lockfile and Vite version rebuild fix
**Description:**
Resolve the Render.com build failure caused by stale or mismatched Vite dependencies and a corrupted lockfile. Regenerate `package-lock.json`, pin `vite` and `@vitejs/plugin-react` to stable exact versions, move Vite build dependencies into `dependencies`, add a clean `.npmrc`, and pin Node to `20.19.2`.

PROMPT:
My Render.com deploy is failing with this error:

  Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '/opt/render/project/src/node_modules/vite/dist/node/chunks/chunk.js'
  imported from .../node_modules/vite/dist/node/cli.js

This means vite installed but is incomplete/corrupted on Render.
The root cause is a stale package-lock.json or an incorrect vite version
that does not match what Render's npm install resolves to.

Please fix ALL of the following:

---

## FIX 1: Delete and regenerate package-lock.json

Delete package-lock.json entirely and regenerate it cleanly by running:
  npm install

This ensures the lockfile matches the actual installed packages.
Commit the new package-lock.json to the repo.

---

## FIX 2: Pin vite to a specific stable version

In package.json, set vite to an exact pinned version (no ^ or ~) in dependencies:
  "vite": "5.4.19"

And @vitejs/plugin-react to:
  "@vitejs/plugin-react": "4.3.4"

These are the latest stable versions confirmed to work with Node 24.
Using ^ or ~ allows npm to resolve a broken or mismatched version on Render.

---

## FIX 3: Move ALL build-time packages to dependencies

On Render, devDependencies are pruned before the build runs unless you set
  NODE_ENV=development

Move these from devDependencies to dependencies in package.json:
  - vite
  - @vitejs/plugin-react

---

## FIX 4: Update .nvmrc

Change .nvmrc from:
  24
To a specific LTS-compatible version that is confirmed stable with Vite 5:
  20.19.2

Vite 5 has known issues with Node 24 due to ESM resolver changes.
Node 20 is the current LTS and fully supported by Vite 5.

Also update package.json engines:
  "engines": {
    "node": ">=20.0.0"
  }

---

## FIX 5: Update build script back to npx

Now that vite is properly in dependencies and the lockfile is clean, 
update the build script in package.json to use npx which is more reliable:
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }

---

## FIX 6: Add .npmrc to force clean installs

Create a .npmrc file in the project root with:
  prefer-dedupe=true
  legacy-peer-deps=false

---

## After all fixes, run locally to verify:

  rm -rf node_modules package-lock.json
  npm install
  npm run build

Confirm the dist/ folder is generated successfully before committing.

Then commit and push:
  - package.json (updated versions + scripts)
  - package-lock.json (freshly regenerated)
  - .nvmrc (updated to 20)
  - .npmrc (new file)

BUG FIX 1: Language toggle buttons — missing styling and dark mode text color
The NL/EN language toggle buttons currently have no styling and their text does not turn white in dark mode. Fix this completely:

Style both buttons to match the festival design: background var(--color-accent) (#F03228) for the active language, dark/transparent background for the inactive one
Text color must always be #FFFFFF regardless of light or dark mode — add color: #FFFFFF !important if needed to override any inherited or reset styles
Use Sansation font, Light 300 Italic weight
Slightly rounded corners consistent with the rest of the app
On hover: filter: brightness(1.1)
In dark mode ([data-theme="dark"] or .dark on <body>/<html>): explicitly set color: #FFFFFF on the buttons — check for any global CSS resets (such as * { color: inherit } or a body color that doesn't cascade correctly) that may be causing the white text to not appear
Check both the button element and any child <span> or text nodes inside the toggle component

BUG FIX 2: Schedule/Calendar — text not white in dark mode
In dark mode, the text inside the schedule block calendar is dark on dark and therefore unreadable. Fix every text element inside the schedule:

Act name, stage name, time range inside each act block: set to #FFFFFF in dark mode
Time axis labels (10:00, 10:15 etc.) on the left: set to var(--color-base) in dark mode
Stage column headers: set to #FFFFFF in dark mode
Day tab buttons (Zaterdag / Zondag): active tab text #FFFFFF, inactive tab text should still be clearly readable
Act detail modal: all text (title, description, times) must be white/light in dark mode
Trace all relevant CSS selectors: .schedule-block, .act-card, .time-label, .stage-header, .day-tab, .modal and any nested elements — add explicit color rules under [data-theme="dark"] for each
Do not rely on color: inherit inside dark mode — set colors explicitly

FIX 3: Add node_modules to .gitignore
Open or create the .gitignore file in the project root and make sure the following lines are present:
node_modules/
dist/
.env
.env.local
If .gitignore already exists, just add any missing lines — do not remove existing entries.

NEW FEATURE: PHP-based CMS at /cms
Build a completely separate PHP CMS that lives alongside the PWA. The PWA's JSON data files are the shared source of truth — the PHP CMS reads from and writes to those same JSON files so that content changes appear immediately in the React app.
File structure for the CMS:
/cms
  index.php          → login page
  dashboard.php      → main CMS hub with tabs
  save.php           → handles all POST save requests, writes to /src/data/*.json
  logout.php
  /includes
    auth.php         → session check, redirect to login if not authenticated
    header.php       → shared CMS header/nav
    footer.php
  /pages
    news.php
    info.php
    schedule.php
    acts.php
    map.php
Authentication:

Simple PHP session-based login
Password stored as a constant in auth.php (e.g. define('CMS_PASSWORD', 'festival2026');)
On correct password: $_SESSION['cms_auth'] = true, redirect to dashboard
On wrong password: show styled error message
Every CMS page starts with require 'includes/auth.php' which checks the session and redirects to login if not set
Logout clears the session and redirects to login

CMS pages and functionality:
News (news.php)

List all current news cards from news.json
Add new card: title (NL + EN), body (NL + EN), timestamp
Edit existing card inline
Delete card with confirmation
Save posts to news.json via save.php

Info (info.php)

Edit all accordion sections from info.json
Each section: title (NL + EN), body text (NL + EN)
Add and delete sections
Save to info.json

Schedule (schedule.php)

List all acts per day (Saturday / Sunday) from schedule.json
Add act: stage (dropdown), day, start time, end time, act name, linked act ID
Edit and delete acts
Save to schedule.json

Acts (acts.php)

List all acts from acts.json
Add/edit/delete acts
Fields: name, tagline (NL + EN), description (NL + EN), YouTube URL, image URL
Save to acts.json

Map (map.php)

List all map markers from map.json
For each marker: name (NL + EN), type, latitude, longitude (editable number inputs)
Embed a Leaflet map (loaded via CDN) inside the PHP page
Option A — Use live location: Button "📍 Use my current GPS location" that uses the browser's navigator.geolocation.getCurrentPosition() and fills the lat/lng input fields for the selected marker
Option B — Click on map: A "Pick on map" toggle that lets the user click anywhere on the Leaflet map to set the lat/lng for a marker. Show a temporary pin at the clicked location and a confirm button before saving
Add new markers and delete existing ones
Save to map.json

CMS styling:

Use the same CSS variables as the main app: --color-accent: #F03228, --color-secondary: #247BA0, --color-info: #E3B505
Sansation font loaded via Google Fonts
Clean, desktop-optimized layout with a sidebar or top tab navigation
Styled form inputs, buttons with rounded corners, matching the festival identity
Success and error messages after every save action

save.php:

Accepts POST requests with a type field (e.g. type=news, type=acts) and a data field containing JSON
Decodes the JSON and writes it to the correct file in /src/data/
Returns a JSON response: { "success": true } or { "success": false, "error": "..." }
Validate that the target file path is within /src/data/ to prevent path traversal

README UPDATE
Add the following entry to the ## AI Prompts Log section in README.md:
### Prompt 3 — Dark mode text fixes, .gitignore, PHP CMS
**Description:**
Fix language toggle button styling and dark mode text color. Fix schedule text color in dark mode.
Add node_modules to .gitignore. Build a PHP-based CMS at /cms that reads and writes the PWA's
JSON data files, with session login, and a Leaflet map editor that supports GPS location capture
and click-to-place marker positioning.
[paste this full prompt here]

Make all changes incrementally. Do not remove or break any existing functionality.
 