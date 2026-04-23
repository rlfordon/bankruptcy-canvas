import { describe, it, expect } from 'vitest';
import lunr from 'lunr';
import { buildSearchIndex } from '../../scripts/build-data/buildSearchIndex';
import type { Section } from '../../scripts/build-data/extractSections';

const sec = (n: string, heading: string, bodyText: string): Section => ({
  sectionNumber: n,
  chapter: '5',
  heading,
  body: { id: n, level: 'section', num: '', nodes: [{ kind: 'text', value: bodyText }], children: [] },
});

describe('buildSearchIndex', () => {
  const sections = [
    sec('546', 'Limitations on avoiding powers', 'settlement payment safe harbor'),
    sec('547', 'Preferences', 'transfer of property of the debtor'),
  ];

  it('produces a lookup keyed by section number', () => {
    const { sectionLookup } = buildSearchIndex(sections);
    expect(sectionLookup['546']).toBe('Limitations on avoiding powers');
    expect(sectionLookup['547']).toBe('Preferences');
  });

  it('produces a serialized Lunr index that finds keywords', () => {
    const { lunrIndex } = buildSearchIndex(sections);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = lunr.Index.load(lunrIndex as any);
    const hits = idx.search('safe harbor');
    expect(hits[0]?.ref).toBe('546');
  });
});
