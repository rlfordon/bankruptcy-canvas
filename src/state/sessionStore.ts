import { create } from 'zustand';
import type { Card, Edge, HistoryItem, Session } from '@/types/session';

interface SessionState extends Session {
  setAll: (next: Session) => void;
  setViewport: (v: Session['viewport']) => void;
  setCards: (updater: (cards: Card[]) => Card[]) => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  pushHistory: (item: HistoryItem) => void;
}

const EMPTY: Session = {
  version: 1,
  cards: [],
  edges: [],
  history: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const useSessionStore = create<SessionState>((set) => ({
  ...EMPTY,
  setAll: (next) => set(next),
  setViewport: (viewport) => set({ viewport }),
  setCards: (updater) => set((s) => ({ cards: updater(s.cards) })),
  setEdges: (updater) => set((s) => ({ edges: updater(s.edges) })),
  pushHistory: (item) => set((s) => ({ history: [item, ...s.history] })),
}));

export function snapshotSession(state: SessionState): Session {
  const { version, cards, edges, history, viewport } = state;
  return { version, cards, edges, history, viewport };
}
