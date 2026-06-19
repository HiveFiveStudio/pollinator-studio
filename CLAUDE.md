# Pollinator Studio — working rules for AI assistants and humans

Read this file before changing anything. It exists to stop the "fix one thing,
break another" loop. Current version: **V4.0** (see README and the changelog
array in `js/app.js`).

## What this is
A **static, no-build website**. You open `index.html` directly in a browser
(double-click, or host the folder on any static host). There is **no server,
no Node step, no bundler, no framework**.

## File map (where things live)
- `index.html` — page markup only. Links `styles.css` and the two scripts.
- `styles.css` — all styling.
- `js/plant-data.js` — the `plants` dataset (global `const plants`). **Loaded first.**
  This is the file that grows as the app goes national. Each record is one plant.
- `js/app.js` — all logic and rendering, wrapped in an IIFE. Reads the global
  `plants`. Exposes `window.PS` and binds button events at the bottom.

Load order matters: `plant-data.js` must come **before** `app.js` in `index.html`.

## Hard rules (do not break these)
1. **No build step.** Keep plain `.css` / `.js` files loaded with `<link>` and
   classic `<script src>` tags. Do NOT convert to ES modules (`import`/`export`),
   React, or anything that needs a bundler — that breaks double-click `file://`
   opening, which is a core requirement.
2. **Edit files in place.** Change only the relevant file/section. Never
   regenerate the whole app from memory — that is what caused past regressions.
3. **One change at a time**, then commit with a **single short one-line message**:
   `git commit -m "Short message here"`. Never use multi-line here-strings or
   heredocs in commit messages — they break the Windows PowerShell command parser.
4. **Keep the safety disclaimers.** Prototype/verify-locally language must stay,
   and gets more important as coverage expands beyond Houston.

## When you bump the version
Update the version string in ALL of these places (search for the current version):
- `index.html` `<title>` and the `<h1>` header + lede paragraph
- `js/app.js`: `regionFromZip()` notes, the prototype-note text, the data-QA
  text, the "Houston logic in Vx" text, the risk fallback label, and add a new
  entry to the `changelog` array in `renderChangelog()`
- `README.md` and `STABILITY-TEST-REPORT.md` headings

## Regression checklist (verify after any change)
- [ ] Page opens by double-clicking `index.html` (no console errors)
- [ ] Garden inputs panel on top, generated results full-width below
- [ ] Generate produces a palette; full numbered planting map renders
- [ ] Map scale + guide-line legend shows; placement table has center-to-center inches
- [ ] Bed-shape selector changes the drawn map outline
- [ ] Score tab shows numeric score + plain-English explanations
- [ ] No-matches state: set very restrictive inputs (native-only + pet-safe + deer
      + a tough micro-site) and confirm the friendly "no palette matched" screen
      appears instead of a blank page or a misleading score
- [ ] Plant-card images load from `img/plants/<id>.svg`; click-to-enlarge works
- [ ] Materials tab numbers are present; Print / save PDF works

## National expansion (the real roadmap)
Going national is mostly a **data** problem, not a code problem. The path:
1. Map ZIP -> geography (USDA hardiness zone + state and/or EPA ecoregion).
2. Tag each plant record in `plant-data.js` with the regions/zones it suits and
   its native range, sourced from references (USDA PLANTS, Lady Bird Johnson
   Wildflower Center, Audubon native-plants-by-ZIP, Pollinator Partnership
   ecoregional guides, Xerces regional lists).
3. Filter by geography in `matches()`/`generate()` the same way other constraints
   already work. Grow coverage region by region; the app can be national in
   structure while the dataset fills in.
