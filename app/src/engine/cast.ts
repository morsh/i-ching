/**
 * The casting engine: three-coin rolls, bottom-up line generation, changing-line
 * detection, and transformed-hexagram derivation.
 *
 * OWNER: Switch.
 *
 * All randomness MUST come from `./random` (Web Crypto). `Math.random` is banned.
 */

import type { CoinTriplet, Line, LinePosition, LineValue, Cast } from '../types';
import { flipCoin } from './random';
import { linesToBinary, transformedBinary, binaryToHexagram } from './hexagram';

/**
 * Rolls three coins and returns the raw triplet.
 *
 * @returns Three {@link CoinValue}s (each 2 or 3) drawn from the CSPRNG.
 */
export function rollThreeCoins(): CoinTriplet {
  return [flipCoin(), flipCoin(), flipCoin()];
}

/**
 * Maps a coin sum to its line value. (2+2+2=6 … 3+3+3=9.)
 *
 * @param coins A three-coin roll.
 * @returns The corresponding {@link LineValue} (6, 7, 8, or 9).
 */
export function coinsToValue(coins: CoinTriplet): LineValue {
  return (coins[0] + coins[1] + coins[2]) as LineValue;
}

/**
 * Casts a single line at the given position from one three-coin roll.
 *
 * @param position 1-based position; `1` = bottom line, `6` = top line.
 * @returns A fully-populated {@link Line} whose `value` is the coin sum
 *          (6/7/8/9) and whose `changing`/`polarity` fields are derived from it.
 */
export function castLine(position: LinePosition): Line {
  const coins = rollThreeCoins();
  const value = coinsToValue(coins);
  return {
    value,
    position,
    coins,
    polarity: (value === 6 || value === 8) ? 'yin' : 'yang',
    changing: value === 6 || value === 9,
  };
}

/**
 * Performs a full cast: six lines from the BOTTOM up (position 1 → 6), then
 * derives the primary hexagram, the changing-line positions, and the transformed
 * hexagram (or `null` when no lines change).
 *
 * BOTTOM-TO-TOP ORDER is the single most important convention in this project:
 * lines[0] is position 1 (the bottom line), lines[5] is position 6 (the top line).
 * Position 1 is ALWAYS cast first; position 6 is ALWAYS cast last.
 *
 * @returns The complete {@link Cast}. `lines` is length 6, index 0 = bottom.
 */
export function castHexagram(): Cast {
  // Cast all six lines in strict bottom-to-top order so that:
  //   lines[0].position === 1  (bottom)
  //   lines[5].position === 6  (top)
  const positions: LinePosition[] = [1, 2, 3, 4, 5, 6];
  const lines = positions.map(castLine);

  const primaryBin = linesToBinary(lines);
  const primary = binaryToHexagram(primaryBin);

  // Collect changing positions in ascending order (already sorted since we
  // iterate positions 1→6).
  const changing: LinePosition[] = lines
    .filter(l => l.changing)
    .map(l => l.position);

  // transformed is null when there are no changing lines — nothing to flip.
  const transformed =
    changing.length > 0 ? binaryToHexagram(transformedBinary(lines)) : null;

  return { lines, primary, changing, transformed };
}
