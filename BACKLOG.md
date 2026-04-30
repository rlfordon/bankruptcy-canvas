# Backlog

Personal backlog for features and bugs. Three rules: items have a checkbox, dated entries when they move to Done, and `grep` is the search.

## Now

_Nothing in flight._

## Next

- [ ] **Breadcrumb context on section cards** — show `Ch N — <heading> › Subch X › § Y` in the card header so a section opened cold is oriented in the code.
  - Pipeline: extend `Section` (and the runtime duplicate in `src/types/section.ts`) to carry `chapterHeading` and `subchapter: { num, heading } | null`. Un-flatten subchapters in [extractSections.ts:141-146](scripts/build-data/extractSections.ts).
  - UI: render breadcrumb under the title row in [SectionCard.tsx:32-34](src/canvas/SectionCard.tsx). Term cards probably want the same scoped to their definition source.
  - Inspired by STARA's Statutory Trees context augmentation (Surani et al., Stanford RegLab).

- [ ] **Chapeau styling in InlineMarkup** — render lead-ins so structure is visually obvious instead of one block of prose. The text is already there (flattened into a parent unit's `nodes` array per the comment at [extractSections.ts:94-95](scripts/build-data/extractSections.ts)); just needs distinct styling — italic or heavier weight — when a unit has both `nodes` and `children`.
  - Try this before sticky-positioned chapeaus; sticky inside React Flow nodes can fight the canvas's own scroll/zoom.
  - Inspired by STARA's "lead-ins" context — chapeaus are critical context that gets lost when you read a deep subdivision (e.g., § 547(b)(5)) in isolation.

## Later

From the v1 design spec's stretch list ([design.md:139-144](docs/superpowers/specs/2026-04-18-bankruptcy-canvas-design.md)):

- [ ] **Semantic search** — replace or supplement Lunr with sentence-transformers or FLP Inception, pre-computed as a static vector index served from `public/data/` (keeps the SPA backend-free).
- [ ] **Concept ontology layer** — "find by bankruptcy concept" (e.g., avoidance actions → preferences → ordinary course exception). Hand-curated map of concepts to sections; surfaces in search.
- [ ] **Annotations / user notes on cards** — free-text notes attached to a card, persisted in the session JSON. Bump session `version` and add a migration path in [persistence.ts](src/state/persistence.ts).
- [ ] **Backend for saved sessions across devices** — the session JSON shape was designed to be what a future API would accept ([design.md:25](docs/superpowers/specs/2026-04-18-bankruptcy-canvas-design.md)), so this is mostly auth + storage, not a client rewrite.
- [ ] **Mobile / tablet layout** — current canvas is desktop-only. React Flow has touch support; the open question is whether spatial research even makes sense on small screens or if a list-mode is needed.

Deferred edge cases from the implementation plan ([plan.md:3197-3198](docs/superpowers/plans/2026-04-18-bankruptcy-canvas.md)):

- [ ] **Large-canvas virtualization** — virtualize off-screen cards if performance degrades above ~50 cards. Not pre-optimizing; revisit when it actually hurts.
- [ ] **XML schema drift → loud failure with location** — pipeline currently relies on Node throwing if the expected path is missing. Enhance to a structured error with element/line context only if a real schema change makes the default unhelpful.

## Out of scope

Decisions from the design spec ([design.md:146-149](docs/superpowers/specs/2026-04-18-bankruptcy-canvas-design.md)) — not backlog, just guardrails so they don't creep back in:

- Other USC titles (Title 11 only).
- Editing or redlining statute text.
- Authentication.

## Done

- [x] 2026-04-30 — User-oriented README rewrite (live link, "What you can do", trimmed dev-process pointers).
