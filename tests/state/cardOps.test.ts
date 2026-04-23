import { describe, it, expect } from 'vitest';
import {
  addCard, removeCard, togglePin, toggleCollapsed, toggleHideDefinitions,
  moveCard, clearUnpinned, addEdge, removeEdgesForCard,
} from '../../src/state/cardOps';
import type { Card, Edge, SectionCard } from '../../src/types/session';

const makeSection = (id: string, n: string): SectionCard => ({
  id, kind: 'section', sectionNumber: n, x: 0, y: 0,
  pinned: false, collapsed: false, hideDefinitions: false,
});

describe('cardOps', () => {
  it('addCard appends', () => {
    const c = makeSection('a', '546');
    expect(addCard([], c)).toEqual([c]);
  });

  it('removeCard drops by id', () => {
    const a = makeSection('a', '546');
    const b = makeSection('b', '547');
    expect(removeCard([a, b], 'a')).toEqual([b]);
  });

  it('togglePin flips pinned', () => {
    const a = makeSection('a', '546');
    expect(togglePin([a], 'a')[0]!.pinned).toBe(true);
  });

  it('toggleCollapsed flips collapsed', () => {
    const a = makeSection('a', '546');
    expect(toggleCollapsed([a], 'a')[0]!.collapsed).toBe(true);
  });

  it('toggleHideDefinitions flips the flag', () => {
    const a = makeSection('a', '546');
    expect(toggleHideDefinitions([a], 'a')[0]!.hideDefinitions).toBe(true);
  });

  it('moveCard sets x/y', () => {
    const a = makeSection('a', '546');
    const [moved] = moveCard([a], 'a', 100, 200);
    expect(moved).toMatchObject({ x: 100, y: 200 });
  });

  it('clearUnpinned keeps only pinned cards', () => {
    const a: Card = { ...makeSection('a', '546'), pinned: true };
    const b: Card = makeSection('b', '547');
    expect(clearUnpinned([a, b])).toEqual([a]);
  });

  it('addEdge appends, removeEdgesForCard removes any edge touching id', () => {
    const e1: Edge = { id: 'e1', source: 'a', target: 'b', kind: 'auto' };
    const e2: Edge = { id: 'e2', source: 'b', target: 'c', kind: 'auto' };
    const with2 = addEdge([e1], e2);
    expect(with2).toHaveLength(2);
    expect(removeEdgesForCard(with2, 'b')).toEqual([]);
  });
});
