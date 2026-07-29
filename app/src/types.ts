/**
 * Shared data contract for the I-Ching Oracle.
 *
 * ORDERING RULE (non-negotiable): lines are ALWAYS ordered bottom-to-top.
 * In every `Line[]` array, index 0 is the BOTTOM line (position 1) and index 5
 * is the TOP line (position 6). The same convention applies to every 6-element
 * array in this file (e.g. `Hexagram.lines`, binary strings — see notes below).
 * Do not reorder, reverse, or reinterpret these arrays anywhere in the codebase.
 */

/**
 * The value of a single cast line, using the traditional coin-oracle numbering:
 * - `6` = old yin    (⚏ changing, yin  → becomes yang)
 * - `7` = young yang (⚊ stable,   yang)
 * - `8` = young yin  (⚋ stable,   yin)
 * - `9` = old yang   (⚊ changing, yang → becomes yin)
 */
export type LineValue = 6 | 7 | 8 | 9;

/**
 * A single coin's face value in a three-coin roll.
 * - `2` = "tails" / yin face  (contributes 2)
 * - `3` = "heads" / yang face (contributes 3)
 *
 * The three coins sum to the `LineValue` (2+2+2=6 … 3+3+3=9).
 */
export type CoinValue = 2 | 3;

/**
 * The result of one three-coin roll: exactly three coins.
 */
export type CoinTriplet = [CoinValue, CoinValue, CoinValue];

/**
 * 1-based line position within the hexagram. `1` is the BOTTOM line, `6` is the
 * TOP line. Equal to the array index + 1 in any bottom-to-top `Line[]`.
 */
export type LinePosition = 1 | 2 | 3 | 4 | 5 | 6;

/** Polarity of a line, derived from its value (6/8 = yin, 7/9 = yang). */
export type Polarity = 'yin' | 'yang';

/**
 * One fully-described cast line.
 */
export interface Line {
  /** The coin-oracle value 6/7/8/9. */
  value: LineValue;
  /** 1-based position; `1` = bottom, `6` = top. Redundant with array index for safety/clarity. */
  position: LinePosition;
  /** The three coin faces that produced `value`. Sum equals `value`. */
  coins: CoinTriplet;
  /** Base polarity of this line as cast (6/8 → 'yin', 7/9 → 'yang'). */
  polarity: Polarity;
  /** True for old lines (6 or 9): these are the "changing" lines that transform. */
  changing: boolean;
}

/**
 * A lightweight reference to a hexagram by its King Wen number and binary code.
 * Kept minimal so a `Cast` can name its hexagrams without embedding the full
 * corpus; consumers resolve the full `Hexagram` via the data module when needed.
 */
export interface HexagramRef {
  /** King Wen sequence number, 1..64. */
  number: number;
  /**
   * 6-character binary string, one char per line, BOTTOM-to-TOP (index 0 = bottom).
   * `'1'` = yang line, `'0'` = yin line.
   */
  binary: string;
}

/**
 * The complete outcome of a divination.
 */
export interface Cast {
  /**
   * The six cast lines, bottom-to-top. `lines[0]` is the bottom line (position 1),
   * `lines[5]` is the top line (position 6). Always length 6.
   */
  lines: Line[];
  /** The primary hexagram, derived from each line's base polarity. */
  primary: HexagramRef;
  /**
   * 1-based positions of the changing lines (values 6 or 9), ascending.
   * Empty when there are no changing lines. Values are in the range 1..6.
   */
  changing: LinePosition[];
  /**
   * The transformed hexagram obtained by flipping every changing line to its
   * opposite polarity. `null` when there are no changing lines (nothing transforms).
   */
  transformed: HexagramRef | null;
}

/**
 * A trigram reference used to describe a hexagram's upper and lower halves.
 */
export interface TrigramRef {
  /**
   * 3-character binary string, BOTTOM-to-TOP within the trigram (index 0 = bottom).
   * `'1'` = yang, `'0'` = yin.
   */
  binary: string;
  /** Traditional trigram name in pinyin (e.g. "Qian", "Kun"). */
  name: string;
}

/**
 * A full corpus entry for one of the 64 hexagrams.
 */
export interface Hexagram {
  /** King Wen sequence number, 1..64. */
  number: number;
  /**
   * 6-character binary string, BOTTOM-to-TOP (index 0 = bottom line).
   * `'1'` = yang, `'0'` = yin.
   */
  binary: string;
  /** Chinese name (e.g. "乾"). */
  nameZh: string;
  /** Pinyin romanization (e.g. "Qián"). */
  namePinyin: string;
  /** English name (e.g. "The Creative"). */
  nameEn: string;
  /** The two constituent trigrams. */
  trigrams: {
    /** Upper trigram = lines 4-6 (the top three lines). */
    upper: TrigramRef;
    /** Lower trigram = lines 1-3 (the bottom three lines). */
    lower: TrigramRef;
  };
  /** The Judgment (Tuan) text. */
  judgment: string;
  /** The Image (Xiang) text. */
  image: string;
  /**
   * Per-line commentary, BOTTOM-to-TOP. Exactly 6 entries; `lines[0]` is the
   * bottom line (position 1), `lines[5]` is the top line (position 6).
   */
  lines: string[];
}
