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
});
