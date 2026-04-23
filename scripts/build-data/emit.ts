import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Section } from './extractSections';
import type { TermMap } from './extractTerms';

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
}

export function emitArtifacts(
  outDir: string,
  sections: Section[],
  terms: TermMap,
  lunrIndex: object,
  sectionLookup: Record<string, string>,
): void {
  for (const s of sections) {
    writeJson(join(outDir, 'sections', `s${s.sectionNumber}.json`), s);
  }
  writeJson(join(outDir, 'terms.json'), terms);
  writeJson(join(outDir, 'search-index.json'), lunrIndex);
  writeJson(join(outDir, 'section-lookup.json'), sectionLookup);
}
