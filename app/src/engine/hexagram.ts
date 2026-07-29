/**
 * Hexagram derivation: convert cast lines into binary codes, look up King Wen
 * numbers, and derive trigrams.
 *
 * OWNER: Switch. King Wen table correction: Niobe.
 */

import type { HexagramRef, Line, TrigramRef } from '../types';

/**
 * All 64 King Wen numbers keyed by their 6-char BOTTOM-to-top binary string.
 * Index 0 of each key is the bottom line; `'1'` = yang, `'0'` = yin. The lower
 * trigram is `key.slice(0,3)` (lines 1-3), the upper is `key.slice(3,6)`
 * (lines 4-6).
 *
 * The King Wen sequence is a fixed historical assignment with no derivable
 * pattern, so this hardcoded lookup is the only honest implementation. The
 * engine must derive numbers structurally and MUST NOT import the corpus
 * (`src/data/hexagrams.ts`); the cross-module table below is the engine's own
 * source of truth. See ARCHITECTURE.md "Dependency direction".
 */
const KING_WEN: Readonly<Record<string, number>> = {
  '111111': 1,
  '000000': 2,
  '100010': 3,
  '010001': 4,
  '111010': 5,
  '010111': 6,
  '010000': 7,
  '000010': 8,
  '111011': 9,
  '110111': 10,
  '111000': 11,
  '000111': 12,
  '101111': 13,
  '111101': 14,
  '001000': 15,
  '000100': 16,
  '100110': 17,
  '011001': 18,
  '110000': 19,
  '000011': 20,
  '100101': 21,
  '101001': 22,
  '000001': 23,
  '100000': 24,
  '100111': 25,
  '111001': 26,
  '100001': 27,
  '011110': 28,
  '010010': 29,
  '101101': 30,
  '001110': 31,
  '011100': 32,
  '001111': 33,
  '111100': 34,
  '000101': 35,
  '101000': 36,
  '101011': 37,
  '110101': 38,
  '001010': 39,
  '010100': 40,
  '110001': 41,
  '100011': 42,
  '111110': 43,
  '011111': 44,
  '000110': 45,
  '011000': 46,
  '010110': 47,
  '011010': 48,
  '101110': 49,
  '011101': 50,
  '100100': 51,
  '001001': 52,
  '001011': 53,
  '110100': 54,
  '101100': 55,
  '001101': 56,
  '011011': 57,
  '110110': 58,
  '010011': 59,
  '110010': 60,
  '110011': 61,
  '001100': 62,
  '101010': 63,
  '010101': 64,
};

/**
 * Bottom-to-top binary → traditional trigram name (pinyin).
 * Bit order: index 0 = bottom line of the trigram.
 *
 *   '111' Qian — heaven     '110' Dui   — lake
 *   '101' Li   — fire       '100' Zhen  — thunder
 *   '011' Xun  — wind       '010' Kan   — water
 *   '001' Gen  — mountain   '000' Kun   — earth
 */
const TRIGRAM_NAMES: Readonly<Record<string, string>> = {
  '111': 'Qian',
  '110': 'Dui',
  '101': 'Li',
  '100': 'Zhen',
  '011': 'Xun',
  '010': 'Kan',
  '001': 'Gen',
  '000': 'Kun',
};

/**
 * Builds the 6-character, BOTTOM-to-TOP binary string for a set of cast lines
 * using each line's BASE polarity (before any transformation).
 * `'1'` = yang, `'0'` = yin; index 0 = bottom line.
 *
 * @param lines The six cast lines, bottom-to-top.
 * @returns A 6-character binary string.
 */
export function linesToBinary(lines: Line[]): string {
  return lines
    .map(l => (l.value === 7 || l.value === 9) ? '1' : '0')
    .join('');
}

/**
 * Builds the 6-character, BOTTOM-to-TOP binary string AFTER flipping every
 * changing line (values 6 and 9) to its opposite polarity.
 *
 * Transformation rules:
 *   old yin  (6) → yang → '1'   old yang (9) → yin → '0'
 *   young yang (7) → unchanged → '1'   young yin (8) → unchanged → '0'
 *
 * Equivalently: '1' when value is 6 or 7, '0' when value is 8 or 9.
 *
 * @param lines The six cast lines, bottom-to-top.
 * @returns A 6-character binary string for the transformed hexagram.
 */
export function transformedBinary(lines: Line[]): string {
  return lines
    .map(l => (l.value === 6 || l.value === 7) ? '1' : '0')
    .join('');
}

/**
 * Resolves a 6-character binary string (bottom-to-top) to a {@link HexagramRef}.
 *
 * @param binary A 6-character string of `'0'`/`'1'`, index 0 = bottom.
 * @returns The matching hexagram reference (number + binary).
 * @throws {Error} If `binary` is not a valid 6-bit code.
 */
export function binaryToHexagram(binary: string): HexagramRef {
  if (!/^[01]{6}$/.test(binary)) {
    throw new Error(`binaryToHexagram: invalid binary '${binary}'`);
  }
  const number = KING_WEN[binary];
  if (number === undefined) {
    throw new Error(`binaryToHexagram: unknown binary '${binary}'`);
  }
  return { number, binary };
}

/**
 * Derives the upper and lower trigrams from a 6-character binary string.
 * Lower trigram = bottom three lines (indices 0-2); upper = top three (3-5).
 *
 * @param binary A 6-character string of `'0'`/`'1'`, index 0 = bottom.
 * @returns The `{ upper, lower }` trigram references.
 */
export function deriveTrigrams(binary: string): { upper: TrigramRef; lower: TrigramRef } {
  const lowerBin = binary.slice(0, 3);
  const upperBin = binary.slice(3, 6);

  const lowerName = TRIGRAM_NAMES[lowerBin];
  const upperName = TRIGRAM_NAMES[upperBin];

  if (lowerName === undefined || upperName === undefined) {
    throw new Error(`deriveTrigrams: invalid binary string '${binary}'`);
  }

  return {
    lower: { binary: lowerBin, name: lowerName },
    upper: { binary: upperBin, name: upperName },
  };
}
