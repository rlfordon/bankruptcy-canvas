import type { Card, Edge } from '@/types/session';

export function addCard(cards: Card[], card: Card): Card[] {
  if (cards.some((c) => c.id === card.id)) return cards;
  return [...cards, card];
}

export function removeCard(cards: Card[], id: string): Card[] {
  return cards.filter((c) => c.id !== id);
}

function patch(cards: Card[], id: string, patcher: (c: Card) => Card): Card[] {
  return cards.map((c) => (c.id === id ? patcher(c) : c));
}

export function togglePin(cards: Card[], id: string): Card[] {
  return patch(cards, id, (c) => ({ ...c, pinned: !c.pinned }));
}

export function toggleCollapsed(cards: Card[], id: string): Card[] {
  return patch(cards, id, (c) => ({ ...c, collapsed: !c.collapsed }));
}

export function toggleHideDefinitions(cards: Card[], id: string): Card[] {
  return patch(cards, id, (c) => ({ ...c, hideDefinitions: !c.hideDefinitions }));
}

export function moveCard(cards: Card[], id: string, x: number, y: number): Card[] {
  return patch(cards, id, (c) => ({ ...c, x, y }));
}

export function clearUnpinned(cards: Card[]): Card[] {
  return cards.filter((c) => c.pinned);
}

export function addEdge(edges: Edge[], edge: Edge): Edge[] {
  if (edges.some((e) => e.id === edge.id)) return edges;
  return [...edges, edge];
}

export function removeEdgesForCard(edges: Edge[], cardId: string): Edge[] {
  return edges.filter((e) => e.source !== cardId && e.target !== cardId);
}
