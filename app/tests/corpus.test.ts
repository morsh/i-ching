/**
 * Tests for src/data/hexagrams.ts
 * Owner: Tank
 * Contract owner: Seraph
 */

import { describe, it, expect } from 'vitest';
import { HEXAGRAMS, getHexagramByBinary, getHexagramByNumber } from '../src/data/hexagrams';

// ---------------------------------------------------------------------------
// Corpus completeness
// ---------------------------------------------------------------------------

describe('HEXAGRAMS corpus', () => {
  it('contains exactly 64 hexagrams', () => {
    expect(HEXAGRAMS).toHaveLength(64);
  });

  it('has numbers 1..64 with no gaps and no duplicates', () => {
    const numbers = HEXAGRAMS.map((h) => h.number).sort((a, b) => a - b);
    for (let i = 0; i < 64; i++) {
      expect(numbers[i]).toBe(i + 1);
    }
  });

  it('every binary is unique, exactly 6 chars, containing only "0" and "1"', () => {
    const seen = new Set<string>();
    for (const hex of HEXAGRAMS) {
      expect(hex.binary).toHaveLength(6);
      expect(/^[01]{6}$/.test(hex.binary)).toBe(true);
      expect(seen.has(hex.binary)).toBe(false);
      seen.add(hex.binary);
    }
  });
});

// ---------------------------------------------------------------------------
// Required text fields
// ---------------------------------------------------------------------------

describe('HEXAGRAMS required text fields', () => {
  it('every entry has a non-empty nameZh, namePinyin, and nameEn', () => {
    for (const hex of HEXAGRAMS) {
      expect(hex.nameZh.length).toBeGreaterThan(0);
      expect(hex.namePinyin.length).toBeGreaterThan(0);
      expect(hex.nameEn.length).toBeGreaterThan(0);
    }
  });

  it('every entry has a non-empty judgment text', () => {
    for (const hex of HEXAGRAMS) {
      expect(hex.judgment.length).toBeGreaterThan(0);
    }
  });

  it('every entry has a non-empty image text', () => {
    for (const hex of HEXAGRAMS) {
      expect(hex.image.length).toBeGreaterThan(0);
    }
  });

  it('every entry has exactly 6 non-empty per-line texts (bottom-to-top)', () => {
    for (const hex of HEXAGRAMS) {
      expect(hex.lines).toHaveLength(6);
      for (const lineText of hex.lines) {
        expect(lineText.length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Trigram consistency
// ---------------------------------------------------------------------------

describe('HEXAGRAMS trigram consistency', () => {
  it('binary === trigrams.lower.binary + trigrams.upper.binary for every entry', () => {
    // The 6-char binary is bottom-to-top: lower trigram occupies indices 0-2,
    // upper trigram occupies indices 3-5.
    for (const hex of HEXAGRAMS) {
      const composed = hex.trigrams.lower.binary + hex.trigrams.upper.binary;
      expect(composed).toBe(hex.binary);
    }
  });

  it('every trigram binary is exactly 3 chars of "0"/"1"', () => {
    for (const hex of HEXAGRAMS) {
      expect(/^[01]{3}$/.test(hex.trigrams.lower.binary)).toBe(true);
      expect(/^[01]{3}$/.test(hex.trigrams.upper.binary)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Lookup functions
// ---------------------------------------------------------------------------

describe('getHexagramByNumber', () => {
  it('returns the correct hexagram for numbers 1..64', () => {
    for (let n = 1; n <= 64; n++) {
      const hex = getHexagramByNumber(n);
      expect(hex.number).toBe(n);
    }
  });

  it('throws for out-of-range numbers', () => {
    expect(() => getHexagramByNumber(0)).toThrow();
    expect(() => getHexagramByNumber(65)).toThrow();
    expect(() => getHexagramByNumber(-1)).toThrow();
  });
});

describe('getHexagramByBinary', () => {
  it('returns hexagram 1 for all-yang "111111"', () => {
    expect(getHexagramByBinary('111111').number).toBe(1);
  });

  it('returns hexagram 2 for all-yin "000000"', () => {
    expect(getHexagramByBinary('000000').number).toBe(2);
  });

  it('throws for a malformed binary (wrong length)', () => {
    expect(() => getHexagramByBinary('1111111')).toThrow(); // 7 chars
    expect(() => getHexagramByBinary('11111')).toThrow();   // 5 chars
    expect(() => getHexagramByBinary('')).toThrow();         // empty
  });

  it('throws for a binary with non-binary characters', () => {
    expect(() => getHexagramByBinary('abcdef')).toThrow();
    expect(() => getHexagramByBinary('111112')).toThrow();
  });
});
