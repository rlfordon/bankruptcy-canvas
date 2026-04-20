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

export function resolveRef(href: string): ResolvedRef {
  const m = href.match(/^\/us\/usc\/t11\/s([0-9A-Za-z-]+)((?:\/[^/]+)*)$/);
  if (!m) return { kind: 'external', href };
  const out: ResolvedRef = { kind: 'internal', section: m[1]! };
  const rest = m[2]!.split('/').filter(Boolean);
  for (let i = 0; i < rest.length && i < LEVELS.length - 1; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out as any)[LEVELS[i + 1]!] = rest[i];
  }
  return out;
}
