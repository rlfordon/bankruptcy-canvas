import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUscXml } from '../../scripts/build-data/parseXml';
import { extractTerms } from '../../scripts/build-data/extractTerms';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('extractTerms — title-scoped', () => {
  it('extracts "The term X means Y" with title scope', () => {
    const terms = extractTerms(parseUscXml(fixture('title-scoped-terms.xml')));
    expect(terms.claim).toEqual({
      candidates: [{ section: '101', subsection: '(5)', scope: 'title', definition: 'right to payment.' }],
    });
  });

  it('also extracts bare-quote form "X" means Y', () => {
    const terms = extractTerms(parseUscXml(fixture('title-scoped-terms.xml')));
    expect(terms.creditor!.candidates[0]!.section).toBe('101');
    expect(terms.creditor!.candidates[0]!.scope).toBe('title');
  });

  it('normalizes curly quotes to straight quotes before matching', () => {
    const xml = fixture('title-scoped-terms.xml').replace(/"/g, '\u201c').replace(/"/g, '\u201d');
    const terms = extractTerms(parseUscXml(xml));
    expect(terms.claim).toBeDefined();
  });

  it('extracts chapeau-plus-subparagraph terms, joining parts with "; "', () => {
    const terms = extractTerms(parseUscXml(fixture('subparagraph-term.xml')));
    expect(terms.claim).toBeDefined();
    const cand = terms.claim!.candidates[0]!;
    expect(cand.section).toBe('101');
    expect(cand.subsection).toBe('(5)');
    expect(cand.scope).toBe('title');
    expect(cand.definition).toBe(
      'right to payment, whether or not such right is reduced to judgment; right to an equitable remedy for breach of performance',
    );
  });
});
