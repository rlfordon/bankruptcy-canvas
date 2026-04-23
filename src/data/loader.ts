import type { Section } from '@/types/section';
import type { TermMap } from '@/types/term';

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data`;

const sectionCache = new Map<string, Promise<Section>>();
let termsPromise: Promise<TermMap> | null = null;
let sectionLookupPromise: Promise<Record<string, string>> | null = null;
let searchIndexPromise: Promise<object> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function loadSection(sectionNumber: string): Promise<Section> {
  const existing = sectionCache.get(sectionNumber);
  if (existing) return existing;
  const p = fetchJson<Section>(`${BASE}/sections/s${sectionNumber}.json`);
  sectionCache.set(sectionNumber, p);
  return p;
}

export function loadTerms(): Promise<TermMap> {
  termsPromise ??= fetchJson<TermMap>(`${BASE}/terms.json`);
  return termsPromise;
}

export function loadSectionLookup(): Promise<Record<string, string>> {
  sectionLookupPromise ??= fetchJson<Record<string, string>>(`${BASE}/section-lookup.json`);
  return sectionLookupPromise;
}

export function loadSearchIndex(): Promise<object> {
  searchIndexPromise ??= fetchJson<object>(`${BASE}/search-index.json`);
  return searchIndexPromise;
}
