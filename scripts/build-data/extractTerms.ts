import type { Section, SectionBodyUnit, SectionNode } from './extractSections';
import { attrOf, childrenOf, tagOf, textOf, type OrderedNode, type OrderedTree } from './uscTree';

export interface TermCandidate {
  section: string;
  subsection: string;
  scope: 'title' | `chapter:${string}`;
  definition: string;
}

export interface TermEntry { candidates: TermCandidate[]; }

export type TermMap = Record<string, TermEntry>;

const TITLE_SCOPE_RE = /\bin\s+this\s+title\b/i;
const CHAPTER_SCOPE_RE = /\bin\s+this\s+(?:chapter|subchapter)\b/i;
const TERM_RE = /^\s*(?:The\s+term\s+)?"([^"]+)"\s+(?:means|includes)\s+([\s\S]+?)(?:;|$)/i;
const TERM_NAME_RE = /(?:The\s+term\s+)?"([^"]+)"\s+(?:means|includes)/i;

function normalizeQuotes(s: string): string {
  return s.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'");
}

interface ParaHit {
  num: string;
  term: string;
  definition: string;
}

/**
 * Collect the full definition text from a subparagraph, recursing into clauses
 * when the subparagraph uses a chapeau+clauses shape. Handles:
 *   <subparagraph><content>X</content></subparagraph>
 *   <subparagraph><chapeau>X—</chapeau><clause>...</clause><clause>...</clause></subparagraph>
 */
function subparaText(subpara: OrderedNode): string {
  const subChildren = childrenOf(subpara, 'subparagraph');
  const content = subChildren.find((c) => tagOf(c) === 'content');
  if (content) return normalizeQuotes(textOf(childrenOf(content, 'content'))).trim();

  const chapeau = subChildren.find((c) => tagOf(c) === 'chapeau');
  const clauses = subChildren.filter((c) => tagOf(c) === 'clause');
  const chapeauText = chapeau ? normalizeQuotes(textOf(childrenOf(chapeau, 'chapeau'))).trim() : '';
  if (clauses.length === 0) return chapeauText;
  const clauseTexts = clauses.map((cl) => {
    // A clause may be a leaf <content> or itself a chapeau+subclauses shape.
    const clChildren = childrenOf(cl, 'clause');
    const clContent = clChildren.find((c) => tagOf(c) === 'content');
    if (clContent) return normalizeQuotes(textOf(childrenOf(clContent, 'content'))).trim();
    return normalizeQuotes(textOf(clChildren)).trim();
  }).filter(Boolean);
  const body = clauseTexts.join('; ');
  // Strip trailing em-dash / hyphen from the chapeau before joining.
  const chapeauTrim = chapeauText.replace(/[—-]\s*$/, '').trim();
  return chapeauTrim ? `${chapeauTrim} ${body}` : body;
}

function extractFromParagraph(para: OrderedNode): Omit<ParaHit, 'num'> | null {
  const paraChildren = childrenOf(para, 'paragraph');

  // Simple case: paragraph has <content> with the full "The term X means Y." sentence.
  const content = paraChildren.find((c) => tagOf(c) === 'content');
  if (content) {
    const contentText = normalizeQuotes(textOf(childrenOf(content, 'content')));
    const m = contentText.match(TERM_RE);
    if (m && m[2]!.trim()) {
      return { term: m[1]!.trim().toLowerCase(), definition: m[2]!.trim() };
    }
  }

  // Complex case: <chapeau>The term "X" means—</chapeau> + <subparagraph>[] definition body.
  const chapeau = paraChildren.find((c) => tagOf(c) === 'chapeau');
  if (!chapeau) return null;
  const chapeauText = normalizeQuotes(textOf(childrenOf(chapeau, 'chapeau')));
  const nameMatch = chapeauText.match(TERM_NAME_RE);
  if (!nameMatch) return null;
  const term = nameMatch[1]!.trim().toLowerCase();

  const subparas = paraChildren.filter((c) => tagOf(c) === 'subparagraph');
  const parts = subparas.map(subparaText)
    .map((t) => t
      .replace(/\s*;\s*(?:or|and)\s*$/i, '')
      .replace(/;\s*$/, ''))
    .filter(Boolean);

  if (parts.length > 0) {
    return { term, definition: parts.join('; ') };
  }

  // Last resort: chapeau itself has full "means Y" definition (rare).
  const full = chapeauText.match(TERM_RE);
  if (full && full[2]!.trim()) {
    return { term, definition: full[2]!.trim() };
  }
  return null;
}

