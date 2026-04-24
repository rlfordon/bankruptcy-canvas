import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TermMap } from '@/types/term';

const termsFixture: TermMap = {
  claim: {
    candidates: [
      {
        section: '101',
        subsection: '(5)',
        scope: 'title',
        definition: 'The term "claim" means a right to payment.',
      },
      {
        section: '741',
        subsection: '(5)',
        scope: 'chapter:7',
        definition: 'In this chapter, "claim" has a narrower meaning.',
      },
    ],
  },
  'settlement payment': {
    candidates: [
      {
        section: '741',
        subsection: '(8)',
        scope: 'chapter:7',
        definition: 'The term "settlement payment" means a preliminary settlement payment...',
      },
    ],
  },
};

vi.mock('@/data/loader', () => ({
  loadTerms: vi.fn(async () => termsFixture),
}));

import { spawnFromRef, spawnFromTerm } from '@/canvas/cardSpawning';
import { useSessionStore } from '@/state/sessionStore';
import type { SectionCard } from '@/types/session';

function resetStore() {
  useSessionStore.setState({
    version: 1,
    cards: [],
    edges: [],
    history: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  });
}

function seedSource(id: string, x: number, y: number): void {
  const src: SectionCard = {
    id,
    kind: 'section',
    sectionNumber: '546',
    x,
    y,
    pinned: false,
    collapsed: false,
    hideDefinitions: false,
  };
  useSessionStore.setState((s) => ({ ...s, cards: [src] }));
}

describe('cardSpawning — null sourceCardId', () => {
  beforeEach(() => resetStore());

  it('spawnFromRef(null, …) spawns at origin with no auto-edge', () => {
    spawnFromRef(null, '/us/usc/t11/s547');
    const { cards, edges, history } = useSessionStore.getState();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ kind: 'section', sectionNumber: '547', x: 0, y: 0 });
    expect(edges).toHaveLength(0);
    expect(history).toHaveLength(1);
  });

  it('spawnFromTerm(null, …) for a multi-candidate term spawns a picker at origin, no edge', async () => {
    await spawnFromTerm(null, 'claim');
    const { cards, edges } = useSessionStore.getState();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ kind: 'picker', term: 'claim', x: 0, y: 0 });
    expect(edges).toHaveLength(0);
  });

  it('spawnFromTerm(null, …) for a single-candidate term spawns a definition at origin, no edge', async () => {
    await spawnFromTerm(null, 'settlement payment');
    const { cards, edges } = useSessionStore.getState();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ kind: 'definition', term: 'settlement payment', x: 0, y: 0 });
    expect(edges).toHaveLength(0);
  });

  it('spawnFromRef(null, …) on a ref that already exists dedupes (no new card or edge)', () => {
    spawnFromRef(null, '/us/usc/t11/s547');
    spawnFromRef(null, '/us/usc/t11/s547');
    const { cards, edges, history } = useSessionStore.getState();
    expect(cards).toHaveLength(1);
    expect(edges).toHaveLength(0);
    expect(history).toHaveLength(2);
  });
});

describe('cardSpawning — with sourceCardId (regression)', () => {
  beforeEach(() => resetStore());

  it('spawnFromRef offsets from the source and creates an auto-edge', () => {
    seedSource('src', 100, 200);
    spawnFromRef('src', '/us/usc/t11/s547');
    const { cards, edges } = useSessionStore.getState();
    const spawned = cards.find((c) => c.id !== 'src')!;
    expect(spawned).toMatchObject({ kind: 'section', sectionNumber: '547' });
    expect(spawned.x).toBeGreaterThan(100);
    expect(spawned.y).toBeGreaterThan(200);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: 'src', target: spawned.id, kind: 'auto' });
  });
});
