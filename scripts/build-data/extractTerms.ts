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

function iterParagraphs(sec: unknown): Array<{ num: string; text: string }> {
  const out: Array<{ num: string; text: string }> = [];
  const walk = (node: unknown) => {
    if (node == null || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    const paras = Array.isArray(o.paragraph) ? o.paragraph : o.paragraph ? [o.paragraph] : [];
    for (const p of paras) {
      const po = p as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const numRaw = (po.num as any)?.['@_value'] ?? '';
      const num = numRaw ? `(${numRaw})` : '';
      out.push({ num, text: normalizeQuotes(textOf(po.content ?? po.chapeau ?? po['#text'])) });
    }
    const subs = Array.isArray(o.subsection) ? o.subsection : o.subsection ? [o.subsection] : [];
    for (const s of subs) walk(s);
  };
  walk(sec);
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        const term = m[1]!.trim().toLowerCase();
        const definition = m[2]!.trim();
        const entry = terms[term] ?? { candidates: [] };
        entry.candidates.push({ section: sectionNumber, subsection: num, scope, definition });
        terms[term] = entry;
      }
    }
  }

  return terms;
}
