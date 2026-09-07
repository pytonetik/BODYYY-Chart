# BODYYY Chart

Latest app is a Vite + React clinic body-chart (not the earlier single-file HTML).

The 8 Sep 2026 workspace zip is a full Grok app-builder project (~493 files, including `.grok` internals). A cleaned source tree (no `.grok`, screenshots, or Vercel output) is `bodychart-latest-src.zip` in the Grok project folder.

## What this repo has now

- Earlier V1 static files: `index.html`, `app.js`, `figures.js`, `chart.js`
- This README

The full latest source was **not** fully committed file-by-file from Grok (150+ files plus figure `.webp` plates). Upload the cleaned zip on GitHub if you want the complete tree on `main`:

1. Open https://github.com/pytonetik/Interactive-Body-Chart
2. Add file → Upload files
3. Drop `bodychart-latest-src.zip` **or** unzip it first and drop the folders (`src/`, `public/`, `scripts/`, `package.json`, …)
4. Commit to `main`

Unzip-on-GitHub does not expand a zip into folders. Prefer unzipping on a computer, then upload the folder contents.

## Latest app (from the zip)

- Name in UI: **BODYYY Chart** — Quiet Charting
- Four views, symbol charting, callouts, local file save/open, PNG export
- Stack: Vite, TanStack Router, React 19
- Run (after unzip): `npm install` then `npm run dev`

Do not commit patient JSON/PNG exports.
