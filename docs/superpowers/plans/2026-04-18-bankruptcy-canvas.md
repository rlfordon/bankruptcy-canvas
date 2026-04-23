# Bankruptcy Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static SPA that lets a bankruptcy practitioner pull Title 11 sections and their defined terms / cross-references onto a spatial canvas, driven entirely by client-side JSON artifacts produced from `usc11.xml`.

**Architecture:** Two layers. A Node build script (`scripts/build-data`) parses `usc11.xml` (USLM 1.0) with `fast-xml-parser` and emits per-section JSON, a terms-to-definition map, and a prebuilt Lunr index into `public/data/`. A Vite + React + TypeScript SPA loads those artifacts, renders a React Flow canvas with custom section/definition card nodes, and persists session state (cards, edges, history, viewport) to localStorage with JSON export/import for portability.

**Tech Stack:** TypeScript 5, Vite 5, React 18, @xyflow/react 12, Zustand 4, Lunr 2, Tailwind 3, fast-xml-parser 4, Vitest 1 + @testing-library/react, Playwright 1, Node ≥20.

---

## Orientation for the Engineer

You are working in `/Users/fordon.4/Projects/bankruptcy-code`. Before starting, read these two files end-to-end — every task below assumes you know them:

- `docs/superpowers/specs/2026-04-18-bankruptcy-canvas-design.md` — the spec this plan implements.
- `usc11.xml` — the input corpus. USLM 1.0 format. Rough landmarks: `<section identifier="/us/usc/t11/s101">` defines title-wide terms starting with `In this title the following definitions shall apply:`. `<section identifier="/us/usc/t11/s741">` defines subchapter-scoped terms starting with `In this subchapter—`. Cross-references are `<ref href="/us/usc/t11/s546/a">...</ref>`. Grep these identifiers to see the shape before writing the extractor.

USLM terminology you will encounter: `uscDoc` → `main` → `title` → `chapter` → `subchapter` → `section` → `subsection` (a) → `paragraph` (1) → `subparagraph` (A) → `clause` (i) → `subclause` (I). Each level has `<num>` and either `<content>`, `<chapeau>` + children, or a mix. `<ref href="...">` appears anywhere inside text content.

**Conventions the plan follows:**
- Every task is TDD where behavior can be tested. Write the failing test first, watch it fail, implement minimally, watch it pass, commit.
- Commit after every task. Use conventional commit prefixes (`feat:`, `test:`, `chore:`, `refactor:`, `fix:`).
- No placeholders, no TODOs, no "fill in later" — if a task's code is shown, paste it verbatim and adjust only where the code explicitly says to.
- When a test file is created, put it at the mirrored path under `tests/` (not alongside source) so the tree stays clean.
- If something in this plan appears to conflict with the spec, the spec wins — stop and ask.

## File Structure

```
bankruptcy-code/
├── docs/                              (exists)
├── usc11.xml                          (exists — input corpus)
├── package.json                       Task 1
├── tsconfig.json                      Task 1
├── vite.config.ts                     Task 1
├── tailwind.config.ts                 Task 2
├── postcss.config.js                  Task 2
├── vitest.config.ts                   Task 1
├── playwright.config.ts               Task 28
├── .gitignore                         Task 1
├── .eslintrc.cjs                      Task 2
├── index.html                         Task 1
├── README.md                          Task 29
├── scripts/
│   └── build-data/
│       ├── index.ts                   Task 11 (orchestrator)
│       ├── parseXml.ts                Task 4  (XML → JS tree)
│       ├── extractSections.ts         Task 5  (section bodies + refs per section)
│       ├── resolveRef.ts              Task 6  (href → {section, subsection, ...} or external)
│       ├── extractTerms.ts            Task 7-9 (defined terms + scope)
│       ├── buildSearchIndex.ts        Task 10 (Lunr + section lookup)
│       └── emit.ts                    Task 11 (write artifacts to disk)
├── public/
│   └── data/                          Task 11 — generated, git-ignored
│       ├── sections/s{N}.json
│       ├── terms.json
│       ├── search-index.json
│       └── section-lookup.json
├── src/
│   ├── main.tsx                       Task 3
│   ├── App.tsx                        Task 3
│   ├── types/
│   │   ├── section.ts                 Task 12
│   │   ├── term.ts                    Task 12
│   │   └── session.ts                 Task 12
│   ├── data/
│   │   ├── loader.ts                  Task 13
│   │   └── search.ts                  Task 14
│   ├── state/
│   │   ├── sessionStore.ts            Task 15 (Zustand store)
│   │   ├── cardOps.ts                 Task 16 (pure reducers)
│   │   └── persistence.ts             Task 17 (localStorage + JSON I/O)
│   ├── canvas/
│   │   ├── Canvas.tsx                 Task 18
│   │   ├── SectionCard.tsx            Task 19
│   │   ├── InlineMarkup.tsx           Task 19 (renders body, wires click handlers)
│   │   ├── DefinitionCard.tsx         Task 20
│   │   ├── PickerCard.tsx             Task 21
│   │   ├── cardSpawning.ts            Task 22 (ref/term click → new card + edge)
│   │   ├── expandAll.ts               Task 23
│   │   └── manualEdges.ts             Task 24
│   ├── ui/
│   │   ├── TopBar.tsx                 Task 25
│   │   ├── SearchBox.tsx              Task 25
│   │   ├── SessionControls.tsx        Task 26
│   │   └── HistorySidebar.tsx         Task 27
│   └── styles/
│       └── index.css                  Task 3 (Tailwind entry)
└── tests/
    ├── build-data/
    │   ├── fixtures/
    │   │   ├── minimal.xml            Task 4
    │   │   ├── title-scoped-terms.xml Task 7
    │   │   ├── chapter-scoped-terms.xml Task 8
    │   │   └── ambiguous-terms.xml    Task 9
    │   ├── parseXml.test.ts           Task 4
    │   ├── extractSections.test.ts    Task 5
    │   ├── resolveRef.test.ts         Task 6
    │   ├── extractTerms.test.ts       Tasks 7–9
    │   └── buildSearchIndex.test.ts   Task 10
    ├── data/
    │   └── search.test.ts             Task 14
    ├── state/
    │   ├── cardOps.test.ts            Task 16
    │   └── persistence.test.ts        Task 17
    └── e2e/
        └── canvas-smoke.spec.ts       Task 28
```

Generated `public/data/` is git-ignored; `npm run build:data` regenerates it.

---

## Task 1: Vite + React + TypeScript scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore`, `index.html`

- [ ] **Step 1: Initialize git and npm**

```bash
cd /Users/fordon.4/Projects/bankruptcy-code
git init
npm init -y
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install react@^18.3.0 react-dom@^18.3.0 @xyflow/react@^12.3.0 zustand@^4.5.0 lunr@^2.3.9
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D typescript@^5.4.0 vite@^5.2.0 @vitejs/plugin-react@^4.3.0 \
  @types/react@^18.3.0 @types/react-dom@^18.3.0 @types/lunr@^2.3.0 @types/node@^20.0.0 \
  fast-xml-parser@^4.3.0 vitest@^1.6.0 @testing-library/react@^16.0.0 \
  @testing-library/jest-dom@^6.4.0 jsdom@^24.0.0 tsx@^4.7.0
```

- [ ] **Step 4: Write `tsconfig.json`** (single config for src, tests, scripts, and root configs — `"noEmit": true` so `tsc` only type-checks; Vite and `tsx` handle actual compilation.)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["node"],
    "paths": { "@/*": ["src/*"] },
    "baseUrl": "."
  },
  "include": ["src", "tests", "scripts", "vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 5: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  base: './',
});
```

- [ ] **Step 6: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

- [ ] **Step 7: Write `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 8: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bankruptcy Canvas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Write `.gitignore`**

```
node_modules
dist
public/data
.DS_Store
*.log
playwright-report
test-results
.vite
```

- [ ] **Step 10: Wire npm scripts in `package.json`**

Replace the `"scripts"` block with:

```json
"scripts": {
  "dev": "vite",
  "build": "npm run build:data && tsc --noEmit && vite build",
  "build:data": "tsx scripts/build-data/index.ts",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src scripts tests --ext .ts,.tsx"
}
```

Also add `"type": "module"` at the top level of `package.json`.

- [ ] **Step 11: Verify tooling boots**

Run: `npm run typecheck`
Expected: exits 0 with no errors (no sources yet, so nothing to check).

Run: `npx vitest run`
Expected: exits 1 with "No test files found" — that's fine; Task 4 adds the first test.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json \
  vite.config.ts vitest.config.ts index.html .gitignore tests/setup.ts
git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

## Task 2: Tailwind + ESLint

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.cjs`

- [ ] **Step 1: Install Tailwind and ESLint**

```bash
npm install -D tailwindcss@^3.4.0 postcss@^8.4.0 autoprefixer@^10.4.0 \
  eslint@^8.57.0 @typescript-eslint/parser@^7.0.0 @typescript-eslint/eslint-plugin@^7.0.0 \
  eslint-plugin-react@^7.34.0 eslint-plugin-react-hooks@^4.6.0
```

- [ ] **Step 2: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        refLink: '#1d4ed8',     // solid underline color for <ref>
        termLink: '#b45309',    // dashed underline color for defined terms
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Write `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Write `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: { react: { version: '18' } },
  rules: { 'react/react-in-jsx-scope': 'off' },
};
```

- [ ] **Step 5: Verify**

Run: `npx eslint --version` → prints 8.x.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts postcss.config.js .eslintrc.cjs package.json package-lock.json
git commit -m "chore: add Tailwind and ESLint configuration"
```

---

## Task 3: Minimal React shell with Tailwind

**Files:**
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles/index.css`

- [ ] **Step 1: Write `src/styles/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; margin: 0; }
```

- [ ] **Step 2: Write `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Write placeholder `src/App.tsx`**

```tsx
export default function App() {
  return (
    <div className="h-full flex items-center justify-center text-lg">
      Bankruptcy Canvas — scaffold OK
    </div>
  );
}
```

- [ ] **Step 4: Boot dev server manually to verify**

Run: `npm run dev`
Open `http://localhost:5173`. Expect "Bankruptcy Canvas — scaffold OK" rendered in Tailwind's default font. Kill the server.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: minimal React + Tailwind shell"
```

---

## Task 4: XML parsing foundation + fixture

**Files:**
- Create: `scripts/build-data/parseXml.ts`, `tests/build-data/fixtures/minimal.xml`, `tests/build-data/parseXml.test.ts`

- [ ] **Step 1: Write the fixture `tests/build-data/fixtures/minimal.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<uscDoc xmlns="http://xml.house.gov/schemas/uslm/1.0" identifier="/us/usc/t11">
  <main>
    <title identifier="/us/usc/t11"><num value="11">Title 11—</num><heading>BANKRUPTCY</heading>
      <chapter identifier="/us/usc/t11/ch1"><num value="1">CHAPTER 1—</num><heading>General</heading>
        <section identifier="/us/usc/t11/s101"><num value="101">§ 101.</num><heading>Definitions</heading>
          <chapeau>In this title the following definitions shall apply:</chapeau>
          <paragraph identifier="/us/usc/t11/s101/1"><num value="1">(1)</num><content>The term "claim" means right to payment.</content></paragraph>
        </section>
      </chapter>
      <chapter identifier="/us/usc/t11/ch5"><num value="5">CHAPTER 5—</num><heading>Creditors</heading>
        <section identifier="/us/usc/t11/s546"><num value="546">§ 546.</num><heading>Limitations</heading>
          <subsection identifier="/us/usc/t11/s546/a"><num value="a">(a)</num><content>An action under <ref href="/us/usc/t11/s547">section 547</ref> may be commenced.</content></subsection>
        </section>
      </chapter>
    </title>
  </main>
