# Pollinator Studio (Static)

A static, no-build pollinator garden-design website. Open `index.html` in a
browser — no installation, no server, no build tools.

Current version: **V4.0**. Two-region prototype: supports ZIP 77429 (Houston / Gulf Coast) and 80906 (Colorado Springs / Front Range). National expansion continues via CLAUDE.md roadmap.

## Run it
- **Locally:** double-click `index.html` (Firefox or Chrome), or
- **Hosted:** upload the whole folder to any static host (Netlify, Vercel,
  Cloudflare Pages, GitHub Pages). No configuration needed.

## Project structure
```
pollinator-studio/
  index.html          page markup; links the CSS and scripts
  styles.css          all styling
  js/
    plant-data.js     the plant dataset (loaded first) — the file that grows
    app.js            all logic + rendering (reads the global `plants`)
  data/               JSON records + source notes
  img/plants/         placeholder reference images (one SVG per plant)
  CLAUDE.md           working rules + regression checklist — READ BEFORE EDITING
```

## Editing without breaking things
This project is split into small files and tracked in git specifically to avoid
regressions. Change one file/section at a time and commit. See `CLAUDE.md` for
the full rules and the post-change regression checklist.

## Status / limitations
Prototype. Plant suitability, toxicity, local native range, and nursery
availability still need expert/local verification before real-world planting.
"Snake-aware" and "mosquito-aware" options reduce/define habitat but are not
pest control. Plant images are placeholders, not verified species photos.
