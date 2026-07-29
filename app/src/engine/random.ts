/**
 * Cryptographically-secure randomness primitives.
 *
 * OWNER: Switch.
 *
 * HARD RULE: the only entropy source permitted is Web Crypto
 * (`globalThis.crypto.getRandomValues`). `Math.random` is BANNED in this file
 * and anywhere else on the casting path. All bounded integers MUST use rejection
 * sampling to eliminate modulo bias.
 */

/**
 * Returns a uniformly-distributed integer in the half-open range `[0, max)`.
 *
 * WHY REJECTION SAMPLING:
 * A Uint32 value is uniform across all 2^32 possible bit patterns ([0, 2^32 − 1]).
 * If we naively computed `value % max`, the results in [0, 2^32 % max) would each
 * have one extra source value compared to [2^32 % max, max), producing a subtle
 * skew.  We eliminate this by computing:
 *
 *   threshold = floor(2^32 / max) * max
 *
 * This is the largest multiple of `max` that fits in the 32-bit draw space.
 * Any drawn value >= threshold falls in the incomplete "leftover" bucket and is
 * discarded; we redraw until we get a value below threshold.  Every accepted
 * value then maps to exactly `floor(2^32 / max)` source values, giving a
 * perfectly uniform distribution over [0, max).
 *
 * Expected number of iterations: 2^32 / threshold ≤ 2 for any max ≥ 1, so
 * loop termination is guaranteed with high probability on each attempt.
 *
 * @param max Exclusive upper bound. Must be a positive integer <= 2^32.
 * @returns An integer `n` with `0 <= n < max`, uniformly distributed.
 * @throws {RangeError} If `max` is not a positive integer <= 2^32.
 */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 0x100000000) {
    throw new RangeError(
      `randomInt: max must be a positive integer <= 2^32; got ${max}`
    );
  }
  // threshold is the largest multiple of max that fits within [0, 2^32).
  // Values in [threshold, 2^32 - 1] are biased remainders and must be rejected.
  const threshold = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    globalThis.crypto.getRandomValues(buf);
    value = buf[0]!; // Uint32Array is always filled; non-null assertion is safe
  } while (value >= threshold);
  return value % max;
}

/**
 * Flips one fair coin using the CSPRNG.
 *
 * @returns `2` (yin face) or `3` (yang face), each with probability 1/2.
 */
export function flipCoin(): 2 | 3 {
  return randomInt(2) === 0 ? 2 : 3;
}
