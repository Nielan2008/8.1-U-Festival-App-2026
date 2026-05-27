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
