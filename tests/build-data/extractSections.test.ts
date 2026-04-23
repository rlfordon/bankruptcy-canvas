import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUscXml } from '../../scripts/build-data/parseXml';
import { extractSections } from '../../scripts/build-data/extractSections';
import type { SectionNode } from '../../scripts/build-data/extractSections';

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

  it('recurses through three levels of hierarchy and builds dotted ids', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<uscDoc xmlns="http://xml.house.gov/schemas/uslm/1.0" identifier="/us/usc/t11">
  <main><title identifier="/us/usc/t11"><num value="11">Title 11</num><heading>BANKRUPTCY</heading>
    <chapter identifier="/us/usc/t11/ch5"><num value="5">5</num><heading>Creditors</heading>
      <section identifier="/us/usc/t11/s547"><num value="547">§ 547</num><heading>Preferences</heading>
        <subsection identifier="/us/usc/t11/s547/a"><num value="a">(a)</num>
          <paragraph identifier="/us/usc/t11/s547/a/1"><num value="1">(1)</num>
            <subparagraph identifier="/us/usc/t11/s547/a/1/A"><num value="A">(A)</num><content>leaf</content></subparagraph>
          </paragraph>
        </subsection>
      </section>
    </chapter>
  </title></main>
</uscDoc>`;
    const sections = extractSections(parseUscXml(xml));
    const s547 = sections.find((s) => s.sectionNumber === '547')!;
    // Section body id equals the section number — not '547(547)'.
    expect(s547.body.id).toBe('547');
    expect(s547.body.num).toBe('');
    const subA = s547.body.children[0]!;
    const para1 = subA.children[0]!;
    const subparaA = para1.children[0]!;
    expect(subA.id).toBe('547(a)');
    expect(para1.id).toBe('547(a)(1)');
    expect(subparaA.id).toBe('547(a)(1)(A)');
    expect(subparaA.level).toBe('subparagraph');
    expect(subparaA.nodes[0]).toEqual({ kind: 'text', value: 'leaf' });
  });

  it('preserves source order when a subsection has refs interspersed with text', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<uscDoc xmlns="http://xml.house.gov/schemas/uslm/1.0" identifier="/us/usc/t11">
  <main><title identifier="/us/usc/t11"><num value="11">Title 11</num><heading>BANKRUPTCY</heading>
    <chapter identifier="/us/usc/t11/ch5"><num value="5">5</num><heading>Creditors</heading>
      <section identifier="/us/usc/t11/s549"><num value="549">§ 549</num><heading>Postpetition</heading>
        <subsection identifier="/us/usc/t11/s549/a"><num value="a">(a)</num><content>An action under <ref href="/us/usc/t11/s547">section 547</ref> or <ref href="/us/usc/t11/s548">section 548</ref> may be commenced.</content></subsection>
      </section>
    </chapter>
  </title></main>
</uscDoc>`;
    const sections = extractSections(parseUscXml(xml));
    const s549 = sections.find((s) => s.sectionNumber === '549')!;
    const subA = s549.body.children[0]!;
    const kinds = subA.nodes.map((n) => n.kind);
    expect(kinds).toEqual(['text', 'ref', 'text', 'ref', 'text']);
    const texts = subA.nodes
      .filter((n): n is Extract<SectionNode, { kind: 'text' }> => n.kind === 'text')
      .map((n) => n.value);
    expect(texts[0]).toContain('An action under');
    expect(texts[1]).toContain(' or ');
    expect(texts[2]).toContain('may be commenced');
  });
});
