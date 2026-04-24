import { spawnFromRef, spawnFromTerm } from '@/canvas/cardSpawning';

export default function EmptyState() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="pointer-events-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Bankruptcy Canvas</h1>
        <p className="mt-2 text-slate-700">
          Pull sections of Title 11 onto a canvas. Click cross-references to follow them;
          click defined terms to see definitions inline.
        </p>
        <p className="mt-4 text-sm text-slate-600">
          Start by searching above — try{' '}
          <button
            type="button"
            onClick={() => spawnFromRef(null, '/us/usc/t11/s547')}
            className="rounded bg-slate-100 px-2 py-0.5 font-mono text-refLink hover:bg-slate-200"
          >
            547
          </button>
          {' '}or{' '}
          <button
            type="button"
            onClick={() => { void spawnFromTerm(null, 'claim'); }}
            className="rounded bg-slate-100 px-2 py-0.5 text-termLink hover:bg-slate-200"
          >
            claim
          </button>
          .
        </p>
      </div>
    </div>
  );
}
