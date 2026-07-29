# I-Ching Oracle — Architecture

A static web page that casts an I-Ching hexagram with cryptographic randomness,
offers to read the result, and saves past casts device-locally for later review.
No backend, no accounts, no network. Cast history is written to `localStorage`
only; nothing is transmitted to any server.

## Stack

- **Language:** TypeScript (strict).
- **Build/dev:** Vite 5 → builds to static `dist/` (HTML/JS/CSS). No server.
- **UI:** Vanilla DOM. No framework — the surface is a single cast action plus a
  reading view; React/Next would add weight and a build/runtime cost with no
  payoff for a lightweight page with device-local history.
- **Tests:** Vitest (Node environment).
- **Runtime:** Node 20+ for tooling; the shipped artifact is plain static files.

### Why this stack

The hard requirements (static, no network, no cookies/sessionStorage/IndexedDB,
device-local cast history (opt-in), question stored only when user explicitly
saves (device-local, never transmitted), Web Crypto only, graceful degradation
when storage is unavailable) are best served by the
smallest thing that builds to static files and typechecks strictly. Vite + TS +
vanilla DOM has no server and no framework runtime — exactly the constraints.
Vitest shares Vite's config and transform, so tests need no separate toolchain.

## Ordering rule (must read)

Lines are ALWAYS ordered **bottom-to-top**. In every `Line[]` and every
6-element array (including `Hexagram.lines` and all `binary` strings), **index 0
is the bottom line (position 1)** and index 5 is the top line (position 6).
`'1'` = yang, `'0'` = yin. Never reverse or reinterpret these arrays. The shared
contract in `src/types.ts` encodes this in the types and JSDoc.

## Randomness rule (must read)

The only entropy source is Web Crypto (`crypto.getRandomValues`) with **rejection
sampling** to avoid modulo bias. `Math.random` is BANNED anywhere on the casting
path (`src/engine/*`). Tank should add a test/lint check that greps the engine
for `Math.random`.

## Module boundaries & ownership

| Module | Owner | Responsibility |
| --- | --- | --- |
| `src/types.ts` | Niobe | Shared data contract (frozen — change via design huddle). |
| `src/engine/random.ts` | Switch | CSPRNG + rejection sampling. |
| `src/engine/cast.ts` | Switch | Three-coin rolls, bottom-up line generation, changing lines, transform. |
| `src/engine/hexagram.ts` | Switch | Binary ↔ King Wen lookup, trigram derivation. |
| `src/data/hexagrams.ts` | Seraph | The 64-hexagram corpus + lookups. |
| `src/ui/castingPage.ts` | Trinity | Casting page + line rendering. |
| `src/ui/readingView.ts` | Trinity | Reading/interpretation view; triggers opt-in save to storage. |
| `src/ui/historyPanel.ts` | Trinity | History panel: renders saved casts, joins hexagram refs to names via corpus, calls storage read/delete/clear. |
| `src/storage/history.ts` | Trinity | Versioned cast history: user-initiated `localStorage` read/write with in-memory fallback, capped at 50 entries, question normalised and capped at 1000 chars. Validates all data read back before use. |
| `src/main.ts` | Trinity | App bootstrap (wiring + history integration). |
| `tests/*` | Tank | All tests. |

Owners work in parallel against the signatures below; no two owners touch the
same file.

## Contracts to implement

### `src/engine/random.ts` — Switch
```ts
function randomInt(max: number): number;   // uniform [0, max), rejection sampling, Web Crypto only
function flipCoin(): 2 | 3;                 // fair coin: 2 = yin face, 3 = yang face
```

### `src/engine/cast.ts` — Switch
```ts
function rollThreeCoins(): CoinTriplet;              // three coins from the CSPRNG
function castLine(position: LinePosition): Line;     // one line at position (1 = bottom)
function coinsToValue(coins: CoinTriplet): LineValue;// coin sum → 6/7/8/9
function castHexagram(): Cast;                        // six lines bottom→top + primary/changing/transformed
```

