import lunr from 'lunr';

export type SearchResult =
  | { kind: 'section'; sectionNumber: string; heading: string }
  | { kind: 'keyword'; sectionNumber: string; heading: string; score: number };

export interface SearchDeps {
  sectionLookup: Record<string, string>;
  index: lunr.Index;
}

const SECTION_NUMBER_RE = /^\s*(\d{1,4})(?:\([a-z0-9]+\))*\s*$/i;

export function resolveQuery(q: string, deps: SearchDeps): SearchResult[] {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const m = trimmed.match(SECTION_NUMBER_RE);
  if (m) {
    const num = m[1]!;
    const heading = deps.sectionLookup[num];
    if (heading) return [{ kind: 'section', sectionNumber: num, heading }];
    return [];
  }
  try {
    const hits = deps.index.search(trimmed);
    return hits
      .map((h) => {
        const heading = deps.sectionLookup[h.ref];
        if (!heading) return null;
        return { kind: 'keyword' as const, sectionNumber: h.ref, heading, score: h.score };
      })
      .filter((x): x is Exclude<typeof x, null> => x !== null);
  } catch {
    return [];
  }
}
