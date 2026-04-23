import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUscXml } from './parseXml';
import { extractSections } from './extractSections';
import { extractTerms } from './extractTerms';
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

  const { lunrIndex, sectionLookup } = buildSearchIndex(sections);
  console.log(`Built Lunr index; section-lookup keys: ${Object.keys(sectionLookup).length}`);

  emitArtifacts(OUT, sections, terms, lunrIndex, sectionLookup);
  console.log(`Wrote artifacts to ${OUT}`);
}

main();
