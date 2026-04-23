import { describe, it, expect } from 'vitest';
import lunr from 'lunr';
import { resolveQuery } from '../../src/data/search';

const sectionLookup = { '546': 'Limitations on avoiding powers', '547': 'Preferences' };

const lunrJson = lunr(function () {
  this.ref('sectionNumber');
  this.field('heading');
  this.field('body');
  this.add({ sectionNumber: '546', heading: 'Limitations on avoiding powers', body: 'settlement payment safe harbor' });
  this.add({ sectionNumber: '547', heading: 'Preferences', body: 'transfer of property' });
}).toJSON();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const index = lunr.Index.load(lunrJson as any);

describe('resolveQuery', () => {
  it('returns an exact section hit for "546(e)"', () => {
    const results = resolveQuery('546(e)', { sectionLookup, index });
    expect(results[0]).toEqual({ kind: 'section', sectionNumber: '546', heading: 'Limitations on avoiding powers' });
  });

  it('returns an exact section hit for "546"', () => {
    const results = resolveQuery('546', { sectionLookup, index });
    expect(results[0]).toEqual({ kind: 'section', sectionNumber: '546', heading: 'Limitations on avoiding powers' });
  });

  it('falls back to Lunr for keyword queries', () => {
    const results = resolveQuery('safe harbor', { sectionLookup, index });
    expect(results[0]!.kind).toBe('keyword');
    expect(results[0]!.sectionNumber).toBe('546');
  });

  it('returns an empty array for unknown keywords', () => {
    const results = resolveQuery('xyznomatch', { sectionLookup, index });
    expect(results).toEqual([]);
  });
});
