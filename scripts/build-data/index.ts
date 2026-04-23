import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUscXml } from './parseXml';
import { extractSections } from './extractSections';
import { extractTerms, tagTermUsage } from './extractTerms';
import { buildSearchIndex } from './buildSearchIndex';
import { emitArtifacts } from './emit';

const ROOT = process.cwd();
const INPUT = join(ROOT, 'usc11.xml');
const OUT = join(ROOT, 'public', 'data');

function main(): void {
  console.log(`Reading ${INPUT}`);
  const xml = readFileSync(INPUT, 'utf8');
  const tree = parseUscXml(xml);

  const sections = extractSections(tree);
  console.log(`Extracted ${sections.length} sections`);

  const terms = extractTerms(tree);
  console.log(`Extracted ${Object.keys(terms).length} defined terms`);

  const taggedSections = tagTermUsage(sections, Object.keys(terms));
  console.log(`Tagged defined-term usage in ${taggedSections.length} sections`);

  const { lunrIndex, sectionLookup } = buildSearchIndex(taggedSections);
  console.log(`Built Lunr index; section-lookup keys: ${Object.keys(sectionLookup).length}`);

  emitArtifacts(OUT, taggedSections, terms, lunrIndex, sectionLookup);
  console.log(`Wrote artifacts to ${OUT}`);
}

main();
