/**
 * Unit tests for src/storage/history.ts
 *
 * Written independently of the implementation author (Trinity).
 * Every test mocks localStorage from scratch via module isolation so that
 * module-level state (_storageAvailable cache, _inMemory array) cannot leak
 * between tests.
 *
 * Owner: Tank
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Cast } from '../src/types';

// ---------------------------------------------------------------------------
// localStorage mock — shared by closure, reset per-test
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'iching-oracle:history:v1';

/** Backing store for the mock. Reassigned in beforeEach; mock functions read it by reference. */
let mockStorage: Map<string, string>;

/** When true, every localStorage.setItem call throws (simulates Safari private-mode). */
let mockSetItemAlwaysThrows = false;

/** When true, every localStorage.getItem call throws. */
let mockGetItemAlwaysThrows = false;

/**
 * Standard mock used by most tests. References outer variables so per-test
 * overrides take effect without re-assigning the mock object.
 */
const standardMockLS = {
  getItem(key: string): string | null {
    if (mockGetItemAlwaysThrows) throw new Error('getItem: access denied');
    return mockStorage.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    if (mockSetItemAlwaysThrows) throw new Error('setItem: access denied');
    mockStorage.set(key, value);
  },
  removeItem(key: string): void {
    mockStorage.delete(key);
  },
  clear(): void {
    mockStorage.clear();
  },
};