</uscDoc>
```

- [ ] **Step 2: Write the failing test `tests/build-data/parseXml.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUscXml } from '../../scripts/build-data/parseXml';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('parseUscXml', () => {
  it('returns a tree with uscDoc -> main -> title', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    expect(tree.uscDoc.main.title['@_identifier']).toBe('/us/usc/t11');
  });

  it('preserves <ref href> attributes inside content', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    const ch5 = tree.uscDoc.main.title.chapter.find(
      (c: any) => c['@_identifier'] === '/us/usc/t11/ch5',
    );
    const content = JSON.stringify(ch5.section);
    expect(content).toContain('/us/usc/t11/s547');
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

Run: `npm test -- parseXml`
Expected: FAIL — `parseUscXml` is not a function / module not found.

- [ ] **Step 4: Implement `scripts/build-data/parseXml.ts`**

```ts
import { XMLParser } from 'fast-xml-parser';

// fast-xml-parser options tuned for USLM:
// - preserveOrder: false keeps hierarchy simple; we read structurally.
// - attributeNamePrefix '@_' is the library default.
// - isArray forces repeated elements to always be arrays for deterministic shape.
const REPEATING = new Set([
  'chapter', 'subchapter', 'section', 'subsection', 'paragraph',
  'subparagraph', 'clause', 'subclause', 'ref', 'note', 'p',
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (tag) => REPEATING.has(tag),
  trimValues: false,
  processEntities: true,
});

export function parseUscXml(xml: string): any {
  return parser.parse(xml);
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm test -- parseXml`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/build-data/parseXml.ts tests/build-data/parseXml.test.ts \
  tests/build-data/fixtures/minimal.xml
git commit -m "feat(build): parse USLM XML into a normalized JS tree"
```

---

## Task 5: Extract per-section structured bodies

**Files:**
- Create: `scripts/build-data/extractSections.ts`, `tests/build-data/extractSections.test.ts`

The output shape — lock this in now, every later task depends on it:

```ts
type SectionNode =
  | { kind: 'text'; value: string }
  | { kind: 'ref'; href: string; value: string }
  | { kind: 'term'; term: string; value: string };  // populated in Task 7+

interface SectionBodyUnit {
  id: string;                  // e.g. '546', '546(a)', '546(a)(1)(A)'
  level: 'section' | 'subsection' | 'paragraph' | 'subparagraph' | 'clause' | 'subclause';
  num: string;                 // '(a)', '(1)', etc. Empty for top-level.
  nodes: SectionNode[];        // inline content as a node array
  children: SectionBodyUnit[]; // nested units
}

interface Section {
  sectionNumber: string;       // '546'
  chapter: string;             // '5'
  heading: string;             // 'Limitations on avoiding powers'
  body: SectionBodyUnit;       // root unit (level: 'section')
}
```

- [ ] **Step 1: Write the failing test `tests/build-data/extractSections.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUscXml } from '../../scripts/build-data/parseXml';
import { extractSections } from '../../scripts/build-data/extractSections';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('extractSections', () => {
  it('yields one Section per <section>', () => {
    const sections = extractSections(parseUscXml(fixture('minimal.xml')));
    expect(sections.map((s) => s.sectionNumber).sort()).toEqual(['101', '546']);
  });

  it('captures chapter and heading', () => {
    const sections = extractSections(parseUscXml(fixture('minimal.xml')));
    const s546 = sections.find((s) => s.sectionNumber === '546')!;
    expect(s546.chapter).toBe('5');
    expect(s546.heading).toBe('Limitations');
  });

  it('preserves subsection hierarchy and inline refs', () => {
    const sections = extractSections(parseUscXml(fixture('minimal.xml')));
    const s546 = sections.find((s) => s.sectionNumber === '546')!;
    const subA = s546.body.children[0];
    expect(subA.level).toBe('subsection');
    expect(subA.num).toBe('(a)');
    const refNode = subA.nodes.find((n) => n.kind === 'ref');
    expect(refNode).toEqual({
      kind: 'ref',
      href: '/us/usc/t11/s547',
      value: 'section 547',
    });
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- extractSections`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/build-data/extractSections.ts`**

```ts
export type SectionNode =
  | { kind: 'text'; value: string }
  | { kind: 'ref'; href: string; value: string }
  | { kind: 'term'; term: string; value: string };

export interface SectionBodyUnit {
  id: string;
  level: 'section' | 'subsection' | 'paragraph' | 'subparagraph' | 'clause' | 'subclause';
  num: string;
  nodes: SectionNode[];
  children: SectionBodyUnit[];
}

export interface Section {
  sectionNumber: string;
  chapter: string;
  heading: string;
  body: SectionBodyUnit;
}

const CHILD_LEVELS: Record<string, SectionBodyUnit['level'] | undefined> = {
  subsection: 'subsection',
  paragraph: 'paragraph',
  subparagraph: 'subparagraph',
  clause: 'clause',
  subclause: 'subclause',
};

function textOf(x: unknown): string {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return x.map(textOf).join('');
  if (typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return textOf(o['#text']) + Object.entries(o)
      .filter(([k]) => k !== '#text' && !k.startsWith('@_'))
      .map(([, v]) => textOf(v))
      .join('');
  }
  return String(x);
}

function inlineNodesOf(x: unknown): SectionNode[] {
  const out: SectionNode[] = [];
  const walk = (node: unknown): void => {
    if (node == null) return;
    if (typeof node === 'string') {
      if (node) out.push({ kind: 'text', value: node });
      return;
    }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node === 'object') {
      const o = node as Record<string, unknown>;
      // fast-xml-parser puts attributes and children under the same object.
      for (const [k, v] of Object.entries(o)) {
        if (k.startsWith('@_')) continue;
        if (k === '#text') { if (v) out.push({ kind: 'text', value: String(v) }); continue; }
        if (k === 'ref') {
          const refs = Array.isArray(v) ? v : [v];
          for (const r of refs) {
            const ro = r as Record<string, unknown>;
            out.push({ kind: 'ref', href: String(ro['@_href'] ?? ''), value: textOf(ro) });
          }
          continue;
        }
        // Any other nested tag: recurse for inline text (skip block-level siblings — handled by children).
        if (CHILD_LEVELS[k]) continue;
        walk(v);
      }
    }
  };
  walk(x);
  return out;
}

function numberToIdSuffix(level: SectionBodyUnit['level'], num: string): string {
  const stripped = num.replace(/[()]/g, '');
  if (!stripped) return '';
  return `(${stripped})`;
}

function buildUnit(
  node: Record<string, unknown>,
  level: SectionBodyUnit['level'],
  parentId: string,
): SectionBodyUnit {
  const numRaw = (node.num as any)?.['@_value'] ?? '';
  const num = numRaw ? `(${String(numRaw)})` : '';
  const id = `${parentId}${numberToIdSuffix(level, num)}`;

  // Inline content can live in `content`, `chapeau`, or loose `#text`.
  const inlineSources: unknown[] = [node.chapeau, node.content, node['#text']];
  const nodes: SectionNode[] = [];
  for (const s of inlineSources) nodes.push(...inlineNodesOf(s));

  const children: SectionBodyUnit[] = [];
  for (const [tag, childLevel] of Object.entries(CHILD_LEVELS)) {
    const raw = node[tag];
    if (!raw) continue;
    const arr = Array.isArray(raw) ? raw : [raw];
    for (const c of arr) children.push(buildUnit(c as Record<string, unknown>, childLevel!, id));
  }

  return { id, level, num, nodes, children };
}

export function extractSections(tree: any): Section[] {
  const title = tree.uscDoc.main.title;
  const chapters = Array.isArray(title.chapter) ? title.chapter : [title.chapter];
  const sections: Section[] = [];
  for (const ch of chapters) {
    const chapterNum = String(ch.num?.['@_value'] ?? '');
    const secArr = Array.isArray(ch.section) ? ch.section : ch.section ? [ch.section] : [];
    for (const sec of secArr) {
      const sectionNumber = String(sec.num?.['@_value'] ?? '');
      const heading = textOf(sec.heading).trim();
      const body = buildUnit(sec, 'section', sectionNumber);
      sections.push({ sectionNumber, chapter: chapterNum, heading, body });
    }
    // Subchapters: flatten (v1 treats them as chapter-scoped).
    const subArr = Array.isArray(ch.subchapter) ? ch.subchapter : ch.subchapter ? [ch.subchapter] : [];
    for (const sub of subArr) {
      const secArr2 = Array.isArray(sub.section) ? sub.section : sub.section ? [sub.section] : [];
      for (const sec of secArr2) {
        const sectionNumber = String(sec.num?.['@_value'] ?? '');
        const heading = textOf(sec.heading).trim();
        const body = buildUnit(sec, 'section', sectionNumber);
        sections.push({ sectionNumber, chapter: chapterNum, heading, body });
      }
    }
  }
  return sections;
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- extractSections`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-data/extractSections.ts tests/build-data/extractSections.test.ts
git commit -m "feat(build): extract per-section bodies with inline refs"
```

---

## Task 6: Resolve `<ref href>` values to structured targets

**Files:**
- Create: `scripts/build-data/resolveRef.ts`, `tests/build-data/resolveRef.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveRef } from '../../scripts/build-data/resolveRef';

describe('resolveRef', () => {
  it('parses a bare section href', () => {
    expect(resolveRef('/us/usc/t11/s547')).toEqual({
      kind: 'internal', section: '547',
    });
  });

  it('parses a subsection href', () => {
    expect(resolveRef('/us/usc/t11/s546/a/1/A')).toEqual({
      kind: 'internal', section: '546', subsection: 'a', paragraph: '1', subparagraph: 'A',
    });
  });

  it('marks non-Title-11 href as external', () => {
    expect(resolveRef('/us/usc/t26/s1234')).toEqual({ kind: 'external', href: '/us/usc/t26/s1234' });
  });

  it('marks malformed href as external', () => {
    expect(resolveRef('/us/pl/95/598')).toEqual({ kind: 'external', href: '/us/pl/95/598' });
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- resolveRef`
Expected: FAIL.

- [ ] **Step 3: Implement `scripts/build-data/resolveRef.ts`**

```ts
export type ResolvedRef =
  | {
      kind: 'internal';
      section: string;
      subsection?: string;
      paragraph?: string;
      subparagraph?: string;
      clause?: string;
      subclause?: string;
    }
  | { kind: 'external'; href: string };

const LEVELS = ['section', 'subsection', 'paragraph', 'subparagraph', 'clause', 'subclause'] as const;

export function resolveRef(href: string): ResolvedRef {
  // Expected: /us/usc/t11/s<NUM>[/<sub>/<para>/<subpara>/<clause>/<subclause>]
  const m = href.match(/^\/us\/usc\/t11\/s([0-9A-Za-z-]+)((?:\/[^\/]+)*)$/);
  if (!m) return { kind: 'external', href };
  const out: ResolvedRef = { kind: 'internal', section: m[1] };
  const rest = m[2].split('/').filter(Boolean);
  for (let i = 0; i < rest.length && i < LEVELS.length - 1; i++) {
    (out as any)[LEVELS[i + 1]] = rest[i];
  }
  return out;
}
```

- [ ] **Step 4: Run the test**

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-data/resolveRef.ts tests/build-data/resolveRef.test.ts
git commit -m "feat(build): resolve USLM ref hrefs to structured targets"
```

---

## Task 7: Extract defined terms — title-scoped (§ 101 pattern)

**Files:**
- Create: `scripts/build-data/extractTerms.ts`, `tests/build-data/fixtures/title-scoped-terms.xml`, `tests/build-data/extractTerms.test.ts`

- [ ] **Step 1: Write the fixture `tests/build-data/fixtures/title-scoped-terms.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<uscDoc xmlns="http://xml.house.gov/schemas/uslm/1.0" identifier="/us/usc/t11">
  <main>
    <title identifier="/us/usc/t11"><num value="11">Title 11—</num><heading>BANKRUPTCY</heading>
      <chapter identifier="/us/usc/t11/ch1"><num value="1">CHAPTER 1—</num><heading>General</heading>
        <section identifier="/us/usc/t11/s101"><num value="101">§ 101.</num><heading>Definitions</heading>
          <chapeau>In this title the following definitions shall apply:</chapeau>
          <paragraph identifier="/us/usc/t11/s101/5"><num value="5">(5)</num><content>The term "claim" means right to payment.</content></paragraph>
          <paragraph identifier="/us/usc/t11/s101/10"><num value="10">(10)</num><content>"creditor" means entity that has a claim.</content></paragraph>
        </section>
      </chapter>
    </title>
  </main>
</uscDoc>
```

- [ ] **Step 2: Write the failing test `tests/build-data/extractTerms.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUscXml } from '../../scripts/build-data/parseXml';
import { extractTerms } from '../../scripts/build-data/extractTerms';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('extractTerms — title-scoped', () => {
  it('extracts "The term X means Y" with title scope', () => {
    const terms = extractTerms(parseUscXml(fixture('title-scoped-terms.xml')));
    expect(terms.claim).toEqual({
      candidates: [{ section: '101', subsection: '(5)', scope: 'title', definition: 'right to payment.' }],
    });
  });

  it('also extracts bare-quote form "X" means Y', () => {
    const terms = extractTerms(parseUscXml(fixture('title-scoped-terms.xml')));
    expect(terms.creditor.candidates[0].section).toBe('101');
    expect(terms.creditor.candidates[0].scope).toBe('title');
  });

  it('normalizes curly quotes to straight quotes before matching', () => {
    const xml = fixture('title-scoped-terms.xml').replace(/"/g, '\u201c').replace(/"/g, '\u201d');
    const terms = extractTerms(parseUscXml(xml));
    expect(terms.claim).toBeDefined();
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

Run: `npm test -- extractTerms`
Expected: FAIL.

- [ ] **Step 4: Implement `scripts/build-data/extractTerms.ts`**

```ts
export interface TermCandidate {
  section: string;
  subsection: string;       // '(5)', '(8)', etc.
  scope: 'title' | `chapter:${string}`;
  definition: string;
}

export interface TermEntry {
  candidates: TermCandidate[];  // length > 1 = ambiguous
}

export type TermMap = Record<string, TermEntry>;

const TITLE_SCOPE_RE = /\bin\s+this\s+title\b/i;
const CHAPTER_SCOPE_RE = /\bin\s+this\s+(?:chapter|subchapter)\b/i;

// Match: `The term "X" means Y` or `"X" means Y` (with straight quotes after normalization).
const TERM_RE = /(?:The\s+term\s+)?"([^"]+)"\s+(?:means|includes)\s+([\s\S]+?)(?:;|$)/i;

function normalizeQuotes(s: string): string {
  return s.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'");
}

function textOf(x: unknown): string {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return x.map(textOf).join('');
  if (typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return textOf(o['#text']) + Object.entries(o)
      .filter(([k]) => k !== '#text' && !k.startsWith('@_'))
      .map(([, v]) => textOf(v))
      .join('');
  }
  return String(x);
}

function scopeFromChapeau(chapeau: string): TermCandidate['scope'] | null {
  const norm = normalizeQuotes(chapeau);
  if (TITLE_SCOPE_RE.test(norm)) return 'title';
  if (CHAPTER_SCOPE_RE.test(norm)) return null;  // needs chapter — caller fills in
  return null;
}

function iterParagraphs(sec: any): Array<{ num: string; text: string }> {
  const out: Array<{ num: string; text: string }> = [];
  const walk = (node: any) => {
    const paras = Array.isArray(node.paragraph) ? node.paragraph : node.paragraph ? [node.paragraph] : [];
    for (const p of paras) {
      const num = `(${p.num?.['@_value'] ?? ''})`;
      out.push({ num, text: normalizeQuotes(textOf(p.content ?? p.chapeau ?? p['#text'])) });
    }
    const subs = Array.isArray(node.subsection) ? node.subsection : node.subsection ? [node.subsection] : [];
    for (const s of subs) walk(s);
  };
  walk(sec);
  return out;
}

export function extractTerms(tree: any): TermMap {
  const terms: TermMap = {};
  const title = tree.uscDoc.main.title;
  const chapters = Array.isArray(title.chapter) ? title.chapter : [title.chapter];

  for (const ch of chapters) {
    const chapterNum = String(ch.num?.['@_value'] ?? '');
    const secArr = Array.isArray(ch.section) ? ch.section : ch.section ? [ch.section] : [];
    const subchapterArr = Array.isArray(ch.subchapter) ? ch.subchapter : ch.subchapter ? [ch.subchapter] : [];
    const allSections = [...secArr];
    for (const sub of subchapterArr) {
      const s2 = Array.isArray(sub.section) ? sub.section : sub.section ? [sub.section] : [];
      allSections.push(...s2);
    }

    for (const sec of allSections) {
      const sectionNumber = String(sec.num?.['@_value'] ?? '');
      const heading = textOf(sec.heading).trim();
      if (!/definition/i.test(heading)) continue;

      const chapeauText = normalizeQuotes(textOf(sec.chapeau));
      const titleScoped = TITLE_SCOPE_RE.test(chapeauText);
      const chapterScoped = CHAPTER_SCOPE_RE.test(chapeauText);
      if (!titleScoped && !chapterScoped) continue;
      const scope: TermCandidate['scope'] = titleScoped ? 'title' : `chapter:${chapterNum}`;

      for (const { num, text } of iterParagraphs(sec)) {
        const m = text.match(TERM_RE);
        if (!m) continue;
        const term = m[1].trim().toLowerCase();
        const definition = m[2].trim();
        const entry = terms[term] ?? { candidates: [] };
        entry.candidates.push({ section: sectionNumber, subsection: num, scope, definition });
        terms[term] = entry;
      }
    }
  }

  return terms;
}
```

- [ ] **Step 5: Run the test**

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/build-data/extractTerms.ts tests/build-data/extractTerms.test.ts \
  tests/build-data/fixtures/title-scoped-terms.xml
git commit -m "feat(build): extract title-scoped defined terms"
```

---

## Task 8: Extract defined terms — chapter-scoped (§ 741 pattern)

**Files:**
- Modify: `scripts/build-data/extractTerms.ts` (no code change expected — verify coverage)
- Create: `tests/build-data/fixtures/chapter-scoped-terms.xml`
- Modify: `tests/build-data/extractTerms.test.ts`

The extractor already handles `chapter:N` scope (see Task 7 code). This task is a verification task — it adds a fixture that exercises the chapter path and tightens the test suite.

- [ ] **Step 1: Write fixture `tests/build-data/fixtures/chapter-scoped-terms.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<uscDoc xmlns="http://xml.house.gov/schemas/uslm/1.0" identifier="/us/usc/t11">
  <main>
    <title identifier="/us/usc/t11"><num value="11">Title 11—</num><heading>BANKRUPTCY</heading>
      <chapter identifier="/us/usc/t11/ch7"><num value="7">CHAPTER 7—</num><heading>Liquidation</heading>
        <subchapter identifier="/us/usc/t11/ch7/schIII"><num value="III">SUBCHAPTER III—</num><heading>Stockbroker Liquidation</heading>
          <section identifier="/us/usc/t11/s741"><num value="741">§ 741.</num><heading>Definitions for this subchapter</heading>
            <chapeau>In this subchapter—</chapeau>
            <paragraph identifier="/us/usc/t11/s741/8"><num value="8">(8)</num><content>"settlement payment" means a preliminary settlement payment.</content></paragraph>
          </section>
        </subchapter>
      </chapter>
    </title>
  </main>
</uscDoc>
```

- [ ] **Step 2: Append tests to `tests/build-data/extractTerms.test.ts`**

```ts
describe('extractTerms — chapter-scoped', () => {
  it('assigns chapter:N scope when chapeau says "In this subchapter"', () => {
    const terms = extractTerms(parseUscXml(fixture('chapter-scoped-terms.xml')));
    expect(terms['settlement payment'].candidates[0]).toEqual({
      section: '741',
      subsection: '(8)',
      scope: 'chapter:7',
      definition: 'a preliminary settlement payment.',
    });
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npm test -- extractTerms`
Expected: PASS (4 tests total).

- [ ] **Step 4: Commit**

```bash
git add tests/build-data/extractTerms.test.ts tests/build-data/fixtures/chapter-scoped-terms.xml
git commit -m "test(build): cover chapter-scoped defined-term extraction"
```

---

## Task 9: Ambiguous defined terms (multi-candidate)

**Files:**
- Create: `tests/build-data/fixtures/ambiguous-terms.xml`
- Modify: `tests/build-data/extractTerms.test.ts`

The existing extractor already pushes each match into `candidates`. Confirm multiple definitions of the same term stack correctly — this is what the UI will render as a PickerCard (Task 21).

- [ ] **Step 1: Write fixture `tests/build-data/fixtures/ambiguous-terms.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<uscDoc xmlns="http://xml.house.gov/schemas/uslm/1.0" identifier="/us/usc/t11">
  <main>
    <title identifier="/us/usc/t11"><num value="11">Title 11—</num><heading>BANKRUPTCY</heading>
      <chapter identifier="/us/usc/t11/ch1"><num value="1">CHAPTER 1—</num><heading>General</heading>
        <section identifier="/us/usc/t11/s101"><num value="101">§ 101.</num><heading>Definitions</heading>
          <chapeau>In this title the following definitions shall apply:</chapeau>
          <paragraph identifier="/us/usc/t11/s101/41"><num value="41">(41)</num><content>The term "person" means individual, partnership, and corporation.</content></paragraph>
        </section>
      </chapter>
      <chapter identifier="/us/usc/t11/ch7"><num value="7">CHAPTER 7—</num><heading>Liquidation</heading>
        <subchapter><num value="IV">SUBCHAPTER IV—</num><heading>Commodity Broker</heading>
          <section identifier="/us/usc/t11/s761"><num value="761">§ 761.</num><heading>Definitions</heading>
            <chapeau>In this subchapter—</chapeau>
            <paragraph identifier="/us/usc/t11/s761/12"><num value="12">(12)</num><content>"person" means natural person only.</content></paragraph>
          </section>
        </subchapter>
      </chapter>
    </title>
  </main>
</uscDoc>
```

- [ ] **Step 2: Append test**

```ts
describe('extractTerms — ambiguity', () => {
  it('returns all candidates for terms defined in multiple scopes', () => {
    const terms = extractTerms(parseUscXml(fixture('ambiguous-terms.xml')));
    const scopes = terms.person.candidates.map((c) => c.scope).sort();
    expect(scopes).toEqual(['chapter:7', 'title']);
    expect(terms.person.candidates).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npm test -- extractTerms`
Expected: PASS (5 tests total).

- [ ] **Step 4: Commit**

```bash
git add tests/build-data/extractTerms.test.ts tests/build-data/fixtures/ambiguous-terms.xml
git commit -m "test(build): cover ambiguous multi-scope defined terms"
```

---

## Task 10: Build Lunr search index + section lookup

**Files:**
- Create: `scripts/build-data/buildSearchIndex.ts`, `tests/build-data/buildSearchIndex.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import lunr from 'lunr';
import { buildSearchIndex } from '../../scripts/build-data/buildSearchIndex';
import type { Section } from '../../scripts/build-data/extractSections';

const sec = (n: string, heading: string, bodyText: string): Section => ({
  sectionNumber: n,
  chapter: '5',
  heading,
  body: { id: n, level: 'section', num: '', nodes: [{ kind: 'text', value: bodyText }], children: [] },
});

describe('buildSearchIndex', () => {
  const sections = [
    sec('546', 'Limitations on avoiding powers', 'settlement payment safe harbor'),
    sec('547', 'Preferences', 'transfer of property of the debtor'),
  ];

  it('produces a lookup keyed by section number', () => {
    const { sectionLookup } = buildSearchIndex(sections);
    expect(sectionLookup['546']).toBe('Limitations on avoiding powers');
    expect(sectionLookup['547']).toBe('Preferences');
  });

  it('produces a serialized Lunr index that finds keywords', () => {
    const { lunrIndex } = buildSearchIndex(sections);
    const idx = lunr.Index.load(lunrIndex);
    const hits = idx.search('safe harbor');
    expect(hits[0]?.ref).toBe('546');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- buildSearchIndex`
Expected: FAIL.

- [ ] **Step 3: Implement `scripts/build-data/buildSearchIndex.ts`**

```ts
import lunr from 'lunr';
import type { Section, SectionBodyUnit, SectionNode } from './extractSections';

function unitText(unit: SectionBodyUnit): string {
  const inline = unit.nodes.map((n: SectionNode) => ('value' in n ? n.value : '')).join('');
  const children = unit.children.map(unitText).join(' ');
  return `${inline} ${children}`;
}

export function buildSearchIndex(sections: Section[]): {
  lunrIndex: object;
  sectionLookup: Record<string, string>;
} {
  const sectionLookup: Record<string, string> = {};
  for (const s of sections) sectionLookup[s.sectionNumber] = s.heading;

  const lunrIndex = lunr(function () {
    this.ref('sectionNumber');
    this.field('heading', { boost: 3 });
    this.field('body');
    for (const s of sections) {
      this.add({ sectionNumber: s.sectionNumber, heading: s.heading, body: unitText(s.body) });
    }
  });

  return { lunrIndex: lunrIndex.toJSON(), sectionLookup };
}
```

- [ ] **Step 4: Run the test**

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-data/buildSearchIndex.ts tests/build-data/buildSearchIndex.test.ts
git commit -m "feat(build): build Lunr index and section-number lookup"
```

---

## Task 11: Emit artifacts + end-to-end pipeline script

**Files:**
- Create: `scripts/build-data/emit.ts`, `scripts/build-data/index.ts`

- [ ] **Step 1: Write `scripts/build-data/emit.ts`**

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Section } from './extractSections';
import type { TermMap } from './extractTerms';

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
}

export function emitArtifacts(
  outDir: string,
  sections: Section[],
  terms: TermMap,
  lunrIndex: object,
  sectionLookup: Record<string, string>,
): void {
  for (const s of sections) {
    writeJson(join(outDir, 'sections', `s${s.sectionNumber}.json`), s);
  }
  writeJson(join(outDir, 'terms.json'), terms);
  writeJson(join(outDir, 'search-index.json'), lunrIndex);
  writeJson(join(outDir, 'section-lookup.json'), sectionLookup);
}
```

- [ ] **Step 2: Write `scripts/build-data/index.ts`**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUscXml } from './parseXml';
import { extractSections } from './extractSections';
import { extractTerms } from './extractTerms';
import { buildSearchIndex } from './buildSearchIndex';
import { emitArtifacts } from './emit';

const ROOT = process.cwd();
const INPUT = join(ROOT, 'usc11.xml');
const OUT = join(ROOT, 'public', 'data');

function main(): void {
  console.log(`Reading ${INPUT}`);
  const xml = readFileSync(INPUT, 'utf8');
  const tree = parseUscXml(xml);

  const sections = extractSections(tree);
  console.log(`Extracted ${sections.length} sections`);

  const terms = extractTerms(tree);
  console.log(`Extracted ${Object.keys(terms).length} defined terms`);

  const { lunrIndex, sectionLookup } = buildSearchIndex(sections);
  console.log(`Built Lunr index; section-lookup keys: ${Object.keys(sectionLookup).length}`);

  emitArtifacts(OUT, sections, terms, lunrIndex, sectionLookup);
  console.log(`Wrote artifacts to ${OUT}`);
}

main();
```

- [ ] **Step 3: Run the pipeline against the real corpus**

Run: `npm run build:data`
Expected: logs showing section count >300, term count >100. Verify files exist:

```bash
ls public/data/sections/s101.json public/data/terms.json public/data/search-index.json public/data/section-lookup.json
```

- [ ] **Step 4: Spot-check § 546**

Run:
```bash
node -e "const s=require('./public/data/sections/s546.json'); console.log(s.heading, '|', s.chapter)"
```
Expected: `Limitations on avoiding powers | 5`.

Run:
```bash
node -e "const t=require('./public/data/terms.json'); console.log(JSON.stringify(t['settlement payment'], null, 2))"
```
Expected: at least one candidate with `section: '741'`, `scope: 'chapter:7'`.

If either check fails, investigate — do not move to the next task.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-data/emit.ts scripts/build-data/index.ts
git commit -m "feat(build): end-to-end pipeline emits JSON artifacts"
```

---

## Task 12: Shared TypeScript types for the runtime

**Files:**
- Create: `src/types/section.ts`, `src/types/term.ts`, `src/types/session.ts`

Types mirror the build-time output shapes. Duplicate the types (don't share across the build/runtime boundary — the runtime should consume pure JSON).

- [ ] **Step 1: Write `src/types/section.ts`**

```ts
export type SectionNode =
  | { kind: 'text'; value: string }
  | { kind: 'ref'; href: string; value: string }
  | { kind: 'term'; term: string; value: string };

export interface SectionBodyUnit {
  id: string;
  level: 'section' | 'subsection' | 'paragraph' | 'subparagraph' | 'clause' | 'subclause';
  num: string;
  nodes: SectionNode[];
  children: SectionBodyUnit[];
}

export interface Section {
  sectionNumber: string;
  chapter: string;
  heading: string;
  body: SectionBodyUnit;
}
```

- [ ] **Step 2: Write `src/types/term.ts`**

```ts
export interface TermCandidate {
  section: string;
  subsection: string;
  scope: 'title' | `chapter:${string}`;
  definition: string;
}

export interface TermEntry { candidates: TermCandidate[]; }

export type TermMap = Record<string, TermEntry>;
```

- [ ] **Step 3: Write `src/types/session.ts`**

```ts
export type CardKind = 'section' | 'definition' | 'picker';

export interface CardBase {
  id: string;                    // uuid
  kind: CardKind;
  x: number;
  y: number;
  pinned: boolean;
  collapsed: boolean;
  hideDefinitions: boolean;      // per-card toggle
}

export interface SectionCard extends CardBase {
  kind: 'section';
  sectionNumber: string;
}

export interface DefinitionCard extends CardBase {
  kind: 'definition';
  term: string;                  // lowercased
  candidateIndex: number;        // which candidate in TermMap was chosen
}

export interface PickerCard extends CardBase {
  kind: 'picker';
  term: string;
}

export type Card = SectionCard | DefinitionCard | PickerCard;

export interface Edge {
  id: string;
  source: string;                // card id
  target: string;                // card id
  kind: 'auto' | 'manual';
  label?: string;
}

export interface HistoryItem {
  cardId: string;
  openedAt: number;              // epoch ms
}

export interface Session {
  version: 1;
  cards: Card[];
  edges: Edge[];
  history: HistoryItem[];
  viewport: { x: number; y: number; zoom: number };
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/types/
git commit -m "feat(types): section, term, and session type definitions"
```

---

## Task 13: Runtime data loader

**Files:**
- Create: `src/data/loader.ts`

- [ ] **Step 1: Write `src/data/loader.ts`**

```ts
import type { Section } from '@/types/section';
import type { TermMap } from '@/types/term';

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data`;

const sectionCache = new Map<string, Promise<Section>>();
let termsPromise: Promise<TermMap> | null = null;
let sectionLookupPromise: Promise<Record<string, string>> | null = null;
let searchIndexPromise: Promise<object> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function loadSection(sectionNumber: string): Promise<Section> {
  const existing = sectionCache.get(sectionNumber);
  if (existing) return existing;
  const p = fetchJson<Section>(`${BASE}/sections/s${sectionNumber}.json`);
  sectionCache.set(sectionNumber, p);
  return p;
}

export function loadTerms(): Promise<TermMap> {
  termsPromise ??= fetchJson<TermMap>(`${BASE}/terms.json`);
  return termsPromise;
}

export function loadSectionLookup(): Promise<Record<string, string>> {
  sectionLookupPromise ??= fetchJson<Record<string, string>>(`${BASE}/section-lookup.json`);
  return sectionLookupPromise;
}

export function loadSearchIndex(): Promise<object> {
  searchIndexPromise ??= fetchJson<object>(`${BASE}/search-index.json`);
  return searchIndexPromise;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/data/loader.ts
git commit -m "feat(data): client-side artifact loader with caching"
```

---

## Task 14: Search module (section-number + Lunr)

**Files:**
- Create: `src/data/search.ts`, `tests/data/search.test.ts`

- [ ] **Step 1: Write the failing test `tests/data/search.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import lunr from 'lunr';
import { resolveQuery } from '../../src/data/search';

const sectionLookup = { '546': 'Limitations on avoiding powers', '547': 'Preferences' };

const lunrJson = lunr(function () {
  this.ref('sectionNumber');
  this.field('heading');
  this.field('body');
  this.add({ sectionNumber: '546', heading: 'Limitations on avoiding powers', body: 'settlement payment safe harbor' });
  this.add({ sectionNumber: '547', heading: 'Preferences', body: 'transfer of property' });
}).toJSON();

const index = lunr.Index.load(lunrJson);

describe('resolveQuery', () => {
  it('returns an exact section hit for "546(e)"', () => {
    const results = resolveQuery('546(e)', { sectionLookup, index });
    expect(results[0]).toEqual({ kind: 'section', sectionNumber: '546', heading: 'Limitations on avoiding powers' });
  });

  it('returns an exact section hit for "546"', () => {
    const results = resolveQuery('546', { sectionLookup, index });
    expect(results[0]).toEqual({ kind: 'section', sectionNumber: '546', heading: 'Limitations on avoiding powers' });
  });

  it('falls back to Lunr for keyword queries', () => {
    const results = resolveQuery('safe harbor', { sectionLookup, index });
    expect(results[0].kind).toBe('keyword');
    expect(results[0].sectionNumber).toBe('546');
  });

  it('returns an empty array for unknown keywords', () => {
    const results = resolveQuery('xyznomatch', { sectionLookup, index });
    expect(results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- search`
Expected: FAIL.

- [ ] **Step 3: Implement `src/data/search.ts`**

```ts
import lunr from 'lunr';

export type SearchResult =
  | { kind: 'section'; sectionNumber: string; heading: string }
  | { kind: 'keyword'; sectionNumber: string; heading: string; score: number };

export interface SearchDeps {
  sectionLookup: Record<string, string>;
  index: lunr.Index;
}

const SECTION_NUMBER_RE = /^\s*(\d{1,4})(?:\([a-z0-9]+\))*\s*$/i;

export function resolveQuery(q: string, deps: SearchDeps): SearchResult[] {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const m = trimmed.match(SECTION_NUMBER_RE);
  if (m) {
    const num = m[1];
    const heading = deps.sectionLookup[num];
    if (heading) return [{ kind: 'section', sectionNumber: num, heading }];
    return [];
  }
  try {
    const hits = deps.index.search(trimmed);
    return hits
      .map((h) => {
        const heading = deps.sectionLookup[h.ref];
        if (!heading) return null;
        return { kind: 'keyword' as const, sectionNumber: h.ref, heading, score: h.score };
      })
      .filter((x): x is Exclude<typeof x, null> => x !== null);
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run the test**

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/search.ts tests/data/search.test.ts
git commit -m "feat(data): section-number + Lunr keyword search resolver"
```

---

## Task 15: Zustand session store

**Files:**
- Create: `src/state/sessionStore.ts`

- [ ] **Step 1: Write `src/state/sessionStore.ts`**

```ts
import { create } from 'zustand';
import type { Card, Edge, HistoryItem, Session } from '@/types/session';

interface SessionState extends Session {
  setAll: (next: Session) => void;
  setViewport: (v: Session['viewport']) => void;
  setCards: (updater: (cards: Card[]) => Card[]) => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  pushHistory: (item: HistoryItem) => void;
}

const EMPTY: Session = {
  version: 1,
  cards: [],
  edges: [],
  history: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const useSessionStore = create<SessionState>((set) => ({
  ...EMPTY,
  setAll: (next) => set(next),
  setViewport: (viewport) => set({ viewport }),
  setCards: (updater) => set((s) => ({ cards: updater(s.cards) })),
  setEdges: (updater) => set((s) => ({ edges: updater(s.edges) })),
  pushHistory: (item) => set((s) => ({ history: [item, ...s.history] })),
}));

export function snapshotSession(state: SessionState): Session {
  const { version, cards, edges, history, viewport } = state;
  return { version, cards, edges, history, viewport };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/state/sessionStore.ts
git commit -m "feat(state): Zustand session store"
```

---

## Task 16: Pure card/edge/history reducers

**Files:**
- Create: `src/state/cardOps.ts`, `tests/state/cardOps.test.ts`

Reducers are pure functions so they're trivially testable; the store calls them via `setCards` / `setEdges`. This keeps behavior out of React.

- [ ] **Step 1: Write the failing test `tests/state/cardOps.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  addCard, removeCard, togglePin, toggleCollapsed, toggleHideDefinitions,
  moveCard, clearUnpinned, addEdge, removeEdgesForCard,
} from '../../src/state/cardOps';
import type { Card, Edge, SectionCard } from '../../src/types/session';

const makeSection = (id: string, n: string): SectionCard => ({
  id, kind: 'section', sectionNumber: n, x: 0, y: 0,
  pinned: false, collapsed: false, hideDefinitions: false,
});

describe('cardOps', () => {
  it('addCard appends', () => {
    const c = makeSection('a', '546');
    expect(addCard([], c)).toEqual([c]);
  });

  it('removeCard drops by id', () => {
    const a = makeSection('a', '546');
    const b = makeSection('b', '547');
    expect(removeCard([a, b], 'a')).toEqual([b]);
  });

  it('togglePin flips pinned', () => {
    const a = makeSection('a', '546');
    expect(togglePin([a], 'a')[0].pinned).toBe(true);
  });

  it('toggleCollapsed flips collapsed', () => {
    const a = makeSection('a', '546');
    expect(toggleCollapsed([a], 'a')[0].collapsed).toBe(true);
  });

  it('toggleHideDefinitions flips the flag', () => {
    const a = makeSection('a', '546');
    expect(toggleHideDefinitions([a], 'a')[0].hideDefinitions).toBe(true);
  });

  it('moveCard sets x/y', () => {
    const a = makeSection('a', '546');
    const [moved] = moveCard([a], 'a', 100, 200);
    expect(moved).toMatchObject({ x: 100, y: 200 });
  });

  it('clearUnpinned keeps only pinned cards', () => {
    const a = { ...makeSection('a', '546'), pinned: true };
    const b = makeSection('b', '547');
    expect(clearUnpinned([a, b] as Card[])).toEqual([a]);
  });

  it('addEdge appends, removeEdgesForCard removes any edge touching id', () => {
    const e1: Edge = { id: 'e1', source: 'a', target: 'b', kind: 'auto' };
    const e2: Edge = { id: 'e2', source: 'b', target: 'c', kind: 'auto' };
    const with2 = addEdge([e1], e2);
    expect(with2).toHaveLength(2);
    expect(removeEdgesForCard(with2, 'b')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- cardOps`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/state/cardOps.ts`**

```ts
import type { Card, Edge } from '@/types/session';

export function addCard(cards: Card[], card: Card): Card[] {
  if (cards.some((c) => c.id === card.id)) return cards;
  return [...cards, card];
}

export function removeCard(cards: Card[], id: string): Card[] {
  return cards.filter((c) => c.id !== id);
}

function patch(cards: Card[], id: string, patcher: (c: Card) => Card): Card[] {
  return cards.map((c) => (c.id === id ? patcher(c) : c));
}

export function togglePin(cards: Card[], id: string): Card[] {
  return patch(cards, id, (c) => ({ ...c, pinned: !c.pinned }));
}

export function toggleCollapsed(cards: Card[], id: string): Card[] {
  return patch(cards, id, (c) => ({ ...c, collapsed: !c.collapsed }));
}

export function toggleHideDefinitions(cards: Card[], id: string): Card[] {
  return patch(cards, id, (c) => ({ ...c, hideDefinitions: !c.hideDefinitions }));
}

export function moveCard(cards: Card[], id: string, x: number, y: number): Card[] {
  return patch(cards, id, (c) => ({ ...c, x, y }));
}

export function clearUnpinned(cards: Card[]): Card[] {
  return cards.filter((c) => c.pinned);
}

export function addEdge(edges: Edge[], edge: Edge): Edge[] {
  if (edges.some((e) => e.id === edge.id)) return edges;
  return [...edges, edge];
}

export function removeEdgesForCard(edges: Edge[], cardId: string): Edge[] {
  return edges.filter((e) => e.source !== cardId && e.target !== cardId);
}
```

- [ ] **Step 4: Run the test**

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/cardOps.ts tests/state/cardOps.test.ts
git commit -m "feat(state): pure reducers for card and edge operations"
```

---

## Task 17: localStorage autosave + JSON export/import

**Files:**
- Create: `src/state/persistence.ts`, `tests/state/persistence.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SESSION_STORAGE_KEY, loadFromStorage, saveToStorage,
  exportSession, importSession, validateSession,
} from '../../src/state/persistence';
import type { Session } from '../../src/types/session';

const validSession: Session = {
  version: 1, cards: [], edges: [], history: [], viewport: { x: 0, y: 0, zoom: 1 },
};

describe('persistence', () => {
  beforeEach(() => { localStorage.clear(); });

  it('saveToStorage then loadFromStorage round-trips', () => {
    saveToStorage(validSession);
    expect(loadFromStorage()).toEqual(validSession);
  });

  it('loadFromStorage returns null when empty', () => {
    expect(loadFromStorage()).toBeNull();
  });

  it('loadFromStorage returns null when stored JSON is corrupt', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{not json');
    expect(loadFromStorage()).toBeNull();
  });

  it('loadFromStorage returns null when schema does not validate', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: 2 }));
    expect(loadFromStorage()).toBeNull();
  });

  it('exportSession produces a JSON blob URL', () => {
    const url = exportSession(validSession);
    expect(url).toMatch(/^blob:/);
    URL.revokeObjectURL(url);
  });

  it('importSession validates and returns a Session', () => {
    const parsed = importSession(JSON.stringify(validSession));
    expect(parsed).toEqual(validSession);
  });

  it('importSession throws on schema mismatch', () => {
    expect(() => importSession('{"version": 99}')).toThrow(/version/i);
  });

  it('validateSession rejects missing fields', () => {
    expect(validateSession({ version: 1, cards: [] })).toBe(false);
    expect(validateSession(validSession)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- persistence`
Expected: FAIL.

- [ ] **Step 3: Implement `src/state/persistence.ts`**

```ts
import type { Session } from '@/types/session';

export const SESSION_STORAGE_KEY = 'bankruptcy-canvas:session:v1';

export function validateSession(x: unknown): x is Session {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<Session>;
  if (s.version !== 1) return false;
  if (!Array.isArray(s.cards)) return false;
  if (!Array.isArray(s.edges)) return false;
  if (!Array.isArray(s.history)) return false;
  const v = s.viewport;
  if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.zoom !== 'number') return false;
  return true;
}

export function saveToStorage(session: Session): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadFromStorage(): Session | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return validateSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function exportSession(session: Session): string {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  return URL.createObjectURL(blob);
}

export function importSession(jsonText: string): Session {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Session JSON is not valid JSON: ${(e as Error).message}`);
  }
  if (!validateSession(parsed)) {
    throw new Error('Session JSON did not match expected schema (version, cards, edges, history, viewport).');
  }
  return parsed;
}

export function makeDebouncedSaver(delayMs = 500): (s: Session) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (session: Session) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => saveToStorage(session), delayMs);
  };
}
```

- [ ] **Step 4: Run the test**

Expected: PASS (8 tests).

- [ ] **Step 5: Wire the debounced saver in `src/main.tsx`**

Append to `src/main.tsx` (after the existing imports and before the render):

```tsx
import { useSessionStore, snapshotSession } from './state/sessionStore';
import { loadFromStorage, makeDebouncedSaver } from './state/persistence';

const stored = loadFromStorage();
if (stored) useSessionStore.getState().setAll(stored);

const save = makeDebouncedSaver(500);
useSessionStore.subscribe((state) => save(snapshotSession(state)));
```

- [ ] **Step 6: Typecheck and test**

Run: `npm run typecheck && npm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/state/persistence.ts tests/state/persistence.test.ts src/main.tsx
git commit -m "feat(state): localStorage autosave and JSON import/export"
```

---

## Task 18: React Flow canvas bootstrap

**Files:**
- Create: `src/canvas/Canvas.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write `src/canvas/Canvas.tsx`**

```tsx
import { useCallback, useMemo } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  type Node, type Edge as FlowEdge, type NodeChange, type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSessionStore } from '@/state/sessionStore';
import { moveCard } from '@/state/cardOps';

function InnerCanvas() {
  const cards = useSessionStore((s) => s.cards);
  const edges = useSessionStore((s) => s.edges);
  const setCards = useSessionStore((s) => s.setCards);
  const setEdges = useSessionStore((s) => s.setEdges);

  const nodes: Node[] = useMemo(
    () => cards.map((c) => ({
      id: c.id,
      position: { x: c.x, y: c.y },
      type: c.kind,                       // 'section' | 'definition' | 'picker' (registered in Task 19–21)
      data: { cardId: c.id },
    })),
    [cards],
  );

  const flowEdges: FlowEdge[] = useMemo(
    () => edges.map((e) => ({
      id: e.id, source: e.source, target: e.target,
      label: e.label,
      style: e.kind === 'manual' ? { strokeWidth: 2 } : { strokeWidth: 1, opacity: 0.6 },
    })),
    [edges],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Controlled mode: translate React Flow's position changes into store updates.
    // Selection and dimension changes are ignored by design in v1.
    setCards((prev) => {
      let next = prev;
      for (const ch of changes) {
        if (ch.type === 'position' && ch.position) {
          next = moveCard(next, ch.id, ch.position.x, ch.position.y);
        }
      }
      return next;
    });
  }, [setCards]);

  const onEdgesChange = useCallback((_changes: EdgeChange[]) => {
    // Edge deletions in v1 happen via explicit card-delete flows (Task 19/20/21),
    // which sweep matching edges out of the store. No-op here.
  }, []);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={{ /* registered in Task 19–21 */ }}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <InnerCanvas />
    </ReactFlowProvider>
  );
}
```

- [ ] **Step 2: Update `src/App.tsx`**

```tsx
import Canvas from './canvas/Canvas';

export default function App() {
  return (
    <div className="h-full w-full">
      <Canvas />
    </div>
  );
}
```

- [ ] **Step 3: Smoke-boot the dev server**

Run: `npm run dev` and open `http://localhost:5173`. Expect an empty React Flow canvas with the Background dots and Controls panel. Kill the server.

- [ ] **Step 4: Commit**

```bash
git add src/canvas/Canvas.tsx src/App.tsx
git commit -m "feat(canvas): React Flow bootstrap"
```

---

## Task 19: SectionCard + InlineMarkup

**Files:**
- Create: `src/canvas/SectionCard.tsx`, `src/canvas/InlineMarkup.tsx`
- Modify: `src/canvas/Canvas.tsx` (register node type)

- [ ] **Step 1: Write `src/canvas/InlineMarkup.tsx`**

```tsx
import type { SectionNode, SectionBodyUnit } from '@/types/section';

interface Props {
  unit: SectionBodyUnit;
  onRefClick: (href: string) => void;
  onTermClick: (term: string) => void;
  hideDefinitions: boolean;
}

function renderNode(n: SectionNode, i: number, onRefClick: Props['onRefClick'], onTermClick: Props['onTermClick'], hideDefinitions: boolean) {
  if (n.kind === 'text') return <span key={i}>{n.value}</span>;
  if (n.kind === 'ref') {
    return (
      <a
        key={i}
        className="text-refLink underline decoration-solid cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onRefClick(n.href); }}
      >{n.value}</a>
    );
  }
  // term
  if (hideDefinitions) return <span key={i}>{n.value}</span>;
  return (
    <span
      key={i}
      className="text-termLink underline decoration-dashed cursor-pointer"
      title={`Defined term: ${n.term}`}
      onClick={(e) => { e.stopPropagation(); onTermClick(n.term); }}
    >{n.value}</span>
  );
}

export default function InlineMarkup({ unit, onRefClick, onTermClick, hideDefinitions }: Props) {
  return (
    <div className={`pl-${Math.min(unit.level === 'section' ? 0 : 4, 12)}`}>
      {unit.num && <span className="font-medium mr-1">{unit.num}</span>}
      {unit.nodes.map((n, i) => renderNode(n, i, onRefClick, onTermClick, hideDefinitions))}
      {unit.children.map((child) => (
        <InlineMarkup key={child.id} unit={child} onRefClick={onRefClick} onTermClick={onTermClick} hideDefinitions={hideDefinitions} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/canvas/SectionCard.tsx`**

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { loadSection } from '@/data/loader';
import { useSessionStore } from '@/state/sessionStore';
import { removeCard, togglePin, toggleCollapsed, toggleHideDefinitions } from '@/state/cardOps';
import type { Section, SectionCard as SectionCardT } from '@/types/session';
import InlineMarkup from './InlineMarkup';

// onRefClick/onTermClick wiring lives in Task 22 (cardSpawning).
import { spawnFromRef, spawnFromTerm } from './cardSpawning';

export default function SectionCardNode({ data }: NodeProps) {
  const cardId = (data as { cardId: string }).cardId;
  const card = useSessionStore((s) => s.cards.find((c) => c.id === cardId)) as SectionCardT | undefined;
  const setCards = useSessionStore((s) => s.setCards);
  const setEdges = useSessionStore((s) => s.setEdges);
  const [section, setSection] = useState<Section | null>(null);

  useEffect(() => {
    if (!card) return;
    loadSection(card.sectionNumber).then(setSection).catch(() => setSection(null));
  }, [card?.sectionNumber]);

  if (!card) return null;

  return (
    <div className="bg-white border border-slate-300 rounded shadow-md w-[520px] text-sm">
      <Handle type="target" position={Position.Top} />
      <div className="px-3 py-2 border-b flex items-center gap-2 bg-slate-50">
        <span className="font-semibold">§ {card.sectionNumber}</span>
        <span className="text-slate-600 truncate">{section?.heading}</span>
        <div className="ml-auto flex gap-1 text-xs">
          <button onClick={() => setCards((cs) => toggleCollapsed(cs, card.id))}>{card.collapsed ? '▸' : '▾'}</button>
          <button onClick={() => setCards((cs) => togglePin(cs, card.id))} aria-pressed={card.pinned}>{card.pinned ? '📌' : '📍'}</button>
          <button onClick={() => setCards((cs) => toggleHideDefinitions(cs, card.id))}>{card.hideDefinitions ? 'show defs' : 'hide defs'}</button>
          <button onClick={() => { setCards((cs) => removeCard(cs, card.id)); setEdges((es) => es.filter((e) => e.source !== card.id && e.target !== card.id)); }}>×</button>
        </div>
      </div>
      {!card.collapsed && section && (
        <div className="px-3 py-2 max-h-[480px] overflow-auto">
          <InlineMarkup
            unit={section.body}
            onRefClick={(href) => spawnFromRef(card.id, href)}
            onTermClick={(term) => spawnFromTerm(card.id, term)}
            hideDefinitions={card.hideDefinitions}
          />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

- [ ] **Step 3: Stub `src/canvas/cardSpawning.ts`** (real implementation in Task 22)

```ts
export function spawnFromRef(_sourceCardId: string, _href: string): void { /* wired in Task 22 */ }
export function spawnFromTerm(_sourceCardId: string, _term: string): void { /* wired in Task 22 */ }
```

- [ ] **Step 4: Register node type in Canvas**

Edit `src/canvas/Canvas.tsx` — change the `nodeTypes` prop to:

```tsx
import SectionCardNode from './SectionCard';

// ...inside InnerCanvas, replace `nodeTypes={{}}` with:
nodeTypes={useMemo(() => ({ section: SectionCardNode }), [])}
```

- [ ] **Step 5: Dev-server smoke**

Run: `npm run dev`. Manually inject a card into the store via the browser console:
```js
window.__debug = { useSessionStore: (await import('/src/state/sessionStore.ts')).useSessionStore };
window.__debug.useSessionStore.getState().setCards(() => [{ id: 'x', kind: 'section', sectionNumber: '546', x: 100, y: 100, pinned: false, collapsed: false, hideDefinitions: false }]);
```
Expect § 546 to render with heading "Limitations on avoiding powers" and subsection (a) body text. Kill the server.

- [ ] **Step 6: Commit**

```bash
git add src/canvas/SectionCard.tsx src/canvas/InlineMarkup.tsx src/canvas/cardSpawning.ts src/canvas/Canvas.tsx
git commit -m "feat(canvas): SectionCard with inline refs and defined terms"
```

---

## Task 20: DefinitionCard

**Files:**
- Create: `src/canvas/DefinitionCard.tsx`
- Modify: `src/canvas/Canvas.tsx`

- [ ] **Step 1: Write `src/canvas/DefinitionCard.tsx`**

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { loadTerms } from '@/data/loader';
import { useSessionStore } from '@/state/sessionStore';
import { removeCard, togglePin } from '@/state/cardOps';
import type { DefinitionCard as DefCardT, SectionCard } from '@/types/session';
import type { TermCandidate } from '@/types/term';

export default function DefinitionCardNode({ data }: NodeProps) {
  const cardId = (data as { cardId: string }).cardId;
  const card = useSessionStore((s) => s.cards.find((c) => c.id === cardId)) as DefCardT | undefined;
  const setCards = useSessionStore((s) => s.setCards);
  const setEdges = useSessionStore((s) => s.setEdges);
  const [candidate, setCandidate] = useState<TermCandidate | null>(null);

  useEffect(() => {
    if (!card) return;
    loadTerms().then((terms) => {
      const entry = terms[card.term];
      setCandidate(entry?.candidates[card.candidateIndex] ?? null);
    });
  }, [card?.term, card?.candidateIndex]);

  if (!card || !candidate) return null;

  const chapterBadge = candidate.scope.startsWith('chapter:')
    ? `Chapter ${candidate.scope.slice('chapter:'.length)} only` : null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded shadow w-[340px] text-sm">
      <Handle type="target" position={Position.Top} />
      <div className="px-3 py-2 border-b border-amber-200 flex items-center gap-2">
        <span className="font-semibold">"{card.term}"</span>
        <span className="text-slate-600 text-xs">§ {candidate.section}{candidate.subsection}</span>
        {chapterBadge && <span className="ml-auto text-xs px-1 rounded bg-amber-200">{chapterBadge}</span>}
        <button className="ml-auto text-xs" onClick={() => setCards((cs) => togglePin(cs, card.id))}>{card.pinned ? '📌' : '📍'}</button>
        <button className="text-xs" onClick={() => { setCards((cs) => removeCard(cs, card.id)); setEdges((es) => es.filter((e) => e.source !== card.id && e.target !== card.id)); }}>×</button>
      </div>
      <div className="px-3 py-2">{candidate.definition}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export type { SectionCard };
```

- [ ] **Step 2: Register node type**

Edit `src/canvas/Canvas.tsx`:

```tsx
import SectionCardNode from './SectionCard';
import DefinitionCardNode from './DefinitionCard';

// nodeTypes memo:
nodeTypes={useMemo(() => ({ section: SectionCardNode, definition: DefinitionCardNode }), [])}
```

- [ ] **Step 3: Commit**

```bash
git add src/canvas/DefinitionCard.tsx src/canvas/Canvas.tsx
git commit -m "feat(canvas): DefinitionCard node"
```

---

## Task 21: PickerCard for ambiguous terms

**Files:**
- Create: `src/canvas/PickerCard.tsx`
- Modify: `src/canvas/Canvas.tsx`

- [ ] **Step 1: Write `src/canvas/PickerCard.tsx`**

```tsx
import { type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { loadTerms } from '@/data/loader';
import { useSessionStore } from '@/state/sessionStore';
import { removeCard } from '@/state/cardOps';
import type { PickerCard as PickerCardT, DefinitionCard } from '@/types/session';
import type { TermCandidate } from '@/types/term';

export default function PickerCardNode({ data }: NodeProps) {
  const cardId = (data as { cardId: string }).cardId;
  const card = useSessionStore((s) => s.cards.find((c) => c.id === cardId)) as PickerCardT | undefined;
  const setCards = useSessionStore((s) => s.setCards);
  const [candidates, setCandidates] = useState<TermCandidate[]>([]);

  useEffect(() => {
    if (!card) return;
    loadTerms().then((terms) => setCandidates(terms[card.term]?.candidates ?? []));
  }, [card?.term]);

  if (!card) return null;

  const choose = (i: number) => {
    setCards((cs) => {
      const kept = cs.filter((c) => c.id !== card.id);
      const def: DefinitionCard = {
        id: card.id,  // reuse id so edges stay valid
        kind: 'definition',
        term: card.term,
        candidateIndex: i,
        x: card.x,
        y: card.y,
        pinned: card.pinned,
        collapsed: false,
        hideDefinitions: false,
      };
      return [...kept, def];
    });
  };

  return (
    <div className="bg-white border border-amber-500 rounded shadow w-[360px] text-sm">
      <div className="px-3 py-2 border-b font-semibold">Pick a definition for "{card.term}"</div>
      <ul className="divide-y">
        {candidates.map((c, i) => (
          <li key={i} className="px-3 py-2 hover:bg-amber-50 cursor-pointer" onClick={() => choose(i)}>
            <div className="text-xs text-slate-600">§ {c.section}{c.subsection} — {c.scope === 'title' ? 'Title-wide' : `Chapter ${c.scope.slice('chapter:'.length)}`}</div>
            <div>{c.definition}</div>
          </li>
        ))}
      </ul>
      <div className="px-3 py-2 text-right">
        <button className="text-xs text-slate-500" onClick={() => setCards((cs) => removeCard(cs, card.id))}>cancel</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register node type**

Edit `src/canvas/Canvas.tsx`:

```tsx
nodeTypes={useMemo(() => ({ section: SectionCardNode, definition: DefinitionCardNode, picker: PickerCardNode }), [])}
```

- [ ] **Step 3: Commit**

```bash
git add src/canvas/PickerCard.tsx src/canvas/Canvas.tsx
git commit -m "feat(canvas): ambiguous-term PickerCard"
```

---

## Task 22: Card-spawning from ref/term clicks

**Files:**
- Modify: `src/canvas/cardSpawning.ts`

- [ ] **Step 1: Replace the stubs in `src/canvas/cardSpawning.ts`**

```ts
import { nanoid } from 'nanoid';
import { addCard, addEdge } from '@/state/cardOps';
import { useSessionStore } from '@/state/sessionStore';
import { loadTerms } from '@/data/loader';
import { resolveRef } from '../../scripts/build-data/resolveRef';
import type { Card, DefinitionCard, Edge, PickerCard, SectionCard } from '@/types/session';

const OFFSET_X = 560;
const OFFSET_Y = 60;

function sourceOrigin(sourceId: string): { x: number; y: number } {
  const src = useSessionStore.getState().cards.find((c) => c.id === sourceId);
  return src ? { x: src.x + OFFSET_X, y: src.y + OFFSET_Y } : { x: 0, y: 0 };
}

function pushHistory(cardId: string) {
  useSessionStore.getState().pushHistory({ cardId, openedAt: Date.now() });
}

function spawn(card: Card, sourceId: string) {
  const edge: Edge = { id: nanoid(), source: sourceId, target: card.id, kind: 'auto' };
  useSessionStore.getState().setCards((cs) => addCard(cs, card));
  useSessionStore.getState().setEdges((es) => addEdge(es, edge));
  pushHistory(card.id);
}

export function spawnFromRef(sourceCardId: string, href: string): void {
  const resolved = resolveRef(href);
  if (resolved.kind === 'external') return;  // handled at render time (non-clickable)
  const existing = useSessionStore.getState().cards.find(
    (c): c is SectionCard => c.kind === 'section' && c.sectionNumber === resolved.section,
  );
  if (existing) { pushHistory(existing.id); return; }
  const pos = sourceOrigin(sourceCardId);
  const card: SectionCard = {
    id: nanoid(), kind: 'section', sectionNumber: resolved.section,
    x: pos.x, y: pos.y, pinned: false, collapsed: false, hideDefinitions: false,
  };
  spawn(card, sourceCardId);
}

export async function spawnFromTerm(sourceCardId: string, term: string): Promise<void> {
  const terms = await loadTerms();
  const entry = terms[term];
  if (!entry) return;
  const pos = sourceOrigin(sourceCardId);
  if (entry.candidates.length > 1) {
    const pick: PickerCard = { id: nanoid(), kind: 'picker', term, x: pos.x, y: pos.y, pinned: false, collapsed: false, hideDefinitions: false };
    spawn(pick, sourceCardId);
    return;
  }
  const existing = useSessionStore.getState().cards.find(
    (c): c is DefinitionCard => c.kind === 'definition' && c.term === term,
  );
  if (existing) { pushHistory(existing.id); return; }
  const def: DefinitionCard = {
    id: nanoid(), kind: 'definition', term, candidateIndex: 0,
    x: pos.x, y: pos.y, pinned: false, collapsed: false, hideDefinitions: false,
  };
  spawn(def, sourceCardId);
}
```

- [ ] **Step 2: Install nanoid**

```bash
npm install nanoid@^5.0.0
```

- [ ] **Step 3: Smoke-boot and verify**

Run: `npm run dev`. From the browser console, seed a section 546 card as in Task 19 Step 5. Click an inline ref (e.g., "section 547") in the rendered card. Expect a new § 547 card to appear to the right, connected by an edge. Click a defined term (once Task 7 populates term nodes in bodies — see Task 30 caveat below). Kill the server.

**Caveat:** the extractor currently leaves term nodes as plain text — inline term detection happens in Task 30. Until then, only ref clicks will fire.

- [ ] **Step 4: Commit**

```bash
git add src/canvas/cardSpawning.ts package.json package-lock.json
git commit -m "feat(canvas): spawn cards and auto-edges from ref/term clicks"
```

---

## Task 23: "Expand all" button on section cards

**Files:**
- Create: `src/canvas/expandAll.ts`
- Modify: `src/canvas/SectionCard.tsx`

- [ ] **Step 1: Write `src/canvas/expandAll.ts`**

```ts
import { loadSection } from '@/data/loader';
import { spawnFromRef, spawnFromTerm } from './cardSpawning';
import type { SectionBodyUnit, SectionNode } from '@/types/section';

function walkNodes(unit: SectionBodyUnit, visit: (n: SectionNode) => void): void {
  for (const n of unit.nodes) visit(n);
  for (const c of unit.children) walkNodes(c, visit);
}

export async function expandAll(sourceCardId: string, sectionNumber: string): Promise<void> {
  const section = await loadSection(sectionNumber);
  const refs = new Set<string>();
  const terms = new Set<string>();
  walkNodes(section.body, (n) => {
    if (n.kind === 'ref') refs.add(n.href);
    if (n.kind === 'term') terms.add(n.term);
  });
  for (const h of refs) spawnFromRef(sourceCardId, h);
  for (const t of terms) await spawnFromTerm(sourceCardId, t);
}
```

- [ ] **Step 2: Add the button to `src/canvas/SectionCard.tsx`**

In the header buttons row, before the `×` button, add:

```tsx
<button
  className="text-xs"
  title="Spawn every ref and defined term from this section"
  onClick={() => import('./expandAll').then((m) => m.expandAll(card.id, card.sectionNumber))}
>expand all</button>
```

- [ ] **Step 3: Commit**

```bash
git add src/canvas/expandAll.ts src/canvas/SectionCard.tsx
git commit -m "feat(canvas): expand-all button on section cards"
```

---

## Task 24: Manual edges (user-drawn)

**Files:**
- Modify: `src/canvas/Canvas.tsx`

- [ ] **Step 1: Handle `onConnect` in `InnerCanvas`**

Add to the imports:
```tsx
import type { Connection } from '@xyflow/react';
import { nanoid } from 'nanoid';
import { addEdge as addEdgeOp } from '@/state/cardOps';
```

Add a handler inside `InnerCanvas`:
```tsx
const onConnect = useCallback((c: Connection) => {
  if (!c.source || !c.target) return;
  const label = window.prompt('Edge label (optional):') ?? undefined;
  setEdges((es) => addEdgeOp(es, { id: nanoid(), source: c.source!, target: c.target!, kind: 'manual', label: label || undefined }));
}, [setEdges]);
```

Pass it to `<ReactFlow>`:
```tsx
<ReactFlow
  ...existing props...
  onConnect={onConnect}
>
```

- [ ] **Step 2: Commit**

```bash
git add src/canvas/Canvas.tsx
git commit -m "feat(canvas): user-drawn manual edges with optional labels"
```

---

## Task 25: Search box

**Files:**
- Create: `src/ui/SearchBox.tsx`, `src/ui/TopBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write `src/ui/SearchBox.tsx`**

```tsx
import { useEffect, useState } from 'react';
import lunr from 'lunr';
import { nanoid } from 'nanoid';
import { loadSearchIndex, loadSectionLookup } from '@/data/loader';
import { resolveQuery, type SearchResult } from '@/data/search';
import { useSessionStore } from '@/state/sessionStore';
import { addCard } from '@/state/cardOps';
import type { SectionCard } from '@/types/session';

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [index, setIndex] = useState<lunr.Index | null>(null);
  const [lookup, setLookup] = useState<Record<string, string>>({});
  const setCards = useSessionStore((s) => s.setCards);
  const pushHistory = useSessionStore((s) => s.pushHistory);

  useEffect(() => {
    Promise.all([loadSearchIndex(), loadSectionLookup()]).then(([idxJson, l]) => {
      setIndex(lunr.Index.load(idxJson as any));
      setLookup(l);
    });
  }, []);

  useEffect(() => {
    if (!index) return;
    setResults(resolveQuery(q, { sectionLookup: lookup, index }));
  }, [q, index, lookup]);

  const addSection = (n: string) => {
    const id = nanoid();
    const card: SectionCard = { id, kind: 'section', sectionNumber: n, x: 80, y: 80, pinned: false, collapsed: false, hideDefinitions: false };
    setCards((cs) => addCard(cs, card));
    pushHistory({ cardId: id, openedAt: Date.now() });
    setQ('');
  };

  return (
    <div className="relative">
      <input
        className="px-2 py-1 border rounded w-96"
        placeholder="Search by section (e.g. 546(e)) or keyword"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q && results.length > 0 && (
        <ul className="absolute z-10 bg-white border rounded mt-1 w-96 max-h-64 overflow-auto shadow">
          {results.slice(0, 10).map((r) => (
            <li key={r.sectionNumber} className="px-2 py-1 hover:bg-slate-100 cursor-pointer" onClick={() => addSection(r.sectionNumber)}>
              <span className="font-medium">§ {r.sectionNumber}</span> <span className="text-slate-600">{r.heading}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/ui/TopBar.tsx`**

```tsx
import SearchBox from './SearchBox';
import SessionControls from './SessionControls';

export default function TopBar() {
  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b bg-white">
      <div className="font-semibold">Bankruptcy Canvas</div>
      <SearchBox />
      <div className="ml-auto"><SessionControls /></div>
    </div>
  );
}
```

- [ ] **Step 3: Update `src/App.tsx`**

```tsx
import Canvas from './canvas/Canvas';
import TopBar from './ui/TopBar';
import HistorySidebar from './ui/HistorySidebar';

export default function App() {
  return (
    <div className="h-full w-full flex flex-col">
      <TopBar />
      <div className="flex-1 flex">
        <HistorySidebar />
        <div className="flex-1"><Canvas /></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/SearchBox.tsx src/ui/TopBar.tsx src/App.tsx
git commit -m "feat(ui): top-bar search box (section-number + keyword)"
```

---

## Task 26: Session controls (New / Load / Export / Import)

**Files:**
- Create: `src/ui/SessionControls.tsx`

- [ ] **Step 1: Write `src/ui/SessionControls.tsx`**

```tsx
import { useRef } from 'react';
import { useSessionStore, snapshotSession } from '@/state/sessionStore';
import { clearUnpinned } from '@/state/cardOps';
import { exportSession, importSession } from '@/state/persistence';

export default function SessionControls() {
  const fileInput = useRef<HTMLInputElement>(null);

  const onNew = () => {
    // "New session" clears the canvas but keeps pinned cards per spec.
    const store = useSessionStore.getState();
    store.setCards((cs) => clearUnpinned(cs));
    store.setEdges(() => []);
  };

  const onExport = () => {
    const state = useSessionStore.getState();
    const url = exportSession(snapshotSession(state));
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onPickFile = () => fileInput.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = importSession(text);
      useSessionStore.getState().setAll(parsed);
    } catch (err) {
      alert(`Could not import session: ${(err as Error).message}`);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="flex gap-2 text-sm">
      <button className="px-2 py-1 border rounded" onClick={onNew}>New</button>
      <button className="px-2 py-1 border rounded" onClick={onExport}>Export</button>
      <button className="px-2 py-1 border rounded" onClick={onPickFile}>Import</button>
      <input ref={fileInput} type="file" accept="application/json" hidden onChange={onFileChange} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/SessionControls.tsx
git commit -m "feat(ui): session New/Export/Import controls"
```

---

## Task 27: History sidebar

**Files:**
- Create: `src/ui/HistorySidebar.tsx`

- [ ] **Step 1: Write `src/ui/HistorySidebar.tsx`**

```tsx
import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSessionStore } from '@/state/sessionStore';

export default function HistorySidebar() {
  const history = useSessionStore((s) => s.history);
  const cards = useSessionStore((s) => s.cards);
  const [collapsed, setCollapsed] = useState(false);
  const rf = useReactFlow();

  const focus = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    rf.setCenter(card.x + 260, card.y + 100, { zoom: 1, duration: 300 });
  };

  if (collapsed) {
    return (
      <div className="w-8 border-r bg-slate-50 flex items-start justify-center py-2">
        <button onClick={() => setCollapsed(false)} title="Show history">▸</button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-slate-50 flex flex-col">
      <div className="px-3 py-2 border-b flex items-center">
        <span className="font-semibold text-sm">History</span>
        <button className="ml-auto" onClick={() => setCollapsed(true)} title="Collapse">◂</button>
      </div>
      <ul className="flex-1 overflow-auto text-sm">
        {history.map((h, i) => {
          const card = cards.find((c) => c.id === h.cardId);
          const label = card?.kind === 'section' ? `§ ${card.sectionNumber}`
            : card?.kind === 'definition' ? `"${card.term}"`
            : card?.kind === 'picker' ? `? "${card.term}"`
            : '(deleted)';
          return (
            <li key={`${h.cardId}-${i}`} className="px-3 py-1 hover:bg-white cursor-pointer" onClick={() => focus(h.cardId)}>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

Note: `HistorySidebar` uses `useReactFlow`, which requires being inside a `ReactFlowProvider`. Move the provider up one level so it wraps both the sidebar and canvas:

Edit `src/App.tsx`:

```tsx
import { ReactFlowProvider } from '@xyflow/react';
import Canvas from './canvas/Canvas';
import TopBar from './ui/TopBar';
import HistorySidebar from './ui/HistorySidebar';

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex flex-col">
        <TopBar />
        <div className="flex-1 flex">
          <HistorySidebar />
          <div className="flex-1"><Canvas /></div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
```

Then edit `src/canvas/Canvas.tsx` — remove the outer `ReactFlowProvider` wrapper; export `InnerCanvas` as the default.

- [ ] **Step 2: Commit**

```bash
git add src/ui/HistorySidebar.tsx src/App.tsx src/canvas/Canvas.tsx
git commit -m "feat(ui): collapsible history sidebar"
```

---

## Task 28: Inline defined-term tagging in section bodies

**Files:**
- Modify: `scripts/build-data/extractTerms.ts` (export a usage pass)
- Modify: `scripts/build-data/index.ts`

The extractor currently identifies terms as definitions but doesn't tag their *usage* in other sections. The spec requires clickable terms in section bodies. This task adds a post-pass that walks section text and replaces inline term mentions with `{ kind: 'term' }` nodes. Matching strategy: case-insensitive whole-word match against the known term set, longest-first to avoid "settlement payment" being split into "settlement" then "payment".

- [ ] **Step 1: Add a new exported function in `scripts/build-data/extractTerms.ts`**

```ts
import type { Section, SectionBodyUnit, SectionNode } from './extractSections';

function splitOnTerms(text: string, sortedTerms: string[]): SectionNode[] {
  if (!text) return [];
  const out: SectionNode[] = [];
  let cursor = 0;
  const lower = text.toLowerCase();
  while (cursor < text.length) {
    let hit: { term: string; index: number } | null = null;
    for (const term of sortedTerms) {
      const idx = lower.indexOf(term, cursor);
      if (idx < 0) continue;
      // whole-word boundary check
      const before = idx === 0 ? ' ' : text[idx - 1];
      const after = idx + term.length >= text.length ? ' ' : text[idx + term.length];
      if (/\w/.test(before) || /\w/.test(after)) continue;
      if (!hit || idx < hit.index) hit = { term, index: idx };
    }
    if (!hit) { out.push({ kind: 'text', value: text.slice(cursor) }); break; }
    if (hit.index > cursor) out.push({ kind: 'text', value: text.slice(cursor, hit.index) });
    out.push({ kind: 'term', term: hit.term, value: text.slice(hit.index, hit.index + hit.term.length) });
    cursor = hit.index + hit.term.length;
  }
  return out;
}

function rewriteUnit(unit: SectionBodyUnit, sortedTerms: string[]): SectionBodyUnit {
  const nodes: SectionNode[] = [];
  for (const n of unit.nodes) {
    if (n.kind === 'text') nodes.push(...splitOnTerms(n.value, sortedTerms));
    else nodes.push(n);
  }
  return { ...unit, nodes, children: unit.children.map((c) => rewriteUnit(c, sortedTerms)) };
}

export function tagTermUsage(sections: Section[], termNames: string[]): Section[] {
  const sorted = [...termNames].sort((a, b) => b.length - a.length);
  return sections.map((s) => ({ ...s, body: rewriteUnit(s.body, sorted) }));
}
```

- [ ] **Step 2: Wire it in `scripts/build-data/index.ts`**

Between the term extraction and search-index build:

```ts
import { extractTerms, tagTermUsage } from './extractTerms';
// ...
const terms = extractTerms(tree);
const taggedSections = tagTermUsage(sections, Object.keys(terms));
const { lunrIndex, sectionLookup } = buildSearchIndex(taggedSections);
emitArtifacts(OUT, taggedSections, terms, lunrIndex, sectionLookup);
```

- [ ] **Step 3: Add a unit test**

Append to `tests/build-data/extractTerms.test.ts`:

```ts
import { tagTermUsage } from '../../scripts/build-data/extractTerms';
import { extractSections } from '../../scripts/build-data/extractSections';

describe('tagTermUsage', () => {
  it('rewrites inline text into term nodes where defined terms appear', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    const sections = extractSections(tree);
    const tagged = tagTermUsage(sections, ['claim']);
    const s101 = tagged.find((s) => s.sectionNumber === '101')!;
    const para = s101.body.children[0];
    const hasTermNode = para.nodes.some((n) => n.kind === 'term' && n.term === 'claim');
    expect(hasTermNode).toBe(true);
  });
});
```

- [ ] **Step 4: Run and rebuild**

Run: `npm test -- extractTerms`
Expected: PASS.

Run: `npm run build:data`
Expected: artifacts regenerate. Spot-check one section body contains term nodes:

```bash
node -e "const s=require('./public/data/sections/s546.json');
  const walk=(u)=>{ for(const n of u.nodes) if(n.kind==='term') console.log('TERM:', n.term); u.children.forEach(walk); };
  walk(s.body);"
```
Expect at least one `TERM:` line (defined terms used in § 546).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-data/extractTerms.ts scripts/build-data/index.ts tests/build-data/extractTerms.test.ts
git commit -m "feat(build): tag defined-term usage inline in section bodies"
```

---

## Task 29: Broken-ref rendering (external refs)

**Files:**
- Modify: `src/canvas/InlineMarkup.tsx`

The resolver already returns `kind: 'external'` for refs outside Title 11. Render those as non-clickable text with a tooltip.

- [ ] **Step 1: Update `src/canvas/InlineMarkup.tsx`**

Replace the `if (n.kind === 'ref')` branch with:

```tsx
if (n.kind === 'ref') {
  // External refs (out-of-Title-11 or malformed) should not be clickable.
  const isInternal = /^\/us\/usc\/t11\/s/.test(n.href);
  if (!isInternal) {
    return (
      <span key={i} className="text-slate-500" title={`External reference: ${n.href}`}>{n.value}</span>
    );
  }
  return (
    <a
      key={i}
      className="text-refLink underline decoration-solid cursor-pointer"
      onClick={(e) => { e.stopPropagation(); onRefClick(n.href); }}
    >{n.value}</a>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/canvas/InlineMarkup.tsx
git commit -m "feat(canvas): render non-Title-11 refs as non-clickable text"
```

---

## Task 30: Playwright smoke test

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/canvas-smoke.spec.ts`

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test@^1.45.0
npx playwright install chromium
```

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4173', headless: true },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Write `tests/e2e/canvas-smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('search 546, click ref, export+import round-trips', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder(/Search by section/).fill('546');
  await page.getByRole('listitem').filter({ hasText: /§ 546/ }).first().click();
  await expect(page.getByText('Limitations on avoiding powers')).toBeVisible();

  // Click the first internal ref in the body.
  const firstRef = page.locator('.text-refLink').first();
  await firstRef.click();
  // A second section card should appear (look for another § header).
  await expect(page.locator('text=/§ \\d+/')).toHaveCount({ greaterThanOrEqual: 2 } as any);

  // Export session.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
});
```

- [ ] **Step 4: Run the smoke test**

Run: `npm run test:e2e`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/canvas-smoke.spec.ts package.json package-lock.json
git commit -m "test(e2e): Playwright canvas smoke test"
```

---

## Task 31: Production build + deploy config

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `vite.config.ts` (base path for GitHub Pages if applicable)

- [ ] **Step 1: Decide deploy target**

If deploying to GitHub Pages at `https://<user>.github.io/bankruptcy-code/`, set `base: '/bankruptcy-code/'` in `vite.config.ts`. If deploying to Netlify/root-path, leave `base: './'`.

- [ ] **Step 2: Write `.github/workflows/deploy.yml`** (GitHub Pages variant)

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Verify a production build works locally**

Run: `npm run build`
Expected: `dist/` populated; no TypeScript errors; artifact files present under `dist/data/`.

Run: `npm run preview` and open the printed URL. Expect the canvas to boot with live data.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml vite.config.ts
git commit -m "chore: GitHub Pages deploy workflow"
```

---

## Task 32: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Bankruptcy Canvas

A spatial research tool for Title 11 of the U.S. Code. Pull sections, defined terms, and cross-references onto a canvas; arrange, connect, save.

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
```

## Build

```bash
npm run build          # runs build:data + tsc + vite build
npm run preview        # serve dist/
```

## Architecture

- `scripts/build-data/` — Node pipeline: USLM XML → per-section JSON, term map, Lunr index.
- `src/` — React SPA. State in Zustand. Canvas via `@xyflow/react`. Tailwind for styling.
- `public/data/` — generated, git-ignored.

Design doc: `docs/superpowers/specs/2026-04-18-bankruptcy-canvas-design.md`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with dev/test/build instructions"
```

---

## Spec Coverage Checklist

Map of each spec requirement to the task(s) that implement it:

| Spec § | Requirement | Task(s) |
|---|---|---|
| 3.1 | Per-section JSON with structured body hierarchy | 5, 11 |
| 3.1 | Cross-references extracted per section | 5, 6 |
| 3.1 | Defined terms tagged inline in bodies | 28 |
| 3.2 | Term → definition map with scope | 7, 8, 9 |
| 3.3 | Lunr prebuilt search index | 10, 11 |
| 3.3 | Section-number lookup table | 10, 11 |
| 3.4 | Extraction confidence / candidate-flagging for ambiguous | 9, 21 |
| 4.1 | Section card with inline markup | 19 |
| 4.1 | Definition card | 20 |
| 4.2 | Search box (section number + keyword) | 14, 25 |
| 4.2 | Inline click → spawn adjacent card with auto-edge | 22 |
| 4.2 | "Expand all" button | 23 |
| 4.3 | Drag / collapse / delete / pin / hide-defs | 15, 16, 19, 20 |
| 4.4 | Auto-edges | 22 |
| 4.4 | Manual edges with optional label | 24 |
| 4.5 | History sidebar | 27 |
| 4.6 | localStorage autosave (debounced ~500ms) | 17 |
| 4.6 | New / Load / Export / Import | 26 |
| 4.6 | Session schema v1 | 12, 17 |
| 5 | TypeScript, React, Vite, React Flow, Zustand, Lunr, Tailwind, fast-xml-parser, Vitest, Playwright | 1, 2, 3 |
| 6 v1 | All v1 scope items | 1–32 |
| 7 | Ambiguous terms → picker card | 9, 21 |
| 7 | Broken/external refs → non-clickable with tooltip | 29 |
| 7 | Corrupt session JSON → readable error, no clobber | 17, 26 |
| 7 | Large-canvas virtualization | deferred per spec ("not pre-optimizing") |
| 7 | XML schema drift → loud failure with location | deferred — Node will throw with a stack if the expected path is missing; enhance only if it surfaces as a real problem |
| 8 | Pipeline unit tests | 4, 5, 6, 7, 8, 9, 10 |
| 8 | Core UI logic unit tests | 14, 16, 17 |
| 8 | End-to-end Playwright smoke | 30 |

---

**Plan complete.** Execute top-to-bottom; each task commits independently so reviews can happen at any checkpoint.
