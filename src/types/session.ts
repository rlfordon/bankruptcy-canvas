export type CardKind = 'section' | 'definition' | 'picker';

export interface CardBase {
  id: string;                    // uuid
  kind: CardKind;
  x: number;
  y: number;
  pinned: boolean;
  collapsed: boolean;
  hideDefinitions: boolean;      // per-card toggle
}

export interface SectionCard extends CardBase {
  kind: 'section';
  sectionNumber: string;
}

export interface DefinitionCard extends CardBase {
  kind: 'definition';
  term: string;                  // lowercased
  candidateIndex: number;        // which candidate in TermMap was chosen
}

export interface PickerCard extends CardBase {
  kind: 'picker';
  term: string;
}

export type Card = SectionCard | DefinitionCard | PickerCard;

export interface Edge {
  id: string;
  source: string;                // card id
  target: string;                // card id
  kind: 'auto' | 'manual';
  label?: string;
}

export interface HistoryItem {
  cardId: string;
  openedAt: number;              // epoch ms
}

export interface Session {
  version: 1;
  cards: Card[];
  edges: Edge[];
  history: HistoryItem[];
  viewport: { x: number; y: number; zoom: number };
}