beforeEach(() => {
  mockStorage = new Map();
  mockSetItemAlwaysThrows = false;
  mockGetItemAlwaysThrows = false;
  (global as any).window = {};
  (global as any).localStorage = standardMockLS;
  vi.resetModules(); // ensures each test gets a fresh module with clean state
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCast(): Cast {
  return {
    lines: [
      { value: 7, position: 1, coins: [2, 2, 3], polarity: 'yang', changing: false },
      { value: 8, position: 2, coins: [3, 2, 2], polarity: 'yin',  changing: false },
      { value: 9, position: 3, coins: [3, 3, 3], polarity: 'yang', changing: true  },
      { value: 7, position: 4, coins: [2, 2, 3], polarity: 'yang', changing: false },
      { value: 6, position: 5, coins: [2, 2, 2], polarity: 'yin',  changing: true  },
      { value: 8, position: 6, coins: [3, 2, 2], polarity: 'yin',  changing: false },
    ],
    primary:     { number: 1,  binary: '111111' },
    changing:    [3, 5],
    transformed: { number: 2,  binary: '000000' },
  };
}

/** Build a raw (un-typed) storage entry that satisfies isValidSavedCast(). */
function makeRawEntry(id: string): Record<string, unknown> {
  return {
    id,
    savedAt: '2024-01-01T00:00:00.000Z',
    cast: {
      lines: [
        { value: 7, position: 1, coins: [2, 2, 3], polarity: 'yang', changing: false },
        { value: 8, position: 2, coins: [3, 2, 2], polarity: 'yin',  changing: false },
        { value: 7, position: 3, coins: [2, 2, 3], polarity: 'yang', changing: false },
        { value: 8, position: 4, coins: [3, 2, 2], polarity: 'yin',  changing: false },
        { value: 7, position: 5, coins: [2, 2, 3], polarity: 'yang', changing: false },
        { value: 8, position: 6, coins: [3, 2, 2], polarity: 'yin',  changing: false },
      ],
      primary:     { number: 1, binary: '111111' },
      changing:    [],
      transformed: null,
    },
  };
}

/** Write a raw versioned payload directly into the mock store. */
function prefillStorage(entries: Record<string, unknown>[], version = 1): void {
  mockStorage.set(STORAGE_KEY, JSON.stringify({ version, casts: entries }));
}

// ---------------------------------------------------------------------------
// save and read
// ---------------------------------------------------------------------------

describe('save and read', () => {
  it('saveCast returns a SavedCast whose .cast equals the input', async () => {
    const { saveCast } = await import('../src/storage/history');
    const cast = makeCast();
    const saved = saveCast(cast);

    expect(saved.cast).toEqual(cast);
    expect(typeof saved.id).toBe('string');
    expect(saved.id.length).toBeGreaterThan(0);
    expect(typeof saved.savedAt).toBe('string');
  });

  it('getHistory returns the saved record after saveCast', async () => {
    const { saveCast, getHistory } = await import('../src/storage/history');
    const saved = saveCast(makeCast());

    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.id).toBe(saved.id);
    expect(history[0]!.cast).toEqual(saved.cast);
  });

  it('multiple saves are returned newest-first', async () => {
    const { saveCast, getHistory } = await import('../src/storage/history');
    const first  = saveCast(makeCast());
    const second = saveCast(makeCast());
    const third  = saveCast(makeCast());

    const ids = getHistory().map(s => s.id);
    expect(ids[0]).toBe(third.id);
    expect(ids[1]).toBe(second.id);
    expect(ids[2]).toBe(first.id);
  });

  it('each call to saveCast generates a distinct stable id', async () => {
    const { saveCast, getHistory } = await import('../src/storage/history');
    const a = saveCast(makeCast());
    const b = saveCast(makeCast());
    const c = saveCast(makeCast());

    expect(a.id).not.toBe(b.id);
    expect(b.id).not.toBe(c.id);

    // ids must not change when reading back
    const fromStorage = getHistory();
    const storedIds = fromStorage.map(s => s.id);
    expect(storedIds).toContain(a.id);
    expect(storedIds).toContain(b.id);
    expect(storedIds).toContain(c.id);
  });
});

// ---------------------------------------------------------------------------
// deleteCast
// ---------------------------------------------------------------------------

describe('deleteCast', () => {
  it('removes the entry with the given id', async () => {
    const { saveCast, getHistory, deleteCast } = await import('../src/storage/history');
    const a = saveCast(makeCast());
    const b = saveCast(makeCast());

    deleteCast(a.id);
    const history = getHistory();

    expect(history).toHaveLength(1);
    expect(history[0]!.id).toBe(b.id);
  });

  it('non-existent id is a silent no-op — history unchanged, no throw', async () => {
    const { saveCast, getHistory, deleteCast } = await import('../src/storage/history');
    saveCast(makeCast());
    saveCast(makeCast());

    expect(() => deleteCast('does-not-exist-xyz')).not.toThrow();
    expect(getHistory()).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// clearHistory
// ---------------------------------------------------------------------------

describe('clearHistory', () => {
  it('removes all entries from localStorage', async () => {
    const { saveCast, getHistory, clearHistory } = await import('../src/storage/history');
    saveCast(makeCast());
    saveCast(makeCast());
    expect(getHistory()).toHaveLength(2);

    clearHistory();
    expect(getHistory()).toHaveLength(0);
    // Raw key should be absent
    expect(mockStorage.has(STORAGE_KEY)).toBe(false);
  });

  it('empties the in-memory fallback when localStorage is unavailable', async () => {
    // Make storage unavailable so the module falls back to _inMemory
    (global as any).window     = undefined;
    (global as any).localStorage = undefined;

    const { saveCast, getHistory, clearHistory } = await import('../src/storage/history');
    saveCast(makeCast());
    expect(getHistory()).toHaveLength(1);

    clearHistory();
    expect(getHistory()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 50-entry cap
// ---------------------------------------------------------------------------

describe('50-entry cap', () => {
  it('saving 55 entries yields exactly 50 in getHistory()', async () => {
    const { saveCast, getHistory } = await import('../src/storage/history');
    for (let i = 0; i < 55; i++) saveCast(makeCast());
    expect(getHistory()).toHaveLength(50);
  });

  it('the OLDEST entries (saved first) are the ones dropped', async () => {
    const { saveCast, getHistory } = await import('../src/storage/history');

    const records: { id: string }[] = [];
    for (let i = 0; i < 55; i++) {
      records.push(saveCast(makeCast()));
    }
    // records[0..4] are the 5 oldest; records[5..54] are the 50 newest
    const keptIds = new Set(getHistory().map(s => s.id));

    // Oldest 5 must be gone
    for (let i = 0; i < 5; i++) {
      expect(keptIds.has(records[i]!.id), `oldest entry ${i} should be dropped`).toBe(false);
    }
    // Newest 50 must all be present
    for (let i = 5; i < 55; i++) {
      expect(keptIds.has(records[i]!.id), `entry ${i} should be kept`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Corruption resilience
// ---------------------------------------------------------------------------

describe('corruption resilience — getHistory() never throws; always returns an array', () => {
  it('non-JSON garbage → empty array', async () => {
    mockStorage.set(STORAGE_KEY, '{{not json at all!!!');
    const { getHistory } = await import('../src/storage/history');
    expect(() => getHistory()).not.toThrow();
    expect(getHistory()).toEqual([]);
  });

  it('valid JSON string (not an object) → empty array', async () => {
    mockStorage.set(STORAGE_KEY, '"just a string"');
    const { getHistory } = await import('../src/storage/history');
    expect(() => getHistory()).not.toThrow();
    expect(getHistory()).toEqual([]);
  });

  it('valid JSON object but missing version field → empty array', async () => {
    mockStorage.set(STORAGE_KEY, JSON.stringify({ casts: [makeRawEntry('x')] }));
    const { getHistory } = await import('../src/storage/history');
    expect(() => getHistory()).not.toThrow();
    expect(getHistory()).toEqual([]);
  });

  it('unknown future version (e.g. 99) → empty array (not a crash)', async () => {
    mockStorage.set(STORAGE_KEY, JSON.stringify({ version: 99, casts: [makeRawEntry('x')] }));
    const { getHistory } = await import('../src/storage/history');
    expect(() => getHistory()).not.toThrow();
    expect(getHistory()).toEqual([]);
  });

  it('entry with line value 5 (outside 6/7/8/9) → entry filtered out', async () => {
    const bad = makeRawEntry('bad-line');
    (bad['cast'] as any)['lines'][0]['value'] = 5; // invalid
    prefillStorage([bad]);
    const { getHistory } = await import('../src/storage/history');
    expect(() => getHistory()).not.toThrow();
    expect(getHistory()).toHaveLength(0);
  });

  it('hexagram number 0 → entry filtered out', async () => {
    const bad = makeRawEntry('bad-primary-0');
    (bad['cast'] as any)['primary']['number'] = 0; // invalid: must be 1..64
    prefillStorage([bad]);
    const { getHistory } = await import('../src/storage/history');
    expect(() => getHistory()).not.toThrow();
    expect(getHistory()).toHaveLength(0);
  });

  it('hexagram number 65 → entry filtered out', async () => {
    const bad = makeRawEntry('bad-primary-65');
    (bad['cast'] as any)['primary']['number'] = 65; // invalid
    prefillStorage([bad]);
    const { getHistory } = await import('../src/storage/history');
    expect(() => getHistory()).not.toThrow();
    expect(getHistory()).toHaveLength(0);
  });

  it('mix of valid and malformed entries — valid entries survive, no throw', async () => {
    const good1 = makeRawEntry('good-1');
    const good2 = makeRawEntry('good-2');
    const badLineVal = makeRawEntry('bad-line-val');
    (badLineVal['cast'] as any)['lines'][2]['value'] = 10;
    const badHexNum = makeRawEntry('bad-hex');
    (badHexNum['cast'] as any)['primary']['number'] = 0;
    const missingCast = { id: 'no-cast', savedAt: '2024-01-01T00:00:00Z' }; // no cast field

    prefillStorage([good1, badLineVal, good2, badHexNum, missingCast]);

    const { getHistory } = await import('../src/storage/history');
    expect(() => getHistory()).not.toThrow();
    const result = getHistory();

    expect(result).toHaveLength(2);
    const ids = result.map(r => r.id);
    expect(ids).toContain('good-1');
    expect(ids).toContain('good-2');
    expect(ids).not.toContain('bad-line-val');
    expect(ids).not.toContain('bad-hex');
    expect(ids).not.toContain('no-cast');
  });
});

// ---------------------------------------------------------------------------
// Hostile environment — storage that throws
// ---------------------------------------------------------------------------

describe('hostile environment — localStorage that throws', () => {
  it('setItem always throws (probe fails) → in-memory fallback keeps history working', async () => {
    // Probe uses setItem; if it throws, isHistoryAvailable() returns false
    // and the module falls back to _inMemory for all operations.
    mockSetItemAlwaysThrows = true;

    const { saveCast, getHistory } = await import('../src/storage/history');

    expect(() => saveCast(makeCast())).not.toThrow();
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.cast).toBeDefined();
  });

  it('getItem always throws → saveCast does not propagate; history degraded but no crash', async () => {
    // The probe only calls setItem, so isHistoryAvailable() can still return true.
    // Reads will fail, but writes should work; the contract requires no exceptions.
    mockGetItemAlwaysThrows = true;

    const { saveCast, getHistory } = await import('../src/storage/history');

    expect(() => saveCast(makeCast())).not.toThrow();
    expect(() => getHistory()).not.toThrow();
    // getHistory returns [] because every read fails, which is acceptable degradation.
    expect(Array.isArray(getHistory())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// QuotaExceededError
// ---------------------------------------------------------------------------

describe('QuotaExceededError on write', () => {
  it('first write throws → trims to 25 and retries; saveCast never throws', async () => {
    let storageKeyWrites = 0;
    const quotaLS = {
      getItem:    (key: string) => mockStorage.get(key) ?? null,
      setItem(key: string, value: string) {
        if (key === STORAGE_KEY) {
          storageKeyWrites++;
          if (storageKeyWrites === 1) {
            // Simulate QuotaExceededError on first real write
            throw Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
          }
        }
        mockStorage.set(key, value);
      },
      removeItem: (key: string) => mockStorage.delete(key),
      clear:      () => mockStorage.clear(),
    };
    (global as any).window     = {};
    (global as any).localStorage = quotaLS;

    const { saveCast, getHistory } = await import('../src/storage/history');

    // Should not throw even though the first localStorage write fails.
    expect(() => saveCast(makeCast())).not.toThrow();

    // The retry (trimmed payload) should have been written.
    const raw = mockStorage.get(STORAGE_KEY);
    expect(raw, 'Retry write should have stored something').toBeDefined();

    const payload = JSON.parse(raw!) as { version: number; casts: unknown[] };
    expect(payload.version).toBe(1);
    expect(payload.casts.length).toBeGreaterThan(0);
    expect(payload.casts.length).toBeLessThanOrEqual(25); // trimmed to MAX_HISTORY/2

    // getHistory must also not throw.
    expect(() => getHistory()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// SSR guard — no window / localStorage in scope
// ---------------------------------------------------------------------------

describe('SSR guard — no window or localStorage', () => {
  it('saveCast and getHistory work via in-memory fallback when window is absent', async () => {
    // Remove the globals that the module uses to detect a browser environment.
    (global as any).window     = undefined;
    (global as any).localStorage = undefined;

    const { saveCast, getHistory, isHistoryAvailable } = await import('../src/storage/history');

    expect(isHistoryAvailable()).toBe(false);
    expect(() => saveCast(makeCast())).not.toThrow();
    const history = getHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history).toHaveLength(1);
    expect(history[0]!.cast).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Question field — storage behaviour
// ---------------------------------------------------------------------------

describe('question field — storage behaviour', () => {
  it('saveCast with no question argument → SavedCast has no question property', async () => {
    const { saveCast } = await import('../src/storage/history');
    const saved = saveCast(makeCast());
    expect(Object.prototype.hasOwnProperty.call(saved, 'question')).toBe(false);
    // Also confirmed in raw payload
    const raw = mockStorage.get(STORAGE_KEY)!;
    const payload = JSON.parse(raw) as { casts: Record<string, unknown>[] };
    expect(Object.prototype.hasOwnProperty.call(payload.casts[0]!, 'question')).toBe(false);
  });

  it('saveCast with a question → round-trips correctly via getHistory()', async () => {
    const { saveCast, getHistory } = await import('../src/storage/history');
    const q = 'What is the nature of this moment?';
    const saved = saveCast(makeCast(), q);
    expect(saved.question).toBe(q);
    expect(getHistory()[0]!.question).toBe(q);
  });

  it('question > 1000 chars → truncated to exactly 1000 chars on write', async () => {
    const { saveCast, getHistory } = await import('../src/storage/history');
    const longQ = 'X'.repeat(1100);
    const saved = saveCast(makeCast(), longQ);
    expect(saved.question).toHaveLength(1000);
    expect(saved.question).toBe('X'.repeat(1000));
    // Overflow text genuinely absent from raw payload
    const raw = mockStorage.get(STORAGE_KEY)!;
    expect(raw).not.toContain('X'.repeat(1001));
    expect(getHistory()[0]!.question).toHaveLength(1000);
  });

  it('whitespace-only question → stored as absent, not as empty string', async () => {
    const { saveCast } = await import('../src/storage/history');
    for (const ws of ['   ', '\t', '\n', '  \t  \n  ']) {
      const saved = saveCast(makeCast(), ws);
      // Must not merely be falsy — the key itself must be absent so that
      // "no question asked" and "empty question" are indistinguishable.
      expect(
        Object.prototype.hasOwnProperty.call(saved, 'question'),
        `whitespace input ${JSON.stringify(ws)} should produce absent question, not empty string`,
      ).toBe(false);
    }
  });

  it('internal newlines/tabs → normalised to single spaces', async () => {
    const { saveCast } = await import('../src/storage/history');
    const saved = saveCast(makeCast(), 'line one\nline two\ttabbed');
    expect(saved.question).toBe('line one line two tabbed');
  });

  it('stored payload with non-string question (number) → field dropped, entry survives', async () => {
    const entry: Record<string, unknown> = makeRawEntry('corrupt-q-num');
    entry['question'] = 42;
    prefillStorage([entry]);
    const { getHistory } = await import('../src/storage/history');
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.id).toBe('corrupt-q-num');
    expect(Object.prototype.hasOwnProperty.call(history[0]!, 'question')).toBe(false);
  });

  it('stored payload with non-string question (object) → field dropped, entry survives', async () => {
    const entry: Record<string, unknown> = makeRawEntry('corrupt-q-obj');
    entry['question'] = { malicious: true };
    prefillStorage([entry]);
    const { getHistory } = await import('../src/storage/history');
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(Object.prototype.hasOwnProperty.call(history[0]!, 'question')).toBe(false);
  });

  it('stored payload with null question → field dropped, entry survives', async () => {
    const entry: Record<string, unknown> = makeRawEntry('corrupt-q-null');
    entry['question'] = null;
    prefillStorage([entry]);
    const { getHistory } = await import('../src/storage/history');
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(Object.prototype.hasOwnProperty.call(history[0]!, 'question')).toBe(false);
  });

  it('stored payload with array question → field dropped, entry survives', async () => {
    const entry: Record<string, unknown> = makeRawEntry('corrupt-q-arr');
    entry['question'] = ['injected'];
    prefillStorage([entry]);
    const { getHistory } = await import('../src/storage/history');
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(Object.prototype.hasOwnProperty.call(history[0]!, 'question')).toBe(false);
  });

  it('old payload with no question key at all → loads cleanly, entry not discarded', async () => {
    // Simulates entries written before the question field was introduced.
    // Real browsers hold exactly this shape and must not be penalised.
    prefillStorage([makeRawEntry('legacy-no-question')]);
    const { getHistory } = await import('../src/storage/history');
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.id).toBe('legacy-no-question');
    expect(Object.prototype.hasOwnProperty.call(history[0]!, 'question')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Double-save guard (WeakMap deduplication)
// ---------------------------------------------------------------------------

describe('double-save guard (WeakMap deduplication)', () => {
  it('same Cast reference → second saveCast returns identical record, no duplicate entry', async () => {
    const { saveCast, getHistory } = await import('../src/storage/history');
    const cast = makeCast();
    const first  = saveCast(cast);
    const second = saveCast(cast); // same object reference

    expect(second).toBe(first);           // identical object reference
    expect(getHistory()).toHaveLength(1); // only ONE entry written to storage
  });

  it('two distinct Cast objects with the same structure → both saved as separate entries', async () => {
    const { saveCast, getHistory } = await import('../src/storage/history');
    const castA = makeCast(); // two separate object references,
    const castB = makeCast(); // structurally identical

    const a = saveCast(castA);
    const b = saveCast(castB);

    expect(a.id).not.toBe(b.id);         // distinct records
    expect(getHistory()).toHaveLength(2); // both persisted
  });

  it('save → delete → re-save same reference → new record with new id, actually persisted in storage', async () => {
    // The guard detects the stale WeakMap entry (id gone from storage) and falls
    // through to a fresh save.  "Save reading locally" must never silently succeed
    // while writing nothing — this is the contract that makes the button trustworthy.
    const { saveCast, getHistory, deleteCast } = await import('../src/storage/history');
    const cast = makeCast();

    const original = saveCast(cast);
    deleteCast(original.id);
    expect(getHistory()).toHaveLength(0); // confirmed deleted from storage

    const retrySave = saveCast(cast);    // same object reference — guard detects stale entry
    expect(retrySave.id).not.toBe(original.id); // fresh record, not the old ghost
    // Critical: the new record must actually exist in storage.
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.id).toBe(retrySave.id);
  });

  it('save → clearHistory → re-save same reference → new record, actually persisted in storage', async () => {
    const { saveCast, getHistory, clearHistory } = await import('../src/storage/history');
    const cast = makeCast();

    const original = saveCast(cast);
    clearHistory();
    expect(getHistory()).toHaveLength(0);

    const retrySave = saveCast(cast);
    expect(retrySave.id).not.toBe(original.id);
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.id).toBe(retrySave.id);
  });

  it('save → manual storage-key wipe → re-save same reference → new record, actually persisted in storage', async () => {
    // Simulates a browser evicting the storage key under quota pressure, or the
    // user clearing via DevTools.  This is the sequence that an evict-on-deleteCast
    // approach would have silently mis-handled: the WeakMap would still hold the
    // reference, but localStorage would be empty, and the guard would incorrectly
    // return the stale record as if the save succeeded.
    const { saveCast, getHistory } = await import('../src/storage/history');
    const cast = makeCast();

    const original = saveCast(cast);
    mockStorage.delete(STORAGE_KEY); // raw wipe — module never called deleteCast/clearHistory
    expect(getHistory()).toHaveLength(0);

    const retrySave = saveCast(cast);
    expect(retrySave.id).not.toBe(original.id);
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.id).toBe(retrySave.id);
  });
});

// ---------------------------------------------------------------------------
// Privacy: the user's question text is NEVER in the persisted payload
// ---------------------------------------------------------------------------

describe('privacy — question absent from payload when not provided', () => {
  it('raw localStorage payload contains no trace of a sentinel question string', async () => {
    // Behavioural proof: save without a question argument, read back the raw JSON,
    // confirm the sentinel string is absent and the record has no question property.
    const SENTINEL = 'SENTINEL_QUESTION_DO_NOT_STORE_abc123xyz';

    const { saveCast } = await import('../src/storage/history');

    // Saving without a question argument must not write any question to the payload.
    saveCast(makeCast());

    const raw = mockStorage.get(STORAGE_KEY) ?? '';
    expect(raw.length).toBeGreaterThan(0);
    expect(raw).not.toContain(SENTINEL);

    // Also verify the SavedCast object itself has no question property.
    const payload = JSON.parse(raw) as { casts: Record<string, unknown>[] };
    const record = payload.casts[0]!;
    expect(Object.prototype.hasOwnProperty.call(record, 'question')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(record['cast'] ?? {}, 'question')).toBe(false);
  });
});