function iterParagraphs(sec: OrderedNode): ParaHit[] {
  const out: ParaHit[] = [];
  const walk = (node: OrderedNode): void => {
    const tag = tagOf(node);
    if (!tag) return;
    const children = childrenOf(node, tag);
    for (const child of children) {
      const ct = tagOf(child);
      if (ct === 'paragraph') {
        const chChildren = childrenOf(child, 'paragraph');
        const numNode = chChildren.find((c) => tagOf(c) === 'num');
        const numRaw = numNode ? attrOf(numNode, '@_value') ?? '' : '';
        const num = numRaw ? `(${numRaw})` : '';
        const hit = extractFromParagraph(child);
        if (hit) out.push({ num, ...hit });
      } else if (ct === 'subsection') {
        walk(child);
      }
    }
  };
  walk(sec);
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractTerms(tree: any): TermMap {
  const terms: TermMap = {};
  const rootTree = tree as OrderedTree;
  const uscDoc = rootTree.find((n) => tagOf(n) === 'uscDoc');
  if (!uscDoc) return terms;
  const main = childrenOf(uscDoc, 'uscDoc').find((n) => tagOf(n) === 'main');
  if (!main) return terms;
  const title = childrenOf(main, 'main').find((n) => tagOf(n) === 'title');
  if (!title) return terms;
  const chapters = childrenOf(title, 'title').filter((n) => tagOf(n) === 'chapter');

  for (const ch of chapters) {
    const chChildren = childrenOf(ch, 'chapter');
    const chNumNode = chChildren.find((c) => tagOf(c) === 'num');
    const chapterNum = chNumNode ? attrOf(chNumNode, '@_value') ?? '' : '';
    const directSections = chChildren.filter((c) => tagOf(c) === 'section');
    const subchapters = chChildren.filter((c) => tagOf(c) === 'subchapter');
    const allSections: OrderedNode[] = [
      ...directSections,
      ...subchapters.flatMap((s) => childrenOf(s, 'subchapter').filter((c) => tagOf(c) === 'section')),
    ];

    for (const sec of allSections) {
      const secChildren = childrenOf(sec, 'section');
      const numNode = secChildren.find((c) => tagOf(c) === 'num');
      const sectionNumber = numNode ? attrOf(numNode, '@_value') ?? '' : '';
      const headingNode = secChildren.find((c) => tagOf(c) === 'heading');
      const heading = headingNode ? textOf(childrenOf(headingNode, 'heading')).trim() : '';
      if (!/definition/i.test(heading)) continue;

      const chapeauNode = secChildren.find((c) => tagOf(c) === 'chapeau');
      const chapeauText = chapeauNode
        ? normalizeQuotes(textOf(childrenOf(chapeauNode, 'chapeau')))
        : '';
      const titleScoped = TITLE_SCOPE_RE.test(chapeauText);
      const chapterScoped = CHAPTER_SCOPE_RE.test(chapeauText);
      if (!titleScoped && !chapterScoped) continue;
      // Invariant: every <chapter> in Title 11 has <num value>. Empty chapterNum
      // would produce scope 'chapter:' — not observed in usc11.xml today.
      const scope: TermCandidate['scope'] = titleScoped ? 'title' : `chapter:${chapterNum}`;

      for (const { num, term, definition } of iterParagraphs(sec)) {
        const entry = terms[term] ?? { candidates: [] };
        entry.candidates.push({ section: sectionNumber, subsection: num, scope, definition });
        terms[term] = entry;
      }
    }
  }

  return terms;
}

// ---- Inline term tagging (Task 28) — operates on Section[] output, unchanged ----

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
      const before = idx === 0 ? ' ' : text[idx - 1]!;
      const after = idx + term.length >= text.length ? ' ' : text[idx + term.length]!;
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