### `src/engine/hexagram.ts` — Switch
```ts
function linesToBinary(lines: Line[]): string;        // base polarity → 6-char binary, bottom→top
function transformedBinary(lines: Line[]): string;    // after flipping changing lines
function binaryToHexagram(binary: string): HexagramRef;
function deriveTrigrams(binary: string): { upper: TrigramRef; lower: TrigramRef };
```

### `src/data/hexagrams.ts` — Seraph
```ts
const HEXAGRAMS: readonly Hexagram[];                 // exactly 64 entries
function getHexagramByNumber(n: number): Hexagram;    // 1..64
function getHexagramByBinary(binary: string): Hexagram;
```

### `src/ui/castingPage.ts` — Trinity
```ts
function renderCastingPage(container: HTMLElement, onAnalyze: (cast: Cast) => void): void;
```

### `src/ui/readingView.ts` — Trinity
```ts
function renderReadingView(container: HTMLElement, cast: Cast): void;
```

## Dependency direction

`ui → engine → (types)` and `ui → data → (types)`. The engine resolves King Wen
numbers from its OWN hardcoded lookup table inside `hexagram.ts` (the King Wen
sequence is a fixed historical assignment with no derivable pattern) and must
not import the corpus; the UI joins a `Cast`'s `HexagramRef` to full `Hexagram`
content via `data/hexagrams.ts`. The engine's table and the corpus are two
independent representations of the same binary→number mapping, kept in agreement
by `tests/mapping-consistency.test.ts`. Types have no dependencies.

`storage` is a leaf module. Permitted directions: `ui → storage` (the UI calls
`saveCast`, `getHistory`, `deleteCast`, `clearHistory`); `storage → types` only
(storage imports shared type definitions from `src/types.ts` — nothing else).
`storage` **must not import the corpus** (`src/data/`) — denormalising display
text into localStorage would let stored data drift from the corpus exactly the
way the engine/corpus split was designed to prevent. Equally, nothing in
`engine/` or `data/` may import `storage/` — persistence is a leaf concern and
must never enter the casting path.

## Storage invariant (must read)

`localStorage` is directly editable via browser DevTools and will contain
payloads written by older versions of the code. Every value read from storage
**must pass validation before use in application logic** and must **never be
inserted via `innerHTML`** — use `textContent` or DOM construction. The
`question` field in particular is user-authored text that makes a round trip
through localStorage; it must be treated as untrusted input at the display
layer regardless of the validation done on read-back.

**Saving is user-initiated only.** No module may write to storage as a side
effect of casting. A cast is persisted only when the user explicitly requests
it (e.g. by clicking "Save reading locally"). This is the property that keeps
the privacy claim true — the question field makes it especially important,
because auto-saving would capture the question without the user's awareness.
Future contributors must not add convenience saves anywhere in `engine/` or in
a casting callback.

**The question field is stored in full (up to 1000 characters), normalised on
write.** `saveCast` collapses whitespace and trims the question before storing;
it does NOT truncate for display — that is the UI layer's responsibility
(currently in CSS). Truncating in storage would be lossy and irreversible: the
user would lose characters that were deliberately saved.

**Double-save guard: verify on hit, not evict on delete.** `saveCast` maintains
a `WeakMap<Cast, SavedCast>` to prevent duplicate writes on rapid double-clicks.
On a cache hit it verifies the remembered record still exists in storage before
returning it; if the id is gone (deleted, cleared, or wiped via DevTools) the
save proceeds as fresh. The obvious alternative — evicting the `WeakMap` entry
inside `deleteCast` and `clearHistory` — cannot work because `WeakMap` is not
enumerable, so `clearHistory` could never walk it. That approach would fix the
`deleteCast` path and silently leave the `clearHistory` path broken. Verification
on hit is the only approach that closes both holes.

## Commands

- `npm run dev` — local dev server.
- `npm run build` — typecheck + static build to `dist/`.
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — Vitest.
