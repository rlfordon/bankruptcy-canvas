# Title 11 Bankruptcy Canvas — Design

**Date:** 2026-04-18
**Status:** Draft — pending user review

## 1. Purpose

A spatial research tool for the U.S. Bankruptcy Code (Title 11). A practitioner reading a dense section like § 546(e) can pull the section, its defined terms (wherever they're defined — § 101, § 741, § 761, etc.), and its cross-referenced sections onto a single canvas, arrange them, connect them, and save the layout as a research session.

Primary pain point addressed: chasing definitions and cross-references across chapters and copy-pasting into Word to keep track. The tool automates the extraction and keeps the full web of connections visible.

**Audience:** portfolio/learning project, aspirationally usable by bankruptcy attorneys.

## 2. Architecture

Single-page app, static site, no backend.

1. **Build-time pipeline** — a Node script parses `usc11.xml` (USLM 1.0 format, ~4.3MB, from the Office of the Law Revision Counsel) and emits JSON artifacts consumed by the app.
2. **Runtime app** — a React SPA that loads the artifacts, renders the canvas, handles search and sessions. All state client-side. localStorage for persistence, JSON export/import for portability.

**Deliberate constraints:**
- USC Title 11 changes rarely — no reason to parse XML at runtime.
- Static hosting (GitHub Pages or Netlify) = zero ops, no portfolio rot, offline-capable after first load.
- Full corpus ships to the client (target: a few MB gzipped).
- Sessions are self-contained JSON blobs — shape matches what a future API would accept, so a backend can be added later without rewriting the client.
- Sessions don't sync across devices in v1. JSON export/import is the workaround.

## 3. Build-time data pipeline

Input: `usc11.xml` (USLM 1.0).

Outputs three artifact kinds:

### 3.1 Per-section JSON
One file per USC section (`sections/s546.json`, `sections/s541.json`, ...). Contains:
- Section number, heading, chapter.
- Structured body preserving subsection hierarchy (a → 1 → A → i).
- Extracted cross-references — every `<ref href="...">` with resolved target.
- Defined terms *used* in this section (tagged inline in the body and listed separately).

### 3.2 Term → definition map
`terms.json`: for every defined term in Title 11, where it's defined and its scope.

```json
{
  "claim": { "section": "101", "subsection": "(5)", "scope": "title" },
  "settlement payment": { "section": "741", "subsection": "(8)", "scope": "chapter:7" }
}
```

This artifact solves the scattered-definitions problem (§ 101 vs § 741 vs § 761). Scope values: `title` (applies across Title 11), `chapter:N`, or `section:N` for local definitions.

### 3.3 Search index
- Lunr prebuilt index over section text + headings.
- Section-number lookup table for fast "jump to § 546(e)" navigation.

### 3.4 Extraction confidence
- **Cross-references:** high — USLM tags them explicitly with `<ref>`.
- **Defined terms:** needs tuning. USLM marks introductions of defined terms via `<term>` tags or `<quotedContent>` patterns like *The term "X" means...*. Extractor will be written, then spot-checked against § 101, § 741, § 761 before shipping.
- **Chapter-scoping for definitions:** parsed from the "applies in this chapter" language at the top of definition sections. Where ambiguous, the pipeline tags the definition as a candidate rather than guessing, and the UI surfaces it as a picker.

## 4. Canvas UX

### 4.1 Card types (v1)

**Section card.** Renders the section text with inline markup:
- `<ref>` cross-references styled one way (solid underline, distinct color).
- Defined terms styled another way (dashed underline, tooltip-on-hover).
- Header: section number and heading.
- Body preserves full subsection structure.

**Definition card.** Compact:
- Defined term.
- Where defined (e.g., § 101(5), § 741(8)).
- Definition text.
- Scope badge if chapter-scoped ("Chapter 7 only").

### 4.2 Adding cards
- **Search box** (top bar): section number ("546(e)") or keyword. Section-number lookup is exact; keyword uses Lunr.
- **Inline click** on any term or `<ref>` in an existing card → spawns the corresponding card adjacent, with an edge drawn automatically.
- **"Expand all" button** on a section card → pulls every defined term + referenced section used in that card onto the canvas, edges connected. (The § 546(e) firehose.)

### 4.3 Card interactions
- Drag to reposition.
- Collapse/expand body.
- Delete.
- Pin (pinned cards survive "New session" / bulk clear operations; unpinned cards are removed).
- Per-card "hide definitions used by this card" / "show" toggle.

### 4.4 Edges
- **Auto-edges:** drawn when a card is spawned from a click on a parent card. Thin, unlabeled.
- **Manual edges:** user can draw between any two cards for grouping/notes-to-self. Optional label.

### 4.5 History sidebar
Collapsible, left side.
- Chronological list of every card opened in the session, newest first.
- Click re-focuses canvas on that card (no duplicate spawn).
- Independent of the canvas — deleting a card from the canvas doesn't remove it from history.

### 4.6 Session management
- Autosave to localStorage on every change (debounced, ~500ms).
- Explicit controls: New session / Load session / Export JSON / Import JSON.
- Session schema:
  ```
  {
    "version": 1,
    "cards": [...],
    "edges": [...],
    "history": [...],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  }
  ```

## 5. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Strong types across XML parse → JSON → UI |
| Framework | React + Vite | Fast dev loop, static build, mature ecosystem |
| Canvas | React Flow (`@xyflow/react`, MIT) | Purpose-built for node-edge graphs with custom node components |
| Search | Lunr.js | Client-side, small, covers v1 keyword needs; swappable for a vector index later |
| State | Zustand | Small, canvas state is straightforward |
| Styling | Tailwind CSS | Fast iteration on card layouts |
| XML parsing (build) | `fast-xml-parser` | Handles USLM namespaces |
| Testing | Vitest + Testing Library + Playwright | Vitest for pipeline and unit tests; Playwright for a canvas smoke test |
| Deploy | GitHub Pages or Netlify | Static, free, portfolio-appropriate |

## 6. Scope

### v1 (ship)
- Build pipeline producing per-section JSON, term-definition map, Lunr index.
- Canvas with section and definition cards, auto-edges, manual edges.
- Inline clickable terms and cross-refs, expand-all button, hide/pin/delete.
- Search: section number and keyword.
- History sidebar.
- Session: localStorage autosave + JSON export/import.
- Single deployed URL.

### Stretch (v2+)
- Semantic search via FLP Inception or sentence-transformers, pre-computed static vector index.
- Concept ontology layer for "find by bankruptcy concept" (e.g., avoidance actions → preferences → ordinary course exception).
- Annotations / user notes on cards.
- Backend for saved sessions across devices (reusing the existing session JSON shape).
- Mobile/tablet layout.

### Out of scope
- Other USC titles — Title 11 only.
- Editing or redlining statute text.
- Authentication.

## 7. Error handling and edge cases

- **Ambiguous defined terms** (same term defined in multiple chapters): render a picker card; user resolves which definition applies in context.
- **Broken `<ref>` href** (points outside Title 11): render as non-clickable text with a tooltip indicating external reference.
- **Corrupt session JSON on import:** validate against the session schema, surface a readable error, do not clobber the existing session.
- **Large canvas performance:** virtualize off-screen cards if performance degrades above ~50 cards. Not pre-optimizing.
- **XML schema drift** (USLM version changes): pipeline fails loudly with line numbers and the offending element, rather than emitting partial data.

## 8. Testing approach

- **Pipeline:** unit tests for XML extraction (sections, refs, defined terms, chapter-scoping) against small XML fixtures plus spot-checks against real § 101, § 541, § 546, § 741.
- **Core UI logic:** unit tests on session reducers, card/edge operations, term-resolution.
- **Search:** unit tests on section-number lookup and Lunr wiring.
- **End-to-end smoke:** a single Playwright test — search "546(e)", click a defined term, confirm definition card spawns with correct edge, export/import session round-trips.
