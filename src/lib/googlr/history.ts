import type { HistoryEntry } from './types';

const STORAGE_KEY = 'googlr_history';
const MAX_ENTRIES = 10;
const EMPTY: HistoryEntry[] = [];

/* ------------------------------------------------------------------ */
/* Tiny external store around localStorage so React can subscribe via  */
/* useSyncExternalStore (no setState-in-effect needed).                */
/* ------------------------------------------------------------------ */

let snapshot: HistoryEntry[] | null = null;
const listeners = new Set<() => void>();

function readHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter(
        (e): e is HistoryEntry =>
          e &&
          typeof e === 'object' &&
          typeof e.id === 'number' &&
          typeof e.thumbnailDataUrl === 'string' &&
          e.result &&
          typeof e.bestGuess === 'string'
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return EMPTY;
  }
}

function notify(): void {
  snapshot = readHistory();
  for (const listener of listeners) listener();
}

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getHistorySnapshot(): HistoryEntry[] {
  if (snapshot === null) snapshot = readHistory();
  return snapshot;
}

export function getServerHistorySnapshot(): HistoryEntry[] {
  return EMPTY;
}

/** Direct read (for imperative refreshes outside React). */
export function getHistory(): HistoryEntry[] {
  return getHistorySnapshot();
}

/** Prepend an entry, keep only the last 10, and notify subscribers. */
export function saveHistory(entry: HistoryEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const history = [entry, ...readHistory()].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    notify();
  } catch {
    // Storage full or blocked — history is a nice-to-have, never break search.
  }
}
