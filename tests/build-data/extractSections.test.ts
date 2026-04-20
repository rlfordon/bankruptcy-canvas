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
    const subA = s546.body.children[0]!;
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
