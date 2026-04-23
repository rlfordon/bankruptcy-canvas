import { describe, it, expect, beforeEach } from 'vitest';
import {
  SESSION_STORAGE_KEY, loadFromStorage, saveToStorage,
  exportSession, importSession, validateSession,
} from '../../src/state/persistence';
import type { Session } from '../../src/types/session';

const validSession: Session = {
  version: 1, cards: [], edges: [], history: [], viewport: { x: 0, y: 0, zoom: 1 },
};

describe('persistence', () => {
  beforeEach(() => { localStorage.clear(); });

  it('saveToStorage then loadFromStorage round-trips', () => {
    saveToStorage(validSession);
    expect(loadFromStorage()).toEqual(validSession);
  });

  it('loadFromStorage returns null when empty', () => {
    expect(loadFromStorage()).toBeNull();
  });

  it('loadFromStorage returns null when stored JSON is corrupt', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{not json');
    expect(loadFromStorage()).toBeNull();
  });

  it('loadFromStorage returns null when schema does not validate', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: 2 }));
    expect(loadFromStorage()).toBeNull();
  });

  it('exportSession produces a JSON blob URL', () => {
    const url = exportSession(validSession);
    expect(url).toMatch(/^blob:/);
    URL.revokeObjectURL(url);
  });

  it('importSession validates and returns a Session', () => {
    const parsed = importSession(JSON.stringify(validSession));
    expect(parsed).toEqual(validSession);
  });

  it('importSession throws on schema mismatch', () => {
    expect(() => importSession('{"version": 99}')).toThrow(/version/i);
  });

  it('validateSession rejects missing fields', () => {
    expect(validateSession({ version: 1, cards: [] })).toBe(false);
    expect(validateSession(validSession)).toBe(true);
  });
});
