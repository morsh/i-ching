/**
 * Cross-module consistency check: the engine's hardcoded binary→King Wen table
 * (src/engine/hexagram.ts) must agree with the corpus (src/data/hexagrams.ts)
 * for every one of the 64 hexagrams.
 *
 * Owner: Tank
 * Blocks on: Niobe (engine table fix) + Seraph (corpus population)
 *
 * WHY THIS TEST EXISTS: after Switch's binaryToHexagram is rewritten to embed
 * a private 64-entry lookup table instead of importing the corpus, there are
 * two independent representations of the same binary→number mapping. This test
 * is the only gate that will catch them drifting apart.
 */

import { describe, it, expect } from 'vitest';
import { HEXAGRAMS } from '../src/data/hexagrams';
import { binaryToHexagram } from '../src/engine/hexagram';

describe('engine table ↔ corpus cross-check', () => {
  it('corpus is fully populated before cross-check can run', () => {
    // This is an explicit prerequisite guard. If the corpus is empty the
    // remaining tests would vacuously pass without checking anything.
    expect(HEXAGRAMS).toHaveLength(64);
  });

  it('binaryToHexagram(hex.binary).number === hex.number for every corpus entry', () => {
    // For each hexagram in the corpus, ask the engine to resolve the same
    // binary string and confirm the King Wen number matches.
    // A mismatch means the hardcoded engine table and the corpus are out of sync.
    for (const hex of HEXAGRAMS) {
      const ref = binaryToHexagram(hex.binary);
      expect(ref.number).toBe(hex.number);
    }
  });

  it('binaryToHexagram(hex.binary).binary === hex.binary for every corpus entry', () => {
    // The ref must echo the binary string unchanged.
    for (const hex of HEXAGRAMS) {
      const ref = binaryToHexagram(hex.binary);
      expect(ref.binary).toBe(hex.binary);
    }
  });

  it('every corpus binary is resolvable by the engine without throwing', () => {
    // No corpus entry should produce an "unknown binary" error.
    for (const hex of HEXAGRAMS) {
      expect(() => binaryToHexagram(hex.binary)).not.toThrow();
    }
  });
});
