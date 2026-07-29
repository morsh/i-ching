/**
 * Tests for src/engine/hexagram.ts
 * Owner: Tank
 * Contract owner: Switch
 */

import { describe, it, expect } from 'vitest';
import type { Line, LinePosition, LineValue, CoinTriplet } from '../src/types';
import {
  linesToBinary,
  transformedBinary,
  binaryToHexagram,
  deriveTrigrams,
} from '../src/engine/hexagram';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Create a minimal valid Line for a given position and value. */
function makeLine(position: LinePosition, value: LineValue): Line {
  // Canonical coin triplets: one representative for each line value.
  const coins: CoinTriplet =
    value === 6 ? [2, 2, 2] :
    value === 7 ? [2, 2, 3] :
    value === 8 ? [2, 3, 3] :
    /* 9 */       [3, 3, 3];
  return {
    position,
    value,
    coins,
    polarity: value === 6 || value === 8 ? 'yin' : 'yang',
    changing: value === 6 || value === 9,
  };
}

const POSITIONS = [1, 2, 3, 4, 5, 6] as const;

/** Six lines all with the same value (e.g. all-yang = 7, all-yin = 8). */
function sixLines(value: LineValue): Line[] {
  return POSITIONS.map((p) => makeLine(p, value));
}

// ---------------------------------------------------------------------------
// linesToBinary
// ---------------------------------------------------------------------------

describe('linesToBinary', () => {
  it('maps 7 (young yang) to "1"', () => {
    const lines = sixLines(7);
    const bin = linesToBinary(lines);
    expect(bin).toBe('111111');
  });

  it('maps 9 (old yang) to "1"', () => {
    const lines = sixLines(9);
    const bin = linesToBinary(lines);
    expect(bin).toBe('111111');
  });

  it('maps 8 (young yin) to "0"', () => {
    const lines = sixLines(8);
    const bin = linesToBinary(lines);
    expect(bin).toBe('000000');
  });

  it('maps 6 (old yin) to "0"', () => {
    const lines = sixLines(6);
    const bin = linesToBinary(lines);
    expect(bin).toBe('000000');
  });

  it('places the bottom line (position 1) at index 0', () => {
    // Line at position 1 = yang (7), rest = yin (8).
    const lines: Line[] = [
      makeLine(1, 7), // bottom → '1'
      makeLine(2, 8),
      makeLine(3, 8),
      makeLine(4, 8),
      makeLine(5, 8),
      makeLine(6, 8), // top
    ];
    const bin = linesToBinary(lines);
    expect(bin[0]).toBe('1'); // bottom at index 0
    expect(bin[5]).toBe('0'); // top at index 5
  });

  it('returns a 6-character string', () => {
    expect(linesToBinary(sixLines(7))).toHaveLength(6);
    expect(linesToBinary(sixLines(8))).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// transformedBinary
// ---------------------------------------------------------------------------

describe('transformedBinary', () => {
  it('flips 6 (old yin) to yang ("1")', () => {
    const lines = sixLines(6); // all old yin → all flip to yang
    expect(transformedBinary(lines)).toBe('111111');
  });

  it('flips 9 (old yang) to yin ("0")', () => {
    const lines = sixLines(9); // all old yang → all flip to yin
    expect(transformedBinary(lines)).toBe('000000');
  });

  it('leaves 7 (young yang) unchanged — still "1"', () => {
    expect(transformedBinary(sixLines(7))).toBe('111111');
  });

  it('leaves 8 (young yin) unchanged — still "0"', () => {
    expect(transformedBinary(sixLines(8))).toBe('000000');
  });

  it('flips only the changing lines in a mixed set', () => {
    // position 1 = 9 (old yang → flips to yin "0")
    // position 2 = 7 (young yang → stays "1")
    // position 3 = 6 (old yin  → flips to yang "1")
    // position 4 = 8 (young yin → stays "0")
    // position 5 = 7 → stays "1"
    // position 6 = 8 → stays "0"
    // Expected binary bottom-to-top: 0, 1, 1, 0, 1, 0 → "011010"
    const lines: Line[] = [
      makeLine(1, 9),
      makeLine(2, 7),
      makeLine(3, 6),
      makeLine(4, 8),
      makeLine(5, 7),
      makeLine(6, 8),
    ];
    expect(transformedBinary(lines)).toBe('011010');
  });
});

// ---------------------------------------------------------------------------
// deriveTrigrams
// ---------------------------------------------------------------------------

describe('deriveTrigrams', () => {
  it('assigns lines 1-3 (indices 0-2) to the LOWER trigram', () => {
    // '111000': lower = '111', upper = '000'
    const { lower, upper } = deriveTrigrams('111000');
    expect(lower.binary).toBe('111');
    expect(upper.binary).toBe('000');
  });

  it('assigns lines 4-6 (indices 3-5) to the UPPER trigram', () => {
    // '000111': lower = '000', upper = '111'
    const { lower, upper } = deriveTrigrams('000111');
    expect(lower.binary).toBe('000');
    expect(upper.binary).toBe('111');
  });

  it('returns TrigramRef objects with non-empty name strings', () => {
    const { lower, upper } = deriveTrigrams('111111');
    expect(typeof lower.name).toBe('string');
    expect(lower.name.length).toBeGreaterThan(0);
    expect(typeof upper.name).toBe('string');
    expect(upper.name.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// binaryToHexagram – King Wen fixture round-trips
// ---------------------------------------------------------------------------

describe('binaryToHexagram – King Wen fixtures', () => {
  it('all-yang "111111" resolves to hexagram 1 (Qian)', () => {
    expect(binaryToHexagram('111111').number).toBe(1);
  });

  it('all-yin "000000" resolves to hexagram 2 (Kun)', () => {
    expect(binaryToHexagram('000000').number).toBe(2);
  });

  it('"111000" (Qian lower, Kun upper) resolves to hexagram 11 (Tai)', () => {
    // Lower = Qian (☰ 111), Upper = Kun (☷ 000). Binary bottom-to-top: '111000'.
    expect(binaryToHexagram('111000').number).toBe(11);
  });

  it('"000111" (Kun lower, Qian upper) resolves to hexagram 12 (Pi)', () => {
    // Lower = Kun (☷ 000), Upper = Qian (☰ 111). Binary bottom-to-top: '000111'.
    expect(binaryToHexagram('000111').number).toBe(12);
  });

  it('"101010" (Li lower, Kan upper) resolves to hexagram 63 (Ji Ji)', () => {
    // Lower = Li (☲ 101), Upper = Kan (☵ 010). Binary bottom-to-top: '101010'.
    expect(binaryToHexagram('101010').number).toBe(63);
  });

  it('"010101" (Kan lower, Li upper) resolves to hexagram 64 (Wei Ji)', () => {
    // Lower = Kan (☵ 010), Upper = Li (☲ 101). Binary bottom-to-top: '010101'.
    expect(binaryToHexagram('010101').number).toBe(64);
  });

  it('returns the binary unchanged on the ref', () => {
    const ref = binaryToHexagram('111111');
    expect(ref.binary).toBe('111111');
  });
});
