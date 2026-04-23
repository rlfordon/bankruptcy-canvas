import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { loadTerms } from '@/data/loader';
import { useSessionStore } from '@/state/sessionStore';
import { removeCard } from '@/state/cardOps';
import type { PickerCard as PickerCardT, DefinitionCard } from '@/types/session';
import type { TermCandidate } from '@/types/term';

export default function PickerCardNode({ data }: NodeProps) {
  const cardId = (data as { cardId: string }).cardId;
  const card = useSessionStore((s) => s.cards.find((c) => c.id === cardId)) as PickerCardT | undefined;
  const setCards = useSessionStore((s) => s.setCards);
  const [candidates, setCandidates] = useState<TermCandidate[]>([]);

  useEffect(() => {
    if (!card) { setCandidates([]); return; }
    let cancelled = false;
    loadTerms().then((terms) => {
      if (cancelled) return;
      setCandidates(terms[card.term]?.candidates ?? []);
    });
    return () => { cancelled = true; };
  }, [card?.term]);

  if (!card) return null;

  const choose = (i: number) => {
    setCards((cs) => {
      const kept = cs.filter((c) => c.id !== card.id);
      const def: DefinitionCard = {
        id: card.id,           // reuse id so edges stay valid
        kind: 'definition',
        term: card.term,
        candidateIndex: i,
        x: card.x,
        y: card.y,
        pinned: card.pinned,
        collapsed: false,
        hideDefinitions: false,
      };
      return [...kept, def];
    });
  };

  return (
    <div className="bg-white border border-amber-500 rounded shadow w-[360px] text-sm">
      <Handle type="target" position={Position.Top} />
      <div className="px-3 py-2 border-b font-semibold">Pick a definition for &ldquo;{card.term}&rdquo;</div>
      <ul className="divide-y">
        {candidates.map((c, i) => (
          <li
            key={i}
            className="px-3 py-2 hover:bg-amber-50 cursor-pointer"
            onClick={() => choose(i)}
          >
            <div className="text-xs text-slate-600">
              § {c.section}{c.subsection} — {c.scope === 'title' ? 'Title-wide' : `Chapter ${c.scope.slice('chapter:'.length)}`}
            </div>
            <div>{c.definition}</div>
          </li>
        ))}
      </ul>
      <div className="px-3 py-2 text-right">
        <button className="text-xs text-slate-500" onClick={() => setCards((cs) => removeCard(cs, card.id))}>cancel</button>
      </div>
    </div>
  );
}
