export interface TermCandidate {
  section: string;
  subsection: string;
  scope: 'title' | `chapter:${string}`;
  definition: string;
}

export interface TermEntry { candidates: TermCandidate[]; }

export type TermMap = Record<string, TermEntry>;
