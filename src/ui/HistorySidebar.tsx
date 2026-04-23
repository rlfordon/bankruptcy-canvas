import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSessionStore } from '@/state/sessionStore';

export default function HistorySidebar() {
  const history = useSessionStore((s) => s.history);
  const cards = useSessionStore((s) => s.cards);
  const [collapsed, setCollapsed] = useState(false);
  const rf = useReactFlow();

  const focus = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    // Approximate card center: card origin + roughly half the card's width/height.
    // Exact centering not required — a few dozen px off is fine.
    rf.setCenter(card.x + 260, card.y + 100, { zoom: 1, duration: 300 });
  };

  if (collapsed) {
    return (
      <div className="w-8 border-r bg-slate-50 flex items-start justify-center py-2">
        <button onClick={() => setCollapsed(false)} title="Show history">▸</button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-slate-50 flex flex-col">
      <div className="px-3 py-2 border-b flex items-center">
        <span className="font-semibold text-sm">History</span>
        <button className="ml-auto" onClick={() => setCollapsed(true)} title="Collapse">◂</button>
      </div>
      <ul className="flex-1 overflow-auto text-sm">
        {history.map((h, i) => {
          const card = cards.find((c) => c.id === h.cardId);
          const label = card?.kind === 'section' ? `§ ${card.sectionNumber}`
            : card?.kind === 'definition' ? `\u201c${card.term}\u201d`
            : card?.kind === 'picker' ? `? \u201c${card.term}\u201d`
            : '(deleted)';
          return (
            <li
              key={`${h.cardId}-${i}`}
              className="px-3 py-1 hover:bg-white cursor-pointer"
              onClick={() => focus(h.cardId)}
            >{label}</li>
          );
        })}
      </ul>
    </div>
  );
}
