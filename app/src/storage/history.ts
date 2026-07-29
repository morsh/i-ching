/**
 * history.ts — Cast history persistence
 *
 * WHAT IS STORED
 *   Each `SavedCast` record contains: the six cast lines (value, position, coins,
 *   polarity, changing flag), the primary hexagram reference (King Wen number +
 *   binary), the list of changing line positions, the transformed hexagram
 *   reference (if any), a stable UUID, an ISO-8601 timestamp, and optionally
 *   the user's free-text question (see length cap below).
 *
 * PERSISTENCE IS USER-INITIATED ONLY
 *   Nothing is written to localStorage automatically when a cast completes.
 *   A cast is saved only when the user explicitly invokes `saveCast()` (e.g. by
 *   clicking a "Save reading locally" button). A future reader of this module
 *   must not assume that completing a cast implies saving it.
 *
 * THE QUESTION FIELD
 *   The `question` field is optional. When provided to `saveCast`, it is
 *   normalised (whitespace collapsed, leading/trailing whitespace trimmed) and
 *   capped at 1000 characters before storage. A whitespace-only or absent
 *   question is stored as absent (never as an empty string). This is a
 *   deliberate owner decision; see decisions log dated 2026-07-29.
 *
 * WHERE IT LIVES
 *   Device-local only. Data is written to `localStorage` under the key
 *   `iching-oracle:history:v1`. It never leaves the browser and is never
 *   transmitted to any server.
 *
 * HOW TO CLEAR IT
 *   Call `clearHistory()` programmatically, or open DevTools → Application →
 *   Local Storage and delete the key `iching-oracle:history:v1`.
 */

import type { Cast, Line, LineValue, LinePosition, CoinValue, HexagramRef } from '../types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SavedCast {
  /** Stable identifier generated at save time via `crypto.randomUUID()`. */
  id: string;
  /** ISO-8601 timestamp of when `saveCast()` was called. */
  savedAt: string;
  /** The full cast result. */
  cast: Cast;
  /**
   * The user's question at time of casting, normalised and capped at
   * MAX_QUESTION_LENGTH characters. Absent when no question was provided or
   * when the input was empty/whitespace-only.
   */
  question?: string;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'iching-oracle:history:v1';
const CURRENT_VERSION = 1;
const MAX_HISTORY = 50;
/** Cap on stored question length. Prevents a single large entry from triggering quota errors. */
const MAX_QUESTION_LENGTH = 1000;

/** Versioned envelope written to localStorage. */
interface StoredPayload {
  version: number;
  casts: SavedCast[];
}

// ---------------------------------------------------------------------------
// In-memory fallback — used when localStorage is unavailable or throws
// ---------------------------------------------------------------------------

let _inMemory: SavedCast[] = [];
let _storageAvailable: boolean | null = null;
/**
 * Double-save guard. On a `saveCast` call, if the cast object reference is
 * already in this map, the existing record's `id` is verified against current
 * storage before returning it. If the id is gone (deleted, cleared, or wiped),
 * the entry is treated as a fresh save. This prevents duplicates on rapid
 * double-clicks while never silently losing an explicit re-save after deletion.
 * WeakMap is intentionally not enumerable — eviction is handled by verification,
 * not by walking the map.
 */
const _savedCasts = new WeakMap<Cast, SavedCast>();

// ---------------------------------------------------------------------------
// Storage availability detection
// ---------------------------------------------------------------------------

/**
 * Returns `true` if localStorage is accessible and functional.
 * Caches the result after the first probe so repeated calls are free.
 * A returning `false` does NOT break the app — all APIs fall back to memory.
 */
export function isHistoryAvailable(): boolean {
  if (_storageAvailable !== null) return _storageAvailable;
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    _storageAvailable = false;
    return false;
  }
  try {
    const probe = '__iching_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    _storageAvailable = true;
  } catch {
    _storageAvailable = false;
  }
  return _storageAvailable;
}

// ---------------------------------------------------------------------------
// Validation helpers (defensive read-back of untrusted localStorage JSON)
// ---------------------------------------------------------------------------

function isValidLineValue(v: unknown): v is LineValue {
  return v === 6 || v === 7 || v === 8 || v === 9;
}

function isValidLinePosition(v: unknown): v is LinePosition {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5 || v === 6;
}

function isValidCoinValue(v: unknown): v is CoinValue {
  return v === 2 || v === 3;
}

function isValidLine(v: unknown): v is Line {
  if (typeof v !== 'object' || v === null) return false;
  const l = v as Record<string, unknown>;
  if (!isValidLineValue(l['value'])) return false;
  if (!isValidLinePosition(l['position'])) return false;
  if (!Array.isArray(l['coins']) || l['coins'].length !== 3) return false;
  if (!l['coins'].every(isValidCoinValue)) return false;
  if (l['polarity'] !== 'yin' && l['polarity'] !== 'yang') return false;
  if (typeof l['changing'] !== 'boolean') return false;
  return true;
}

function isValidHexagramRef(v: unknown): v is HexagramRef {
  if (typeof v !== 'object' || v === null) return false;
  const h = v as Record<string, unknown>;
  if (typeof h['number'] !== 'number') return false;
  if (h['number'] < 1 || h['number'] > 64 || !Number.isInteger(h['number'])) return false;
  if (typeof h['binary'] !== 'string') return false;
  if (!/^[01]{6}$/.test(h['binary'])) return false;
  return true;
}

