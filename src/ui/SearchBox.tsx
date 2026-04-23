import { useEffect, useState } from 'react';
import lunr from 'lunr';
import { nanoid } from 'nanoid';
import { loadSearchIndex, loadSectionLookup } from '@/data/loader';
import { resolveQuery, type SearchResult } from '@/data/search';
import { useSessionStore } from '@/state/sessionStore';
import { addCard } from '@/state/cardOps';
import type { SectionCard } from '@/types/session';

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [index, setIndex] = useState<lunr.Index | null>(null);
  const [lookup, setLookup] = useState<Record<string, string>>({});
  const setCards = useSessionStore((s) => s.setCards);
  const pushHistory = useSessionStore((s) => s.pushHistory);

  useEffect(() => {
    Promise.all([loadSearchIndex(), loadSectionLookup()]).then(([idxJson, l]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIndex(lunr.Index.load(idxJson as any));
      setLookup(l);
    });
  }, []);

  useEffect(() => {
    if (!index) return;
    setResults(resolveQuery(q, { sectionLookup: lookup, index }));
  }, [q, index, lookup]);

  const addSection = (n: string) => {
    const id = nanoid();
    const card: SectionCard = {
      id,
      kind: 'section',
      sectionNumber: n,
      x: 80,
      y: 80,
      pinned: false,
      collapsed: false,
      hideDefinitions: false,
    };
    setCards((cs) => addCard(cs, card));
    pushHistory({ cardId: id, openedAt: Date.now() });
    setQ('');
  };

  return (
    <div className="relative">
      <input
        className="px-2 py-1 border rounded w-96"
        placeholder="Search by section (e.g. 546(e)) or keyword"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q && results.length > 0 && (
        <ul className="absolute z-10 bg-white border rounded mt-1 w-96 max-h-64 overflow-auto shadow">
          {results.slice(0, 10).map((r) => (
            <li
              key={r.sectionNumber}
              className="px-2 py-1 hover:bg-slate-100 cursor-pointer"
              onClick={() => addSection(r.sectionNumber)}
            >
              <span className="font-medium">§ {r.sectionNumber}</span>{' '}
              <span className="text-slate-600">{r.heading}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
