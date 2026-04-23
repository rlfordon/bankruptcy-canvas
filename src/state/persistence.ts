import type { Session } from '@/types/session';

export const SESSION_STORAGE_KEY = 'bankruptcy-canvas:session:v1';

export function validateSession(x: unknown): x is Session {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<Session>;
  if (s.version !== 1) return false;
  if (!Array.isArray(s.cards)) return false;
  if (!Array.isArray(s.edges)) return false;
  if (!Array.isArray(s.history)) return false;
  const v = s.viewport;
  if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.zoom !== 'number') return false;
  return true;
}

export function saveToStorage(session: Session): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadFromStorage(): Session | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return validateSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function exportSession(session: Session): string {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  return URL.createObjectURL(blob);
}

export function importSession(jsonText: string): Session {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Session JSON is not valid JSON: ${(e as Error).message}`);
  }
  if (!validateSession(parsed)) {
    throw new Error('Session JSON did not match expected schema (version, cards, edges, history, viewport).');
  }
  return parsed;
}

export function makeDebouncedSaver(delayMs = 500): (s: Session) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (session: Session) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => saveToStorage(session), delayMs);
  };
}
