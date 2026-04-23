import { attrOf, childrenOf, firstDescendant, immediateChildren, tagOf, textOf, type OrderedNode, type OrderedTree } from './uscTree';

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

const STRUCTURAL_TAGS = new Set<SectionBodyUnit['level']>([
  'section', 'subsection', 'paragraph', 'subparagraph', 'clause', 'subclause',
]);

/**
 * Walk an element's immediate children IN SOURCE ORDER, yielding inline nodes
 * (text/ref) for the `nodes` array and leaving structural children
 * (subsection/paragraph/etc.) to the caller.
 */
function inlineNodesOf(tree: OrderedTree): SectionNode[] {
  const out: SectionNode[] = [];
  for (const node of tree) {
    const t = tagOf(node);
    if (!t) continue;
    if (t === '#text') {
      const val = String(node['#text'] ?? '');
      if (val) out.push({ kind: 'text', value: val });
      continue;
    }
    if (t === 'ref') {
      out.push({
        kind: 'ref',
        href: attrOf(node, '@_href') ?? '',
        value: textOf(childrenOf(node, 'ref')),
      });
      continue;
    }
    // For chapeau / content / non-structural wrapper tags, recurse so their inline
    // text/refs flatten into the parent unit's nodes array, in order.
    if (!STRUCTURAL_TAGS.has(t as SectionBodyUnit['level']) && t !== 'num' && t !== 'heading') {
      out.push(...inlineNodesOf(childrenOf(node, t)));
    }
  }
  return out;
}

function buildUnit(
  node: OrderedNode,
  level: SectionBodyUnit['level'],
  parentId: string,
): SectionBodyUnit {
  const tag = tagOf(node);
  if (!tag) {
    return { id: parentId, level, num: '', nodes: [], children: [] };
  }
  const children = childrenOf(node, tag);

  // Build this unit's num from a <num value> child (if any).
  const numNode = children.find((c) => tagOf(c) === 'num');
  const numRaw = numNode ? attrOf(numNode, '@_value') ?? '' : '';
  const num = level === 'section' ? '' : numRaw ? `(${numRaw})` : '';
  const id = level === 'section' ? parentId : `${parentId}${num}`;

  // Inline nodes: walk every immediate child, skipping <num>, <heading>, and
  // structural children. Order is preserved because `children` is source-ordered.
  const nodes: SectionNode[] = [];
  for (const child of children) {
    const ct = tagOf(child);
    if (!ct) continue;
    if (ct === 'num' || ct === 'heading') continue;
    if (STRUCTURAL_TAGS.has(ct as SectionBodyUnit['level'])) continue;
    if (ct === '#text') {
      const val = String(child['#text'] ?? '');
      if (val) nodes.push({ kind: 'text', value: val });
    } else if (ct === 'ref') {
      nodes.push({
        kind: 'ref',
        href: attrOf(child, '@_href') ?? '',
        value: textOf(childrenOf(child, 'ref')),
      });
    } else {
      // chapeau, content, or other wrapper — flatten its inline nodes into the unit.
      nodes.push(...inlineNodesOf(childrenOf(child, ct)));
    }
  }

  // Structural children.
  const structuralChildren: SectionBodyUnit[] = [];
  for (const child of children) {
    const ct = tagOf(child) as SectionBodyUnit['level'] | undefined;
    if (!ct || !STRUCTURAL_TAGS.has(ct) || ct === 'section') continue;
    structuralChildren.push(buildUnit(child, ct, id));
  }

  return { id, level, num, nodes, children: structuralChildren };
}

function emitSection(sec: OrderedNode, chapterNum: string): Section {
  const secChildren = childrenOf(sec, 'section');
  const numNode = secChildren.find((c) => tagOf(c) === 'num');
  const sectionNumber = numNode ? attrOf(numNode, '@_value') ?? '' : '';
  const headingNode = secChildren.find((c) => tagOf(c) === 'heading');
  const heading = headingNode ? textOf(childrenOf(headingNode, 'heading')).trim() : '';
  const body = buildUnit(sec, 'section', sectionNumber);
  return { sectionNumber, chapter: chapterNum, heading, body };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractSections(tree: any): Section[] {
  const rootTree: OrderedTree = tree as OrderedTree;
  const uscDoc = firstDescendant(rootTree, 'uscDoc');
  if (!uscDoc) return [];
  const uscDocChildren = childrenOf(uscDoc, 'uscDoc');
  const main = uscDocChildren.find((n) => tagOf(n) === 'main');
  if (!main) return [];
  const title = childrenOf(main, 'main').find((n) => tagOf(n) === 'title');
  if (!title) return [];
  const chapters = immediateChildren(childrenOf(title, 'title'), 'chapter');

  const sections: Section[] = [];
  for (const ch of chapters) {
    const chChildren = childrenOf(ch, 'chapter');
    const chNumNode = chChildren.find((c) => tagOf(c) === 'num');
    const chapterNum = chNumNode ? attrOf(chNumNode, '@_value') ?? '' : '';
    // Direct sections under the chapter.
    for (const sec of immediateChildren(chChildren, 'section')) {
      sections.push(emitSection(sec, chapterNum));
    }
    // Subchapter-flattened sections (v1: subchapter rolls up to chapter).
    for (const sub of immediateChildren(chChildren, 'subchapter')) {
      for (const sec of immediateChildren(childrenOf(sub, 'subchapter'), 'section')) {
        sections.push(emitSection(sec, chapterNum));
      }
    }
  }
  return sections;
}
