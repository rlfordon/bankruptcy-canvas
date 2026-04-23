// scripts/build-data/uscTree.ts

export type OrderedNode = Record<string, unknown>;
export type OrderedTree = OrderedNode[];

const ATTR_KEY = ':@';

/** Get the tag name of a node (the one non-':@' key). Returns undefined for text-only or malformed nodes. */
export function tagOf(node: OrderedNode): string | undefined {
  for (const key of Object.keys(node)) {
    if (key !== ATTR_KEY) return key;
  }
  return undefined;
}

/** Get the children array of a node given you know its tag. */
export function childrenOf(node: OrderedNode, tag: string): OrderedTree {
  const v = node[tag];
  return Array.isArray(v) ? (v as OrderedTree) : [];
}

/** Get a specific attribute value (fast-xml-parser prefixes attrs with @_). */
export function attrOf(node: OrderedNode, attr: string): string | undefined {
  const attrs = node[ATTR_KEY] as Record<string, string> | undefined;
  return attrs?.[attr];
}

/** Get the first descendant matching `tag` at any depth. */
export function firstDescendant(tree: OrderedTree, tag: string): OrderedNode | undefined {
  for (const n of tree) {
    const t = tagOf(n);
    if (t === tag) return n;
    if (t) {
      const hit = firstDescendant(childrenOf(n, t), tag);
      if (hit) return hit;
    }
  }
  return undefined;
}

/** Collect all immediate children with a given tag. */
export function immediateChildren(tree: OrderedTree, tag: string): OrderedNode[] {
  return tree.filter((n) => tagOf(n) === tag);
}

/** Flatten an element (or tree) to a single text string, preserving source order. */
export function textOf(elOrTree: OrderedNode | OrderedTree | unknown): string {
  if (elOrTree == null) return '';
  if (typeof elOrTree === 'string') return elOrTree;
  if (Array.isArray(elOrTree)) return elOrTree.map((x) => textOf(x)).join('');
  if (typeof elOrTree !== 'object') return String(elOrTree);
  const node = elOrTree as OrderedNode;
  const tag = tagOf(node);
  if (!tag) return '';
  if (tag === '#text') return String(node['#text'] ?? '');
  return textOf(childrenOf(node, tag));
}
