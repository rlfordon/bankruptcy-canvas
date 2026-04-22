export type ResolvedRef =
  | {
      kind: 'internal';
      section: string;
      subsection?: string;
      paragraph?: string;
      subparagraph?: string;
      clause?: string;
      subclause?: string;
    }
  | { kind: 'external'; href: string };

const LEVELS = ['section', 'subsection', 'paragraph', 'subparagraph', 'clause', 'subclause'] as const;
type SubLevel = Exclude<(typeof LEVELS)[number], 'section'>;

export function resolveRef(href: string): ResolvedRef {
  // Matches /us/usc/t11/s<NUM>[/<sub>/<para>/<subpara>/<clause>/<subclause>].
  // Only Title 11 section hrefs are considered internal; chapter refs
  // (e.g., /us/usc/t11/ch1) and other-title refs return external so callers
  // treat them as non-clickable text (see Task 29).
  const m = href.match(/^\/us\/usc\/t11\/s([0-9A-Za-z-]+)((?:\/[^/]+)*)$/);
  if (!m) return { kind: 'external', href };
  const out: Extract<ResolvedRef, { kind: 'internal' }> = { kind: 'internal', section: m[1]! };
  const rest = m[2]!.split('/').filter(Boolean);
  // Loop caps at LEVELS.length - 1 so LEVELS[i + 1] indexes 'subsection'..'subclause'.
  // A 5-segment trailing path (subsection→subclause) fully populates the union.
  for (let i = 0; i < rest.length && i < LEVELS.length - 1; i++) {
    out[LEVELS[i + 1] as SubLevel] = rest[i];
  }
  return out;
}
