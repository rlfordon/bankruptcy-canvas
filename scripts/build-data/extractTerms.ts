import type { Section, SectionBodyUnit, SectionNode } from './extractSections';

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

// Match `The term "X" means Y` (with optional "The term " prefix and `includes` alt).
// Group 1 = the quoted term. Group 2 = the definition body (up to `;` or end).
// Anchored at start so phrases that merely quote a term mid-sentence don't match.
const TERM_RE = /^\s*(?:The\s+term\s+)?"([^"]+)"\s+(?:means|includes)\s+([\s\S]+?)(?:;|$)/i;

// Looser match for the "chapeau + subparagraphs" shape, where the chapeau ends with
// `means—` (em dash) or `includes—` and the actual definition lives in child tags.
// We only need the term name from this match; the definition is assembled separately.
const TERM_NAME_RE = /(?:The\s+term\s+)?"([^"]+)"\s+(?:means|includes)/i;

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

interface ParaHit {
  num: string;
  term: string;
  definition: string;
}

function asArray<T>(x: T | T[] | undefined): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function extractFromParagraph(po: Record<string, unknown>): Omit<ParaHit, 'num'> | null {
  // Simple case: content has the full definition.
  const contentText = normalizeQuotes(textOf(po.content));
  if (contentText) {
    const m = contentText.match(TERM_RE);
    if (m && m[2]!.trim()) {
      return { term: m[1]!.trim().toLowerCase(), definition: m[2]!.trim() };
    }
  }

  // Complex case: chapeau names the term; subparagraphs hold the definition body.
  const chapeauText = normalizeQuotes(textOf(po.chapeau));
  if (!chapeauText) return null;

  const nameMatch = chapeauText.match(TERM_NAME_RE);
  if (!nameMatch) return null;
  const term = nameMatch[1]!.trim().toLowerCase();

  // TODO(Task 8): handle subparagraphs that wrap <clause>/<subparagraph> children.
  //   § 101(2) "affiliate" truncates here because we only read the subparagraph's
  //   chapeau, not its clauses. A recursive bodyTextOf(node) helper would fix this.
  // TODO(Task 8): if a paragraph has BOTH <content> and <subparagraph>[], prefer
  //   the subparagraph join (currently short-circuits at content).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subparas = asArray<any>(po.subparagraph as any);
  const parts = subparas
    .map((s) => {
      const so = s as Record<string, unknown>;
      return normalizeQuotes(textOf(so.content ?? so.chapeau ?? so['#text'])).trim()
        // USLM subparagraphs commonly end with "; or" / "; and" / ";" — strip the
        // trailing connective so the joined definition reads cleanly.
        .replace(/\s*;\s*(?:or|and)\s*$/i, '')
        .replace(/;\s*$/, '');
    })
    .filter(Boolean);

  if (parts.length > 0) {
    return { term, definition: parts.join('; ') };
  }

  // Last resort: chapeau itself contained a full "means Y." definition.
  const full = chapeauText.match(TERM_RE);
  if (full && full[2]!.trim()) {
    return { term, definition: full[2]!.trim() };
  }

  return null;
}

function iterParagraphs(sec: unknown): ParaHit[] {
  const out: ParaHit[] = [];
  const walk = (node: unknown) => {
    if (node == null || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of asArray<any>(o.paragraph)) {
      const po = p as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const numRaw = (po.num as any)?.['@_value'] ?? '';
      const num = numRaw ? `(${numRaw})` : '';
      const hit = extractFromParagraph(po);
      if (hit) out.push({ num, ...hit });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of asArray<any>(o.subsection)) walk(s);
  };
  walk(sec);
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractTerms(tree: any): TermMap {
  const terms: TermMap = {};
  const title = tree.uscDoc.main.title;
  const chapters = asArray(title.chapter);

  for (const ch of chapters) {
    const chapterNum = String(ch.num?.['@_value'] ?? '');
    const allSections = [...asArray(ch.section)];
    for (const sub of asArray(ch.subchapter)) {
      allSections.push(...asArray((sub as Record<string, unknown>).section));
    }

    for (const sec of allSections) {
      const s = sec as Record<string, unknown>;
      const sectionNumber = String((s.num as Record<string, unknown>)?.['@_value'] ?? '');
      const heading = textOf(s.heading).trim();
      if (!/definition/i.test(heading)) continue;

      const chapeauText = normalizeQuotes(textOf(s.chapeau));
      const titleScoped = TITLE_SCOPE_RE.test(chapeauText);
      const chapterScoped = CHAPTER_SCOPE_RE.test(chapeauText);
      if (!titleScoped && !chapterScoped) continue;
      // Invariant: every <chapter> in Title 11 has <num value>. An empty chapterNum
      // would produce scope 'chapter:' — not observed in usc11.xml today.
      const scope: TermCandidate['scope'] = titleScoped ? 'title' : `chapter:${chapterNum}`;

      for (const { num, term, definition } of iterParagraphs(s)) {
        const entry = terms[term] ?? { candidates: [] };
        entry.candidates.push({ section: sectionNumber, subsection: num, scope, definition });
        terms[term] = entry;
      }
    }
  }

  return terms;
}

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
      const before = idx === 0 ? ' ' : text[idx - 1]!;
      const after = idx + term.length >= text.length ? ' ' : text[idx + term.length]!;
      if (/\w/.test(before) || /\w/.test(after)) continue;
      if (!hit || idx < hit.index) hit = { term, index: idx };
    }
    if (!hit) {
      out.push({ kind: 'text', value: text.slice(cursor) });
      break;
    }
    if (hit.index > cursor) out.push({ kind: 'text', value: text.slice(cursor, hit.index) });
    out.push({
      kind: 'term',
      term: hit.term,
      value: text.slice(hit.index, hit.index + hit.term.length),
    });
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
  return {
    ...unit,
    nodes,
    children: unit.children.map((c) => rewriteUnit(c, sortedTerms)),
  };
}

export function tagTermUsage(sections: Section[], termNames: string[]): Section[] {
  // Longest-first so "settlement payment" matches before "settlement".
  const sorted = [...termNames].sort((a, b) => b.length - a.length);
  return sections.map((s) => ({ ...s, body: rewriteUnit(s.body, sorted) }));
}
