import { useRef } from 'react';
import { useSessionStore, snapshotSession } from '@/state/sessionStore';
import { clearUnpinned } from '@/state/cardOps';
import { exportSession, importSession } from '@/state/persistence';

export default function SessionControls() {
  const fileInput = useRef<HTMLInputElement>(null);

  const onNew = () => {
    // "New session" clears the canvas but keeps pinned cards per spec §4.3.
    const store = useSessionStore.getState();
    store.setCards((cs) => clearUnpinned(cs));
    store.setEdges(() => []);
  };

  const onExport = () => {
    const state = useSessionStore.getState();
    const url = exportSession(snapshotSession(state));
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onPickFile = () => fileInput.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = importSession(text);
      useSessionStore.getState().setAll(parsed);
    } catch (err) {
      alert(`Could not import session: ${(err as Error).message}`);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="flex gap-2 text-sm">
      <button className="px-2 py-1 border rounded" onClick={onNew}>New</button>
      <button className="px-2 py-1 border rounded" onClick={onExport}>Export</button>
      <button className="px-2 py-1 border rounded" onClick={onPickFile}>Import</button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        hidden
        onChange={onFileChange}
      />
    </div>
  );
}