function isValidCast(v: unknown): v is Cast {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  if (!Array.isArray(c['lines']) || c['lines'].length !== 6) return false;
  if (!c['lines'].every(isValidLine)) return false;
  if (!isValidHexagramRef(c['primary'])) return false;
  if (!Array.isArray(c['changing'])) return false;
  if (!c['changing'].every(isValidLinePosition)) return false;
  if (c['transformed'] !== null && !isValidHexagramRef(c['transformed'])) return false;
  return true;
}

function isValidSavedCast(v: unknown): v is SavedCast {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if (typeof s['id'] !== 'string' || s['id'].length === 0) return false;
  if (typeof s['savedAt'] !== 'string' || s['savedAt'].length === 0) return false;
  if (!isValidCast(s['cast'])) return false;
  return true;
  // NOTE: `question` is optional; a non-string value is handled by sanitizeEntry
  // without discarding the entry, so it is not checked here.
}

/**
 * Accepts a validated SavedCast and sanitises the optional `question` field.
 * If `question` is present but not a string, it is dropped (the entry is kept).
 * Returns null only when the entry fails structural validation entirely.
 */
function sanitizeEntry(v: unknown): SavedCast | null {
  if (!isValidSavedCast(v)) return null;
  const entry = v as SavedCast;
  const rawQ = (v as unknown as Record<string, unknown>)['question'];
  if (rawQ === undefined || typeof rawQ === 'string') {
    return entry;
  }
  // Non-string question field: drop it, preserve the rest.
  return { id: entry.id, savedAt: entry.savedAt, cast: entry.cast };
}

// ---------------------------------------------------------------------------
// Read / write helpers
// ---------------------------------------------------------------------------

/** Read and validate stored casts. Returns empty array on any failure. */
function readFromStorage(): SavedCast[] {
  if (!isHistoryAvailable()) return _inMemory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return [];
    const payload = parsed as Record<string, unknown>;
    if (payload['version'] !== CURRENT_VERSION) {
      // Unknown version — discard rather than crash or corrupt.
      return [];
    }
    if (!Array.isArray(payload['casts'])) return [];
    // Validate structure, then sanitize the optional question field per entry.
    return (payload['casts'] as unknown[])
      .map(sanitizeEntry)
      .filter((e): e is SavedCast => e !== null);
  } catch {
    return [];
  }
}

/** Persist an array of casts. Handles QuotaExceededError by trimming and retrying once. */
function writeToStorage(casts: SavedCast[]): void {
  if (!isHistoryAvailable()) {
    _inMemory = casts;
    return;
  }
  const payload: StoredPayload = { version: CURRENT_VERSION, casts };
  const json = JSON.stringify(payload);
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch (err) {
    // QuotaExceededError or similar — trim aggressively and retry once.
    const trimmed = casts.slice(0, Math.floor(MAX_HISTORY / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, casts: trimmed }));
    } catch {
      // If it still fails, absorb silently — casting must never break.
      _inMemory = casts;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save a cast to history. Prepends the new record (newest first), caps history
 * at `MAX_HISTORY` entries, and persists. Returns the saved record.
 *
 * @param cast     The completed cast to record.
 * @param question Optional free-text question the user entered. Normalised
 *                 (whitespace collapsed, trimmed) and capped at
 *                 MAX_QUESTION_LENGTH characters before storage.
 *                 Whitespace-only input is treated as absent.
 *
 * Never throws. A storage failure degrades to in-memory or no-op; the returned
 * `SavedCast` is always valid regardless.
 */
export function saveCast(cast: Cast, question?: string): SavedCast {
  // Double-save guard: if this cast object reference was saved before, verify
  // the record is still in storage before returning it. A stale WeakMap entry
  // (after deleteCast, clearHistory, or a DevTools wipe) is treated as a fresh
  // save rather than silently returning a record that no longer exists on disk.
  const prior = _savedCasts.get(cast);
  if (prior !== undefined) {
    const stillPresent = readFromStorage().some(s => s.id === prior.id);
    if (stillPresent) return prior;
    // Record was deleted or storage was cleared — fall through to fresh save.
  }

  const normalizedQuestion = normalizeQuestion(question);
  const record: SavedCast = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    cast,
    ...(normalizedQuestion !== undefined ? { question: normalizedQuestion } : {}),
  };
  const existing = readFromStorage();
  const updated = [record, ...existing].slice(0, MAX_HISTORY);
  writeToStorage(updated);
  _savedCasts.set(cast, record);
  return record;
}

/**
 * Normalise a question string for storage:
 * - Returns `undefined` when input is absent, not a string, or whitespace-only.
 * - Collapses all internal whitespace (newlines, tabs, runs of spaces) to a
 *   single space and trims.
 * - Truncates to MAX_QUESTION_LENGTH characters.
 * Display truncation (ellipsis) belongs in the UI layer, not here.
 */
function normalizeQuestion(q: string | undefined): string | undefined {
  if (q === undefined || typeof q !== 'string') return undefined;
  const normalized = q.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return undefined;
  return normalized.slice(0, MAX_QUESTION_LENGTH);
}

/**
 * Return all saved casts, newest first.
 * Always returns an array; never throws. Malformed stored entries are silently
 * discarded. Returns an empty array when nothing has been saved.
 */
export function getHistory(): SavedCast[] {
  return readFromStorage();
}

/**
 * Remove all saved casts from both localStorage and the in-memory fallback.
 * Never throws.
 */
export function clearHistory(): void {
  _inMemory = [];
  if (!isHistoryAvailable()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Absorb — nothing meaningful we can do if remove itself throws.
  }
}

/**
 * Delete a single cast by its stable `id`. No-op if the id is not found.
 * Never throws.
 */
export function deleteCast(id: string): void {
  const current = readFromStorage();
  const updated = current.filter(s => s.id !== id);
  writeToStorage(updated);
}
