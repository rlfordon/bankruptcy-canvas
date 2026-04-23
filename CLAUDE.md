# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app locally

`npm run build:data` **must run before** `npm run dev` (or `preview`). The SPA fetches static JSON artifacts from `public/data/` at runtime, and that directory is git-ignored — it's regenerated from `usc11.xml` by the pipeline. If `public/data/sections/*.json` is missing, the dev server boots but every card fails to load.

`npm run build` chains `build:data → tsc --noEmit → vite build`. The `tsc --noEmit` step is a type-gate only; Vite handles actual transpilation. Never call `tsc -b` — the old plan tried that and hit TS6310 under `noEmit`; the single-tsconfig layout intentionally avoids project references.

Run a single test file: `npx vitest run tests/path/to/file.test.ts`. Watch mode is `npm run test:watch`. E2E via `npm run test:e2e` boots `vite preview` on port 4173 automatically (via `playwright.config.ts`'s `webServer`). If the port is stuck, `lsof -ti:4173 | xargs -r kill` first.

## Two-layer architecture

Everything is split into **build-time pipeline** (`scripts/build-data/`) and **runtime SPA** (`src/`). The two layers communicate only through JSON artifacts in `public/data/` — there are no cross-directory imports except `src/canvas/cardSpawning.ts` which borrows `resolveRef` (a pure function with no fast-xml-parser dependency). Types in `src/types/section.ts` and `src/types/term.ts` are **deliberately duplicated** from `scripts/build-data/extractSections.ts` and `extractTerms.ts`. Keep them in sync when changing shapes, but don't import across the boundary — the runtime must only consume serialized JSON.

## Parsing USLM XML — the non-obvious part

`scripts/build-data/parseXml.ts` uses fast-xml-parser with `preserveOrder: true`. This is load-bearing: USLM embeds `<ref>` elements inline with text ("An action under <ref>section 547</ref> or <ref>section 548</ref> may be commenced"), and `preserveOrder: false` would collapse the text siblings and group the refs, destroying reading order. The audit before this was fixed showed 55% of sections had mixed ref+text units.

The consequence: the parsed tree is an **array of single-key objects** with attributes under a sibling `:@` key, not the typical object-keyed shape. Every traversal goes through helpers in `scripts/build-data/uscTree.ts` (`tagOf`, `childrenOf`, `attrOf`, `firstDescendant`, `textOf`). Don't write ad-hoc tree walks — use the helpers.

## Defined-term extraction — two shapes

Title 11 uses two paragraph shapes for definitions. The extractor (`extractFromParagraph` in `scripts/build-data/extractTerms.ts`) falls through both:

1. **Simple:** `<content>The term "X" means Y.</content>` — whole definition in one string, matched by `TERM_RE`.
2. **Complex (e.g., § 101 "claim", "affiliate"):** `<chapeau>The term "X" means—</chapeau>` followed by `<subparagraph>[]`, where each subparagraph is either a leaf `<content>` or its own `<chapeau>` + `<clause>[]` nesting. `subparaText` recurses into the clause level and joins parts with `"; "`.

Both shapes are covered by fixtures under `tests/build-data/fixtures/`. When touching the extractor, verify against the real corpus too — `npm run build:data` should yield ~95 terms and definitions for `claim`, `creditor`, `affiliate`, `settlement payment` should all be substantial (not truncated at em-dashes).

Scope values on `TermCandidate.scope` are the literal `'title'` or the template-literal `` `chapter:${N}` ``. Subchapters flatten to their containing chapter (e.g., § 741 is under subchapter III of ch 7 in USLM, surfaced as `chapter:7`).

## Runtime state — Zustand + pure reducers

`src/state/sessionStore.ts` exposes `setCards((cards) => newCards)` and `setEdges((edges) => newEdges)` — updater-function setters, not direct setters. Domain logic lives in `src/state/cardOps.ts` as pure functions (`addCard`, `removeCard`, `togglePin`, `moveCard`, `clearUnpinned`, `addEdge`, `removeEdgesForCard`). Components call `setCards((cs) => cardOps.addCard(cs, newCard))`. Keep new mutations in `cardOps.ts`, not inline in components or the store.

Sessions round-trip through `src/state/persistence.ts`:
- `validateSession` is a type predicate; every code path that loads untrusted JSON (localStorage or imported file) runs it before trusting the payload.
- `makeDebouncedSaver` + `useSessionStore.subscribe` in `src/main.tsx` autosaves every 500ms.
- The exported Session schema (`version: 1, cards, edges, history, viewport`) is what a future backend would receive — preserve its shape if adding fields; bump `version` and handle migrations in `validateSession`.

## Canvas — React Flow in controlled mode

`src/canvas/Canvas.tsx` runs React Flow with `nodes`/`edges` sourced from the Zustand store. `onNodesChange` translates position changes back into `cardOps.moveCard`; selection and dimension changes are intentionally ignored. Three node types (`section`, `definition`, `picker`) are registered via a module-level `nodeTypes` constant (inline objects would cause React Flow to warn every render).

`ReactFlowProvider` is in `src/App.tsx`, wrapping both `HistorySidebar` and `Canvas`, because `HistorySidebar` uses `useReactFlow()` to re-center on history clicks. Don't lower the provider back into `Canvas.tsx` without moving the sidebar's hook out too.

Card spawning: `src/canvas/cardSpawning.ts` owns `spawnFromRef` / `spawnFromTerm`. Click handlers in `InlineMarkup.tsx` call them; they dedupe against existing cards (pushing to history rather than duplicating), spawn a `PickerCard` for ambiguous terms, and attach an auto-edge via `cardOps.addEdge`. All IDs are `nanoid()`.

## Deploy

GitHub Pages workflow at `.github/workflows/deploy.yml`. Live site at `https://rlfordon.github.io/bankruptcy-canvas/`. The repo needs to be public (or on Pro) for Pages to work.

First-time deploys can get stuck with `actions/deploy-pages@v4` timing out on polling (the action's `timeout` input is capped at 600000 ms server-side, even if you pass higher). If subsequent runs fail with "in progress deployment" pointing to an old SHA, the unstick procedure is in the `reference_gh_pages_stuck_deploy` memory note: `gh api -X DELETE /repos/OWNER/REPO/deployments/{id}` for the blocking environment deployment, then rerun. Marking deployments `inactive` doesn't work — only hard delete releases Pages's internal lock.

## Known limitations tracked in-code

Lint warns on `react-hooks/exhaustive-deps` in the three custom node components (`SectionCard`, `DefinitionCard`, `PickerCard`). The effects intentionally depend on `card?.sectionNumber` / `card?.term` / `card?.candidateIndex` rather than the whole `card` object — adding the full card would re-fetch on every store update (drag, pin, collapse). If you touch those effects, preserve the narrow deps.

## Key references

- Design spec: `docs/superpowers/specs/2026-04-18-bankruptcy-canvas-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-18-bankruptcy-canvas.md` (40+ commits of history, all traceable)
- Input corpus: `usc11.xml` (4.3 MB, USLM 1.0 from OLRC) — committed for reproducibility; do not edit
