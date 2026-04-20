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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
