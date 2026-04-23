# Bankruptcy Canvas

A spatial research tool for Title 11 of the U.S. Code. Pull sections, defined terms, and cross-references onto a canvas; arrange, connect, save.

Driven by the § 546(e) pain point: chasing definitions scattered across § 101, § 741, § 761 and cross-refs to §§ 544, 547, 548 shouldn't require copy-pasting into Word.

## Develop

```bash
npm install
npm run build:data     # parse usc11.xml → public/data/
npm run dev            # http://localhost:5173
```

## Test

```bash
npm test               # unit + integration (Vitest)
npm run test:e2e       # Playwright smoke test
npm run typecheck
npm run lint
```

## Build

```bash
npm run build          # runs build:data + tsc --noEmit + vite build
npm run preview        # serve dist/
```

## Architecture

- `scripts/build-data/` — Node pipeline: USLM XML → per-section JSON, term map, Lunr index.
- `src/` — React SPA. State in Zustand. Canvas via `@xyflow/react`. Tailwind for styling.
- `public/data/` — generated, git-ignored.

Design doc: `docs/superpowers/specs/2026-04-18-bankruptcy-canvas-design.md`
Implementation plan: `docs/superpowers/plans/2026-04-18-bankruptcy-canvas.md`

## Deploy

GitHub Pages workflow at `.github/workflows/deploy.yml` builds and publishes on push to `main`. Requires the repo to be public (or on a GitHub Pro/Team plan) and Pages enabled in repo settings.
