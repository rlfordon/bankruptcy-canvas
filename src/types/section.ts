export type SectionNode =
  | { kind: 'text'; value: string }
  | { kind: 'ref'; href: string; value: string }
  | { kind: 'term'; term: string; value: string };

export interface SectionBodyUnit {
  id: string;
  level: 'section' | 'subsection' | 'paragraph' | 'subparagraph' | 'clause' | 'subclause';
  num: string;
  nodes: SectionNode[];
  children: SectionBodyUnit[];
}

export interface Section {
  sectionNumber: string;
  chapter: string;
  heading: string;
  body: SectionBodyUnit;
}
