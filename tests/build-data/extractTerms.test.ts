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

  it('skips Definitions-headed sections whose chapeau names no scope', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<uscDoc xmlns="http://xml.house.gov/schemas/uslm/1.0" identifier="/us/usc/t11">
  <main><title identifier="/us/usc/t11"><num value="11">Title 11</num><heading>BANKRUPTCY</heading>
    <chapter identifier="/us/usc/t11/ch5"><num value="5">5</num><heading>Creditors</heading>
      <section identifier="/us/usc/t11/s999"><num value="999">§ 999</num><heading>Definitions</heading>
        <chapeau>As used herein—</chapeau>
        <paragraph identifier="/us/usc/t11/s999/1"><num value="1">(1)</num><content>"foo" means bar.</content></paragraph>
      </section>
    </chapter>
  </title></main>
</uscDoc>`;
    const terms = extractTerms(parseUscXml(xml));
    expect(Object.keys(terms)).toHaveLength(0);
  });
});

describe('extractTerms — chapter-scoped', () => {
  it('assigns chapter:N scope when chapeau says "In this subchapter"', () => {
    const terms = extractTerms(parseUscXml(fixture('chapter-scoped-terms.xml')));
    expect(terms['settlement payment']!.candidates[0]).toEqual({
      section: '741',
      subsection: '(8)',
      scope: 'chapter:7',
      definition: 'a preliminary settlement payment.',
    });
  });
});
