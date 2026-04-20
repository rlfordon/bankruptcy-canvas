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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c['@_identifier'] === '/us/usc/t11/ch5',
    );
    const content = JSON.stringify(ch5.section);
    expect(content).toContain('/us/usc/t11/s547');
  });

  it('preserves whitespace between inline elements (trimValues: false)', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    // Real text: "An action under <ref>section 547</ref> may be commenced."
    // The leading space before "may" must survive to keep inline ordering in Task 5.
    const ch5 = tree.uscDoc.main.title.chapter.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c['@_identifier'] === '/us/usc/t11/ch5',
    );
    expect(JSON.stringify(ch5.section)).toContain(' may be commenced.');
  });

  it('forces REPEATING tags into arrays even when there is only one occurrence', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    const ch1 = tree.uscDoc.main.title.chapter.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c['@_identifier'] === '/us/usc/t11/ch1',
    );
    // ch1 has exactly one <section>, but 'section' is in REPEATING, so it must be an array.
    expect(Array.isArray(ch1.section)).toBe(true);
    expect(ch1.section).toHaveLength(1);
  });

  it('preserves namespace-prefixed element names (e.g., dc:title)', () => {
    const tree = parseUscXml(fixture('minimal.xml'));
    expect(tree.uscDoc.meta['dc:title']).toBe('Title 11');
  });
});
