/**
 * Tests for src/engine/random.ts
 * Owner: Tank
 * Contract owner: Switch
 */

import { describe, it, expect } from 'vitest';
import { randomInt, flipCoin } from '../src/engine/random';

describe('randomInt – range', () => {
  it('returns integers within [0, max) across 2 000 draws', () => {
    const max = 13;
    for (let i = 0; i < 2_000; i++) {
      const n = randomInt(max);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(max);
    }
  });

  it('works for max = 1 (always returns 0)', () => {
    for (let i = 0; i < 100; i++) {
      expect(randomInt(1)).toBe(0);
    }
  });
});

describe('randomInt – invalid input', () => {
  it('throws RangeError for max = 0', () => {
    expect(() => randomInt(0)).toThrow(RangeError);
  });

  it('throws RangeError for negative max', () => {
    expect(() => randomInt(-1)).toThrow(RangeError);
    expect(() => randomInt(-100)).toThrow(RangeError);
  });

  it('throws RangeError for non-integer max', () => {
    expect(() => randomInt(1.5)).toThrow(RangeError);
    expect(() => randomInt(0.9)).toThrow(RangeError);
    expect(() => randomInt(2.000_001)).toThrow(RangeError);
  });

  it('throws RangeError for non-finite max', () => {
    expect(() => randomInt(Infinity)).toThrow(RangeError);
    expect(() => randomInt(-Infinity)).toThrow(RangeError);
    expect(() => randomInt(NaN)).toThrow(RangeError);
  });
});

describe('randomInt – uniformity (CSPRNG)', () => {
  it('distributes across 10 buckets within 5 % of expected over 100 k draws', () => {
    // 10 buckets × 100 k samples → 10 000 expected per bucket.
    // Tolerance: 5 % (±500 per bucket).
    // For Binomial(100 000, 0.1): σ ≈ 95, so ±500 ≈ ±5.3 σ — essentially impossible to flake
    // on a fair generator, and will catch any generator biased by ≥ 1 %.
    const BUCKETS = 10;
    const SAMPLES = 100_000;
    const TOLERANCE = 0.05; // 5 %

    const counts = new Map<number, number>(
      Array.from({ length: BUCKETS }, (_, i) => [i, 0] as [number, number]),
    );
    for (let i = 0; i < SAMPLES; i++) {
      const idx = randomInt(BUCKETS);
      counts.set(idx, (counts.get(idx) ?? 0) + 1);
    }

    const expected = SAMPLES / BUCKETS;
    for (let i = 0; i < BUCKETS; i++) {
      const count = counts.get(i) ?? 0;
      expect(count).toBeGreaterThanOrEqual(Math.floor(expected * (1 - TOLERANCE)));
      expect(count).toBeLessThanOrEqual(Math.ceil(expected * (1 + TOLERANCE)));
    }
  });
});

describe('flipCoin', () => {
  it('only ever returns 2 or 3', () => {
    for (let i = 0; i < 2_000; i++) {
      const v = flipCoin();
      expect(v === 2 || v === 3).toBe(true);
    }
  });

  it('split is close to 50/50 over 100 k flips', () => {
    // Tolerance: 5 %. Binomial(100 000, 0.5): σ ≈ 158, so ±5 000 ≈ ±31 σ.
    // Cannot flake on a fair coin; will catch any generator with ≥ 5 % bias.
    const SAMPLES = 100_000;
    const TOLERANCE = 0.05; // 5 %
    let twos = 0;
    for (let i = 0; i < SAMPLES; i++) {
      if (flipCoin() === 2) twos++;
    }
    const ratio = twos / SAMPLES;
    expect(ratio).toBeGreaterThanOrEqual(0.5 - TOLERANCE);
    expect(ratio).toBeLessThanOrEqual(0.5 + TOLERANCE);
  });
});
