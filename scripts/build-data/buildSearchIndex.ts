import lunr from 'lunr';
import type { Section, SectionBodyUnit, SectionNode } from './extractSections';

function unitText(unit: SectionBodyUnit): string {
  const inline = unit.nodes.map((n: SectionNode) => ('value' in n ? n.value : '')).join('');
  const children = unit.children.map(unitText).join(' ');
  return `${inline} ${children}`;
}

export function buildSearchIndex(sections: Section[]): {
  lunrIndex: object;
  sectionLookup: Record<string, string>;
} {
  const sectionLookup: Record<string, string> = {};
  for (const s of sections) sectionLookup[s.sectionNumber] = s.heading;

  const lunrIndex = lunr(function () {
    this.ref('sectionNumber');
    this.field('heading', { boost: 3 });
    this.field('body');
    for (const s of sections) {
      this.add({ sectionNumber: s.sectionNumber, heading: s.heading, body: unitText(s.body) });
    }
  });

  return { lunrIndex: lunrIndex.toJSON(), sectionLookup };
}
