import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { loadSection } from '@/data/loader';
import { useSessionStore } from '@/state/sessionStore';
import { removeCard, togglePin, toggleCollapsed, toggleHideDefinitions } from '@/state/cardOps';
import type { Section } from '@/types/section';
import type { SectionCard as SectionCardT } from '@/types/session';
import InlineMarkup from './InlineMarkup';
import { spawnFromRef, spawnFromTerm } from './cardSpawning';

export default function SectionCardNode({ data }: NodeProps) {
  const cardId = (data as { cardId: string }).cardId;
  const card = useSessionStore((s) => s.cards.find((c) => c.id === cardId)) as SectionCardT | undefined;
  const setCards = useSessionStore((s) => s.setCards);
  const setEdges = useSessionStore((s) => s.setEdges);
  const [section, setSection] = useState<Section | null>(null);

  useEffect(() => {
    if (!card) { setSection(null); return; }
    let cancelled = false;
    loadSection(card.sectionNumber)
      .then((s) => { if (!cancelled) setSection(s); })
      .catch(() => { if (!cancelled) setSection(null); });
    return () => { cancelled = true; };
  }, [card?.sectionNumber]);

  if (!card) return null;

  return (
    <div className="bg-white border border-slate-300 rounded shadow-md w-[520px] text-sm">
      <Handle type="target" position={Position.Top} />
      <div className="px-3 py-2 border-b flex items-center gap-2 bg-slate-50">
        <span className="font-semibold">§ {card.sectionNumber}</span>
        <span className="text-slate-600 truncate">{section?.heading}</span>
        <div className="ml-auto flex gap-1 text-xs">
          <button onClick={() => setCards((cs) => toggleCollapsed(cs, card.id))}>{card.collapsed ? '▸' : '▾'}</button>
          <button onClick={() => setCards((cs) => togglePin(cs, card.id))} aria-pressed={card.pinned}>{card.pinned ? '📌' : '📍'}</button>
          <button onClick={() => setCards((cs) => toggleHideDefinitions(cs, card.id))}>{card.hideDefinitions ? 'show defs' : 'hide defs'}</button>
          <button
            className="text-xs"
            title="Spawn every ref and defined term from this section"
            onClick={() => {
              void import('./expandAll').then((m) => m.expandAll(card.id, card.sectionNumber));
            }}
          >expand all</button>
          <button
            onClick={() => {
              setCards((cs) => removeCard(cs, card.id));
              setEdges((es) => es.filter((e) => e.source !== card.id && e.target !== card.id));
            }}
          >×</button>
        </div>
      </div>
      {!card.collapsed && section && (
        <div className="px-3 py-2 max-h-[480px] overflow-auto">
          <InlineMarkup
            unit={section.body}
            onRefClick={(href) => spawnFromRef(card.id, href)}
            onTermClick={(term) => spawnFromTerm(card.id, term)}
            hideDefinitions={card.hideDefinitions}
          />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
