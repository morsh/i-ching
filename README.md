# I-Ching Oracle

**https://morsh.github.io/i-ching/**

A static web page that casts an I-Ching hexagram using the traditional
three-coin method, then offers to display the reading. Readings stay on your
device if you choose to save them; nothing is ever transmitted.

## What it does

You cast a hexagram by rolling three coins six times, once for each line from
the bottom up. The result is one of the 64 hexagrams of the King Wen sequence,
with a Judgment, an Image, and optional per-line commentary. If any lines are
"changing" (old yin or old yang), a second — transformed — hexagram is derived
by flipping those lines to their opposite polarity.

## How the casting works

Each of the six lines is determined by rolling three coins. Each coin face is
worth 2 (tails / yin) or 3 (heads / yang). The three coins are summed to
produce a line value:

| Sum | Name       | Symbol | Changing? | Probability |
|-----|-----------|--------|-----------|-------------|
| 6   | old yin   | ⚏      | yes → yang | 1/8 (12.5%) |
| 7   | young yang| ⚊      | no         | 3/8 (37.5%) |
| 8   | young yin | ⚋      | no         | 3/8 (37.5%) |
| 9   | old yang  | ⚊      | yes → yin  | 1/8 (12.5%) |

Lines are cast bottom-to-top (line 1 first, line 6 last). Values 6 and 9 are
"changing lines": they contribute to the primary hexagram with their base
polarity, then flip to produce the transformed hexagram.

## Randomness guarantee

All coin flips use **Web Crypto `crypto.getRandomValues`** with rejection
sampling to eliminate modulo bias. `Math.random` is banned on the casting path
and a dedicated test (`tests/no-math-random.test.ts`) enforces this
statically.

The empirical distribution over 200 000 sampled lines landed within **0.14
percentage points** of the theoretical 1/8 : 3/8 : 3/8 : 1/8 split — verified
by `tests/cast.test.ts`.

## Privacy

**Nothing is kept by default.** Completing a cast writes nothing, anywhere. A
reading is stored on your device only when you explicitly click the
**"Save reading locally"** button at the bottom of the reading. If you never
click it, nothing is persisted — not the cast, not the question, nothing.

**What is stored when you choose to save.** The record contains the six cast
lines (their values, coins, polarity, and changing flags), the primary and
transformed hexagram references, a timestamp, and — if you typed a question —
the question text, normalised and capped at 1000 characters. That is
everything in the record. Storage key is `iching-oracle:history:v1`, newest
first, capped at the 50 most recent entries. The interface shows
*"Saving will include your question."* next to the save button so you can see
this at the point of decision.

**Nothing ever leaves your device.** This guarantee is unconditional and holds
whether or not you save. There are no network requests of any kind after the
initial page load — no analytics, no telemetry, no third-party scripts, no
server session. Tests enforce this by banning `fetch`, `XMLHttpRequest`,
`navigator.sendBeacon`, and `WebSocket` throughout all of `src/`, and by
verifying that `src/storage/` — the only layer permitted to write to
`localStorage` — contains none of those primitives either. A separate test
confirms no external URLs appear in `index.html` and no remote fonts are loaded.

**No cookies, no `sessionStorage`, no IndexedDB.** `localStorage` is the only
storage mechanism, and it is confined to `src/storage/`. All other persistence
and network APIs are statically banned across the codebase.

**Managing your history.** You can delete individual saved readings or clear
the entire history from the interface. You can also remove the key directly via
DevTools → Application → Local Storage.

**If storage is unavailable** (Safari Private Browsing, storage disabled by
policy, or quota exhausted), the app detects this at startup and degrades
gracefully — casting and reading work exactly as normal; history is simply not
persisted.

## Getting started

```bash
cd app
npm install
npm run dev       # local dev server (Vite)
npm run build     # type-check then production bundle
npm test          # run the test suite (Vitest)
```

`npm run preview` serves the production build locally for a quick smoke-test.

## Live site

The production build is published to **https://morsh.github.io/i-ching/** via
GitHub Actions. Deploys are triggered by pushes to the `prod` branch (`main`
is for development). The workflow runs tests and builds before deploying;
refer to `.github/workflows/` for the current definition.

## Project layout

```
(repo root)/
├── app/
│   └── src/
│       ├── types.ts          # shared TypeScript interfaces (Hexagram, Cast, …)
│       ├── engine/           # casting logic — pure functions, no DOM, no corpus
│       │   ├── random.ts     # crypto.getRandomValues + rejection sampling
│       │   ├── cast.ts       # three-coin rolls, line generation, changing lines
│       │   └── hexagram.ts   # binary ↔ King Wen number lookup, trigram derivation
│       ├── data/
│       │   └── hexagrams.ts  # complete 64-hexagram corpus (judgment, image, lines)
│       ├── storage/
│       │   └── history.ts    # localStorage persistence — save, retrieve, delete casts; graceful fallback
│       └── ui/               # DOM rendering — reads from engine and data
│           ├── castingPage.ts
│           └── readingView.ts
└── .squad/                   # squad config, charters, and routing (committed)
```

**Dependency direction:** `ui` imports from `engine` and `data`; `engine` never
imports the corpus. This keeps the casting logic independently testable and
keeps the large data file out of the critical path for unit tests.

## Content and licensing

The 64 hexagram texts (Judgment, Image, and the six per-line commentaries) are
**original paraphrases** written by the project team in a modern, reflective
voice. They draw on James Legge's 1882 translation (*The I Ching*, Sacred Books
of the East Vol. XVI), which is in the public domain. No text from the
Wilhelm/Baynes translation (1924/1950) or any other in-copyright edition is
reproduced.

## A note on readings

The I-Ching is a several-thousand-year-old Chinese philosophical and
divinatory text. This tool treats it with respect and presents it as a
reflective practice, not a predictive one.

**Readings are for reflection and contemplation only.** They are not medical,
legal, financial, or psychiatric advice.
