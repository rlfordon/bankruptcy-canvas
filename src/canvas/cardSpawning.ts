import { nanoid } from 'nanoid';
import { addCard, addEdge } from '@/state/cardOps';
import { useSessionStore } from '@/state/sessionStore';
import { loadTerms } from '@/data/loader';
import { resolveRef } from '../../scripts/build-data/resolveRef';
import type { Card, DefinitionCard, Edge, PickerCard, SectionCard } from '@/types/session';

const OFFSET_X = 560;
const OFFSET_Y = 60;

function sourceOrigin(sourceId: string | null): { x: number; y: number } {
  if (sourceId === null) return { x: 0, y: 0 };
  const src = useSessionStore.getState().cards.find((c) => c.id === sourceId);
  return src ? { x: src.x + OFFSET_X, y: src.y + OFFSET_Y } : { x: 0, y: 0 };
}

function pushHistory(cardId: string): void {
  useSessionStore.getState().pushHistory({ cardId, openedAt: Date.now() });
}

function spawn(card: Card, sourceId: string | null): void {
  useSessionStore.getState().setCards((cs) => addCard(cs, card));
  if (sourceId !== null) {
    const edge: Edge = { id: nanoid(), source: sourceId, target: card.id, kind: 'auto' };
    useSessionStore.getState().setEdges((es) => addEdge(es, edge));
  }
  pushHistory(card.id);
}

export function spawnFromRef(sourceCardId: string | null, href: string): void {
  const resolved = resolveRef(href);
  if (resolved.kind === 'external') return; // external refs are rendered non-clickable
  const existing = useSessionStore.getState().cards.find(
    (c): c is SectionCard => c.kind === 'section' && c.sectionNumber === resolved.section,
  );
  if (existing) {
    pushHistory(existing.id);
    return;
  }
  const pos = sourceOrigin(sourceCardId);
  const card: SectionCard = {
    id: nanoid(),
    kind: 'section',
    sectionNumber: resolved.section,
    x: pos.x,
    y: pos.y,
    pinned: false,
    collapsed: false,
    hideDefinitions: false,
  };
  spawn(card, sourceCardId);
}

export async function spawnFromTerm(sourceCardId: string | null, term: string): Promise<void> {
  const terms = await loadTerms();
  const entry = terms[term];
  if (!entry) return;
  const pos = sourceOrigin(sourceCardId);

  if (entry.candidates.length > 1) {
    const pick: PickerCard = {
      id: nanoid(),
      kind: 'picker',
      term,
      x: pos.x,
      y: pos.y,
      pinned: false,
      collapsed: false,
      hideDefinitions: false,
    };
    spawn(pick, sourceCardId);
    return;
  }

  const existing = useSessionStore.getState().cards.find(
    (c): c is DefinitionCard => c.kind === 'definition' && c.term === term,
  );
  if (existing) {
    pushHistory(existing.id);
    return;
  }
  const def: DefinitionCard = {
    id: nanoid(),
    kind: 'definition',
    term,
    candidateIndex: 0,
    x: pos.x,
    y: pos.y,
    pinned: false,
    collapsed: false,
    hideDefinitions: false,
  };
  spawn(def, sourceCardId);
}
