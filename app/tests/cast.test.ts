/**
 * Tests for src/engine/cast.ts
 * Owner: Tank
 * Contract owner: Switch
 */

import { describe, it, expect } from 'vitest';
import type { CoinTriplet } from '../src/types';
import { coinsToValue, castHexagram } from '../src/engine/cast';

// ---------------------------------------------------------------------------
// coinsToValue – all 8 coin triplets
// ---------------------------------------------------------------------------

const ALL_TRIPLETS: { coins: CoinTriplet; expected: number }[] = [
  { coins: [2, 2, 2], expected: 6 }, // old yin   — 1/8
  { coins: [2, 2, 3], expected: 7 }, // young yang — 3/8
  { coins: [2, 3, 2], expected: 7 },
  { coins: [3, 2, 2], expected: 7 },
  { coins: [2, 3, 3], expected: 8 }, // young yin  — 3/8
  { coins: [3, 2, 3], expected: 8 },
  { coins: [3, 3, 2], expected: 8 },
  { coins: [3, 3, 3], expected: 9 }, // old yang   — 1/8
];

describe('coinsToValue', () => {
  it('maps every one of the 8 coin triplets to the correct sum', () => {
    for (const { coins, expected } of ALL_TRIPLETS) {
      expect(coinsToValue(coins)).toBe(expected);
    }
  });

  it('covers all four possible line values (6, 7, 8, 9)', () => {
    const values = new Set(ALL_TRIPLETS.map(({ coins }) => coinsToValue(coins)));
    expect(values.has(6)).toBe(true);
    expect(values.has(7)).toBe(true);
    expect(values.has(8)).toBe(true);
    expect(values.has(9)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// castHexagram – structural contract
// ---------------------------------------------------------------------------

describe('castHexagram – structure', () => {
  it('returns exactly 6 lines with positions 1..6 in ascending order', () => {
    const cast = castHexagram();
    expect(cast.lines).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      expect(cast.lines[i]!.position).toBe(i + 1);
    }
  });

  it('lines[0].position === 1 — the BOTTOM line comes first (most important ordering assertion)', () => {
    // This is the critical contract: bottom-to-top ordering.
    const cast = castHexagram();
    expect(cast.lines[0]!.position).toBe(1);
    expect(cast.lines[5]!.position).toBe(6);
  });

  it('every line has exactly 3 coins, each 2 or 3, summing to value', () => {
    const cast = castHexagram();
    for (const line of cast.lines) {
      expect(line.coins).toHaveLength(3);
      for (const coin of line.coins) {
        expect(coin === 2 || coin === 3).toBe(true);
      }
      const sum = line.coins[0]! + line.coins[1]! + line.coins[2]!;
      expect(sum).toBe(line.value);
    }
  });

  it('changing is true exactly when value is 6 or 9', () => {
    const cast = castHexagram();
    for (const line of cast.lines) {
      const expectChanging = line.value === 6 || line.value === 9;
      expect(line.changing).toBe(expectChanging);
    }
  });

  it('cast.changing lists only positions of lines whose value is 6 or 9, ascending', () => {
    const cast = castHexagram();
    const changingPositions = cast.lines
      .filter((l) => l.value === 6 || l.value === 9)
      .map((l) => l.position);
    expect(cast.changing).toEqual(changingPositions);
  });
});

// ---------------------------------------------------------------------------
// castHexagram – transformed / null invariant
// ---------------------------------------------------------------------------

describe('castHexagram – transformed field', () => {
  it('transformed is non-null when there is at least one changing line', () => {
    // P(at least one changing line) ≈ 82 %. Across 50 tries, P(never found) ≈ 10^-37.
    let foundChanging = false;
    for (let i = 0; i < 50 && !foundChanging; i++) {
      const cast = castHexagram();
      if (cast.changing.length > 0) {
        expect(cast.transformed).not.toBeNull();
        foundChanging = true;
      }
    }
    expect(foundChanging).toBe(true);
  });

  it('transformed is null when there are no changing lines', () => {
    // P(no changing lines) ≈ 17.8 %. Across 200 tries, P(never found) < 10^-16.
    let foundNoChanging = false;
    for (let i = 0; i < 200 && !foundNoChanging; i++) {
      const cast = castHexagram();
      if (cast.changing.length === 0) {
        expect(cast.transformed).toBeNull();
        foundNoChanging = true;
      }
    }
    expect(foundNoChanging).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// castHexagram – line-value distribution
// ---------------------------------------------------------------------------

describe('castHexagram – distribution (>= 200 k lines)', () => {
  it('line values 6/7/8/9 converge on 1/8 : 3/8 : 3/8 : 1/8 within 5 %', () => {
    // Collect lines by running 34 000 casts × 6 lines = 204 000 lines.
    // Expected: 6 → 25 500, 7 → 76 500, 8 → 76 500, 9 → 25 500.
    // Tolerance: 5 %. For value 6 (p=0.125, n=204 000): σ ≈ 150, ±5 % ≈ ±1 275 ≈ ±8.5 σ.
    // Cannot flake; will catch any systematic coin bias.
    const CASTS = 34_000;
    const TOTAL = CASTS * 6; // 204 000 lines
    const TOLERANCE = 0.05;

    const counts = new Map<number, number>([[6, 0], [7, 0], [8, 0], [9, 0]]);
    for (let i = 0; i < CASTS; i++) {
      for (const line of castHexagram().lines) {
        counts.set(line.value, (counts.get(line.value) ?? 0) + 1);
      }
    }

    const expected: Record<number, number> = {
      6: TOTAL / 8,
      7: (TOTAL * 3) / 8,
      8: (TOTAL * 3) / 8,
      9: TOTAL / 8,
    };
    for (const v of [6, 7, 8, 9] as const) {
      const count = counts.get(v) ?? 0;
      const exp = expected[v]!;
      expect(count).toBeGreaterThanOrEqual(Math.floor(exp * (1 - TOLERANCE)));
      expect(count).toBeLessThanOrEqual(Math.ceil(exp * (1 + TOLERANCE)));
    }
  });
}, 30_000 /* ms timeout for the large sample */);
