import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { loadTerms } from '@/data/loader';
import { useSessionStore } from '@/state/sessionStore';
import { removeCard, togglePin } from '@/state/cardOps';
import type { DefinitionCard as DefCardT } from '@/types/session';
import type { TermCandidate } from '@/types/term';

export default function DefinitionCardNode({ data }: NodeProps) {
  const cardId = (data as { cardId: string }).cardId;
  const card = useSessionStore((s) => s.cards.find((c) => c.id === cardId)) as DefCardT | undefined;
  const setCards = useSessionStore((s) => s.setCards);
  const setEdges = useSessionStore((s) => s.setEdges);
  const [candidate, setCandidate] = useState<TermCandidate | null>(null);

  useEffect(() => {
    if (!card) { setCandidate(null); return; }
    let cancelled = false;
    loadTerms().then((terms) => {
      if (cancelled) return;
      const entry = terms[card.term];
      setCandidate(entry?.candidates[card.candidateIndex] ?? null);
    });
    return () => { cancelled = true; };
  }, [card?.term, card?.candidateIndex]);

  if (!card || !candidate) return null;

  const chapterBadge = candidate.scope.startsWith('chapter:')
    ? `Chapter ${candidate.scope.slice('chapter:'.length)} only`
    : null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded shadow w-[340px] text-sm">
      <Handle type="target" position={Position.Top} />
      <div className="px-3 py-2 border-b border-amber-200 flex items-center gap-2">
        <span className="font-semibold">&ldquo;{card.term}&rdquo;</span>
        <span className="text-slate-600 text-xs">§ {candidate.section}{candidate.subsection}</span>
        {chapterBadge && (
          <span className="ml-auto text-xs px-1 rounded bg-amber-200">{chapterBadge}</span>
        )}
        <button
          className={chapterBadge ? 'text-xs' : 'ml-auto text-xs'}
          onClick={() => setCards((cs) => togglePin(cs, card.id))}
        >{card.pinned ? '📌' : '📍'}</button>
        <button
          className="text-xs"
          onClick={() => {
            setCards((cs) => removeCard(cs, card.id));
            setEdges((es) => es.filter((e) => e.source !== card.id && e.target !== card.id));
          }}
        >×</button>
      </div>
      <div className="px-3 py-2">{candidate.definition}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
