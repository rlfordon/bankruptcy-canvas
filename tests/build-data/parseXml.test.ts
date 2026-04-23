import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUscXml } from '../../scripts/build-data/parseXml';
import { firstDescendant, attrOf, childrenOf, tagOf } from '../../scripts/build-data/uscTree';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('parseUscXml (preserveOrder:true)', () => {
  it('returns an ordered tree rooted at uscDoc', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    const uscDoc = firstDescendant(tree, 'uscDoc')!;
    expect(uscDoc).toBeDefined();
    expect(attrOf(uscDoc, '@_identifier')).toBe('/us/usc/t11');
  });

  it('preserves <ref href> attributes inside mixed content', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    const ref = firstDescendant(tree, 'ref')!;
    expect(attrOf(ref, '@_href')).toBe('/us/usc/t11/s547');
  });

  it('preserves whitespace around inline elements (trimValues:false)', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    // Walk to §546's subsection (a)'s content and confirm it has "An action under "
    // then <ref> then " may be commenced." in that order. Need to navigate
    // specifically to §546 because the fixture has other <content> elements
    // (e.g., §101(1)) that lack refs.
    const subsection = firstDescendant(tree, 'subsection')!;
    const content = childrenOf(subsection, 'subsection').find((n) => tagOf(n) === 'content')!;
    const contentChildren = childrenOf(content, 'content');
    // Expect 3 children in order: text, ref, text.
    const kinds = contentChildren.map((n) => tagOf(n));
    expect(kinds).toEqual(['#text', 'ref', '#text']);
    // First text must contain "An action under "
    expect(String(contentChildren[0]!['#text'])).toContain('An action under');
    // Last text must contain " may be commenced."
    expect(String(contentChildren[2]!['#text'])).toContain('may be commenced');
  });

  it('preserves namespace-prefixed element names (e.g., dc:title)', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    const dcTitle = firstDescendant(tree, 'dc:title')!;
    expect(dcTitle).toBeDefined();
    const firstText = childrenOf(dcTitle, 'dc:title')[0];
    expect(String(firstText?.['#text'])).toBe('Title 11');
  });

  it('parses every <section> at its expected location', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    // Find all <section> nodes anywhere
    const sections: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (nodes: any[]): void => {
      for (const n of nodes) {
        const t = tagOf(n);
        if (!t) continue;
        if (t === 'section') {
          sections.push(attrOf(n, '@_identifier') ?? '');
        } else {
          walk(childrenOf(n, t));
        }
      }
    };
    walk(tree);
    expect(sections.sort()).toEqual(['/us/usc/t11/s101', '/us/usc/t11/s546']);
  });
});
