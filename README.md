# Bankruptcy Canvas

**Live: https://rlfordon.github.io/bankruptcy-canvas/**

A spatial research tool for Title 11 of the U.S. Code. Pull sections, defined terms, and cross-references onto a canvas; arrange them, follow the trail, save your work.

Built around a pain point every bankruptcy professional will recognize: chasing definitions scattered across multiple sections and cross-references to other statutes shouldn't require an arts & crafts project, or copy-pasting into Word.

## What you can do

- **Search** for a section number (`547`) or defined term (`claim`) in the top bar.
- **Click any cross-reference or defined term** inside a card to spawn a linked card next to it. Edges between cards show how you got there.
- **Pin a card** to keep it when you start fresh; unpinned cards clear with "New".
- **Drag cards** to arrange them however you like. The canvas pans and zooms.
- **Export / Import** your canvas as JSON to share or archive a research session.
- **History sidebar** lets you jump back to any card you've opened in this session.

Everything runs in your browser. There is no account, no backend, no telemetry — your sessions live in `localStorage` and any JSON files you export.

## Source data

The app reads the official USLM XML of Title 11 published by the Office of the Law Revision Counsel (`usc11.xml`, committed in this repo for reproducibility). At build time it's parsed into per-section JSON, a defined-terms map, and a Lunr search index served as static files.

## Run it locally

```bash
npm install
npm run build:data     # parse usc11.xml → public/data/
npm run dev            # http://localhost:5173
```

`build:data` must run before `dev` or `preview` — the SPA fetches static JSON from `public/data/`, which is git-ignored.

## Test

```bash
npm test               # unit + integration (Vitest)
npm run test:e2e       # Playwright smoke test
npm run typecheck
npm run lint
```

## Build

```bash
npm run build          # build:data + tsc --noEmit + vite build
npm run preview        # serve dist/
```

## Architecture

- `scripts/build-data/` — Node pipeline: USLM XML → per-section JSON, term map, Lunr index.
- `src/` — React SPA. State in Zustand. Canvas via `@xyflow/react`. Tailwind for styling.
- `public/data/` — generated, git-ignored.

Deployed to GitHub Pages on push to `main`.
