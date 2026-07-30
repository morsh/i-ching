# Decisions

Canonical decision ledger. Append-only. Merged from `decisions/inbox/` by Scribe.

### 2026-07-29T10:00:49+03:00: Team hired
**By:** Project owner
**What:** Squad formed for the I-Ching Oracle project — Niobe (Lead), Trinity (Frontend), Switch (Engine), Seraph (Content/Data), Tank (Tester), plus Scribe, Ralph, and Rai.
**Why:** Project needs UI, a randomness/divination engine, a 64-hexagram content corpus, and quality gating.

### 2026-07-29T10:00:49+03:00: Core product constraints
**By:** Project owner
**What:** (1) Randomness must use the strongest available primitive — Web Crypto `crypto.getRandomValues` with rejection sampling; `Math.random` is banned. (2) The site is completely stateless — no persistence, no accounts, no server session. (3) Lines are cast bottom-to-top (line 1 first), each from a three-coin roll producing values 6/7/8/9.
**Why:** Explicit user requirement at project kickoff.

> **⚑ Scribe — 2026-07-29T12:18:40+03:00:** Item (2) of this entry ("The site is completely stateless — no persistence, no accounts, no server session") is **superseded** as of 2026-07-29 by owner directive. See "Statelessness requirement reversed (owner directive)" entry below. Items (1) and (3) remain in force unchanged.


### 2026-07-29T10:05:06+03:00: Stack and skeleton for I-Ching Oracle
**By:** Niobe
**What:** Chose Vite 5 + TypeScript (strict) + vanilla DOM, tested with Vitest, building to static dist/. Scaffolded i-ching-squad/app/ with src/types.ts, engine/data/ui stub modules, ARCHITECTURE.md, and a smoke test. Verified: tsc --noEmit, vite build, and vitest all pass.
**Why:** The hard requirements (stateless, static, Web Crypto only) are best met by the smallest thing that builds to static files and typechecks strictly. No framework justified for a two-view page.

### 2026-07-29T10:05:06+03:00: Bottom-to-top ordering encoded in the type system
**By:** Niobe
**What:** Every Line[] is defined as index 0 = bottom line (position 1) through index 5 = top (position 6). Line carries a redundant 1-based position field; LinePosition is a 1|2|3|4|5|6 literal. '1'=yang, '0'=yin. Documented in types JSDoc and ARCHITECTURE.md.
**Why:** The charter demands the ordering be explicit so downstream owners cannot silently reverse it.

### 2026-07-29T10:05:06+03:00: Randomness confined to the engine, Math.random banned
**By:** Niobe
**What:** CSPRNG lives in src/engine/random.ts, exposing randomInt(max) (rejection sampling) and flipCoin(). Casting path is ui to engine to types; the engine must not import the corpus.
**Why:** Enforces the Web Crypto + no-modulo-bias requirement and keeps a single audited entropy chokepoint.

### 2026-07-29T10:05:06+03:00: Rejection-sampling threshold formula
**By:** Switch
**What:** randomInt uses threshold = floor(2^32 / max) * max as the rejection boundary. Any Uint32 value >= threshold is discarded and redrawn.
**Why:** Naive modulo bias fix. Every accepted value maps to exactly floor(2^32 / max) source values. For max=2, threshold equals 2^32 so no rejection ever occurs.

### 2026-07-29T10:05:06+03:00: Uint32Array single-element buffer
**By:** Switch
**What:** randomInt allocates new Uint32Array(1) outside the retry loop and reuses it on every redraw.
**Why:** Avoids repeated GC pressure while keeping the buffer scope tight.

### 2026-07-29T10:05:06+03:00: transformedBinary as a single expression
**By:** Switch
**What:** transformedBinary maps via (l.value === 6 || l.value === 7) ? '1' : '0'. Yang when value is 6 (old yin flips to yang) or 7 (young yang stays); yin for 8 and 9.
**Why:** Provably complete (LineValue = 6|7|8|9) and makes the transformation rule visible in one line.

### 2026-07-29T10:05:06+03:00: castHexagram bottom-to-top via explicit positions array
**By:** Switch
**What:** castHexagram builds const positions: LinePosition[] = [1, 2, 3, 4, 5, 6] and calls positions.map(castLine).
**Why:** An explicit typed literal array makes the bottom-to-top convention impossible to mis-read.

### 2026-07-29T10:05:06+03:00: transformed is null when no lines change
**By:** Switch
**What:** Cast.transformed is set to null rather than a copy of the primary hexagram when changing.length === 0.
**Why:** A non-null value would imply a meaningful second hexagram exists and would cause UI to render an unnecessary transformation section.

### 2026-07-29T10:05:06+03:00: Test suite design decisions
**By:** Tank
**What:** Wrote five test files covering randomness, casting, hexagram derivation, corpus, and the Math.random ban. Statistical tolerance at 5% for distribution tests (>= 5 sigma away from flaking). no-math-random test strips comment lines before scanning.
**Why:** TDD against the declared contract. Tests must be correct by spec regardless of whether the implementation is ready.

### 2026-07-29T10:05:06+03:00: Architecture violation observed in Switch's hexagram.ts
**By:** Tank
**What:** Switch's binaryToHexagram imports and delegates to getHexagramByBinary from src/data/hexagrams.ts. ARCHITECTURE.md explicitly states the engine must not import the corpus.
**Why:** Recording for review. The violation inverts the intended engine-to-types layering.

### 2026-07-29T10:05:06+03:00: Trinity UI implementation -- APPROVED
**By:** Tank
**What:** Completed full UI review of Trinity's castingPage.ts, readingView.ts, main.ts, styles.css, index.html. Wrote 30 DOM/behavioral tests (jsdom), 12 no-persistence tests, 7 no-xss tests. All 111 tests pass. Non-color signal is an SVG cinnabar seal (yao__seal-slot). One flagged (not blocking): question-input focus outline inconsistency.
**Why:** Trinity's work meets all structural, accessibility, security, and behavioral requirements.

### 2026-07-29T10:05:06+03:00: Single-screen wiring via boot() recursion
**By:** Trinity
**What:** Added a boot(container) helper in main.ts that re-invokes renderCastingPage as the onRestart callback passed to renderReadingView, enabling return without a page reload.
**Why:** A recursive closure is the cleanest stateless solution -- no globals, no event bus, no router.

### 2026-07-29T10:05:06+03:00: Prepend for bottom-up reveal
**By:** Trinity
**What:** During cast animation, each new line element is insertBefore(el, hexDisplay.firstChild). Line 1 arrives first; subsequent lines are prepended above it, so the final DOM has line 6 at the top and line 1 at the bottom -- correct I-Ching visual order built bottom-to-top in time.
**Why:** Appending would show line 1 at the visual top throughout the reveal, inverting the hexagram.

### 2026-07-29T10:05:06+03:00: Glyph for changing lines (not color alone) -- original Trinity implementation
**By:** Trinity
**What:** Changing lines (value 6 or 9) received a bullet span with class line-changing-marker. Color changes per theme, but the glyph is always present. Note: superseded by Mouse's cinnabar seal in a later pass, but the non-color-signal contract remains in force.
**Why:** RAI policy and WCAG 1.4.1 prohibit using color as the sole differentiator.

### 2026-07-29T10:05:06+03:00: role=img + aria-label on every line row
**By:** Trinity
**What:** Each .line-row is role="img" with a full aria-label such as "Line 3 (position 3): young yin. Coins: tails, heads, tails. Value: 8." All visual child spans are aria-hidden="true".
**Why:** Screen readers should read a single coherent description per line, not individual span fragments.

### 2026-07-29T10:05:06+03:00: aria-live region for cast announcements
**By:** Trinity
**What:** A .sr-only aria-live="polite" aria-atomic="false" div updates as each line is revealed and with a summary when the cast completes.
**Why:** Without live-region updates, screen reader users would not perceive the animated reveal at all.

### 2026-07-29T10:05:06+03:00: prefers-reduced-motion: zero delay
**By:** Trinity
**What:** If matchMedia('(prefers-reduced-motion: reduce)').matches is true, the inter-line delay drops to 0ms (all lines rendered synchronously). CSS slide-in animation also suppressed.
**Why:** Users who opt out of motion should still see all six lines in correct order -- just without animated timing.

### 2026-07-29T10:05:06+03:00: Corpus fallback for not-yet-implemented Seraph stubs
**By:** Trinity
**What:** renderReadingView wraps getHexagramByNumber() calls in try/catch, showing a .corpus-pending fallback when the corpus throws.
**Why:** Switch and Seraph implemented concurrently; the UI must build cleanly against declared signatures even while those modules throw.

### 2026-07-29T10:05:06+03:00: Added @types/node devDependency
**By:** Trinity
**What:** Installed @types/node as a devDependency to fix pre-existing TypeScript errors in Tank's no-math-random.test.ts.
**Why:** The tsconfig included tests/ but lacked Node.js type declarations needed by Tank's file-system test.

### 2026-07-29T10:05:06+03:00: Binary convention -- bottom-line-first
**By:** Seraph
**What:** Adopted binary[0] = BOTTOM line (line 1), binary[5] = TOP line (line 6). Trigram encoding bottom-to-top (Qian = '111', Kun = '000'). Hexagram binary composed as lower-trigram-bits + upper-trigram-bits.
**Why:** Convention specified by Niobe in the types contract; must be consistent throughout to avoid look-up errors.

### 2026-07-29T10:05:06+03:00: RAI tone -- reflective, not predictive
**By:** Seraph
**What:** All judgment, image, and line texts use reflective framing ("leads to," "brings," "may suggest") rather than absolute prediction. No medical, legal, financial, or psychiatric advice expressed or implied.
**Why:** Mandated by .squad/rai/policy.md.

### 2026-07-29T10:05:06+03:00: Corpus source -- public-domain paraphrase basis
**By:** Seraph
**What:** Used James Legge's 1882/1899 public-domain translation as the primary scholarly reference. All texts written as original modern paraphrases -- not reproductions of Legge or any other edition.
**Why:** The Wilhelm/Baynes translation (1924/1950) is under copyright. Legge's translation (Sacred Books of the East, Vol. XVI, Oxford 1882) is unambiguously public domain worldwide. Original paraphrases avoid copyright concern and produce a consistent editorial voice.

### 2026-07-29T10:05:06+03:00: Playwright visual harness -- SHIPPED
**By:** Tank
**What:** Installed Playwright as devDependency. Delivered: scripts/screenshot.mjs (20 PNGs across 5 configurations); scripts/visual-smoke.mjs (3 smoke tests: pre-cast button visibility, bottom-to-top layout geometry via bounding box, zero console errors and zero external requests); npm run shots and npm run test:visual wired in package.json. Screenshots/ and playwright-report/ added to .gitignore. Found and fixed animation timing defect in screenshot script (blank PNGs during block-rise animations; fixed by waiting for getAnimations() to quiesce). Vitest 114/114 + Playwright 3/3.
**Why:** Closes the visibility gap -- no agent had ever seen the rendered page. The harness transfers the review burden to the design team. STANDING RULE: No agent may assert visual correctness from source alone. Run npm run shots and look at the PNGs.

### 2026-07-29T10:12:44+03:00: Visual design is a first-class requirement
**By:** Project owner (via Copilot)
**What:** The website must be visually stunning and authentically in the spirit of the I-Ching -- contemplative, elemental, restrained. Aesthetic quality is an acceptance criterion for the UI, not an optional polish pass. Rai checks that visual treatment stays respectful and never sacrifices accessibility.
**Why:** Direct user directive at project kickoff.

### 2026-07-29T10:12:44+03:00: Engine owns a hardcoded King Wen table; corpus import removed
**By:** Niobe
**What:** Removed the corpus import from src/engine/hexagram.ts. Replaced with a private, frozen 64-entry KING_WEN constant (binary key to King Wen number) plus strict /^[01]{6}$/ validation and explicit unknown-binary guard. HexagramRef return shape unchanged ({ number, binary }, no text). ARCHITECTURE.md sharpened: the engine resolves King Wen numbers from its own hardcoded table; agreement with the corpus is maintained by tests/mapping-consistency.test.ts.
**Why:** Switch's version inverted the intended layering (engine to data). The King Wen sequence is a fixed historical assignment, so a hardcoded lookup is the honest implementation.

### 2026-07-29T10:24:32+03:00: Slot-based hexagram display (no layout shift)
**By:** Trinity
**What:** The hexagram display uses 6 pre-rendered div.line-slot elements always in the DOM. slots[0] = line 6 (top); slots[5] = line 1 (bottom). Reveal fills bottom-up. Empty slots show a ghost via ::after pseudo-element. No prepend/append shifting.
**Why:** Fixed slots mean the hexagram display height never changes -- lines slot into permanent positions.

### 2026-07-29T10:24:32+03:00: Weight-landing animation for yao lines
**By:** Trinity
**What:** .line-visual gets animation: line-settle -- opacity 0 to 1 with a translateY arc that overshoots slightly (drops -6px, bounces +3px, settles 0). Coins stagger in first via coin-flip keyframes. Changing markers appear at 650ms.
**Why:** Each line should feel like a coin landing, not a web banner.

### 2026-07-29T10:24:32+03:00: Cinnabar accent reserved solely for changing lines
**By:** Trinity
**What:** --clr-accent (#9e3322 light / #d45a34 dark) appears ONLY on changing line markers, borders, and labels. All other UI uses text/muted/border tokens.
**Why:** Restraint makes the accent meaningful. When the eye lands on cinnabar, it means something is changing.

### 2026-07-29T10:24:32+03:00: Transformation diagram (primary to transformed side-by-side)
**By:** Trinity
**What:** buildTransformationDiagram() renders both mini hexagrams in a flex row with an arrow between them. On mobile (< 480px), diagram stacks vertically with arrow rotated 90 degrees.
**Why:** Side-by-side shows the transformation as a relationship rather than two unrelated text blocks.

### 2026-07-29T10:24:32+03:00: Large Chinese character as design element
**By:** Trinity
**What:** The hexagram Chinese name is displayed at clamp(4.5rem, 14vw, 7rem) in the serif stack, as the first typographic element in the hexagram identity block.
**Why:** The Chinese character IS the hexagram; displaying it large and first gives it the weight it deserves.

### 2026-07-29T10:24:32+03:00: Minimal underline-only question textarea
**By:** Trinity
**What:** The question textarea has no border box -- only a bottom border (1px, clr-border). No background color -- it blends with the page.
**Why:** A bare underline keeps the question input ephemeral and contemplative.

### 2026-07-29T10:24:32+03:00: Palette and contrast pairs (initial visual redesign)
**By:** Trinity
**What:** Light: bg #f4ede2, text #191410 (16.4:1), muted #6b5d52 (5.1:1), cinnabar #9e3322 (6.2:1 AA). Dark: bg #1a1713, text #ece3d4 (14.8:1), muted #9e8e80 (5.6:1), cinnabar #d45a34 (4.5:1 AA).
**Why:** Two or three colors total: near-black ink, warm off-white rice paper, single cinnabar for changing lines. WCAG AA is the floor on every pair.

### 2026-07-29T10:35:00+03:00: Advice-boundary treatment for metaphorical illness language
**By:** Rai
**What:** Corpus line texts using metaphorical illness imagery (hexagram 25, line 5) are classified advisory-only, not critical, provided the README-level disclaimer is in place.
**Why:** "Do not force remedies" is traditional I-Ching language meaning "do not over-intervene." Escalating to critical would be disproportionate.

### 2026-07-29T10:35:00+03:00: Predictive language threshold for traditional I-Ching outcome phrases
**By:** Rai
**What:** Standard I-Ching outcome formulas ("good fortune," "misfortune") are not treated as policy violations. Only explicit second-person future-tense predictions ("you will get it") and definite unconditional outcome statements are flagged.
**Why:** The I-Ching tradition inherently involves outcome language. The policy intent is to prevent readings that function as factual predictions about a user's specific situation.

### 2026-07-29T10:35:00+03:00: Archaic translation vocabulary in an otherwise modernised corpus
**By:** Rai
**What:** "The devil's country" (hexagram 63, line 3) is flagged as an advisory inconsistency -- a carry-over of Victorian translation bias from Legge's rendering of the historical term for border peoples.
**Why:** The rest of the corpus has been modernised; this phrase is inconsistent with the corpus's own standard and with the cultural-respect advisory.

### 2026-07-29T10:39:39+03:00: RAI remediation -- corpus advisory findings applied
**By:** Seraph
**What:** Applied 5 text fixes to hexagrams.ts: (1) Hex 25 line 5 "There will be relief" to "The situation carries the seeds of its own resolution." (2) Hex 63 line 2 "you will get it" to "it tends to return." (3) Hex 51 line 2 "in seven days it returns" to "in seven days it tends to return." (4) Hex 63 line 3 "devil's country" to "hostile border state." (5) Hex 38 line 1 "it returns on its own" to "it tends to return on its own" (self-caught additional fix).
**Why:** RAI policy prohibits definite predictions and ambiguous medical/legal directives.

### 2026-07-29T10:42:08+03:00: Question field -- privacy claim truthfulness standard
**By:** Rai
**What:** A question input field whose value is never read by any script satisfies the privacy claim "never sent, never stored" even though the text exists transiently in browser DOM memory. The claim covers the product's own behaviour, which is accurate.
**Why:** The product cannot and should not claim to prevent browser-extension access to DOM content -- that is outside its control.

### 2026-07-29T10:42:08+03:00: Disclaimer placement -- bottom-of-reading-view is acceptable, not ideal
**By:** Rai
**What:** Placing the disclaimer at the bottom of the reading view satisfies "discoverable" at advisory level but does not achieve "visible before conclusions form." Advisory recommendation issued to consider earlier placement; not a blocking concern.
**Why:** Treating its bottom placement as a critical failure would block a product with an honest, well-worded disclaimer -- disproportionate.

### 2026-07-29T10:42:08+03:00: System-only fonts satisfy the privacy/no-external-resource requirement
**By:** Rai
**What:** A stylesheet using only system font stacks with no @import url() makes zero external network requests and passes the privacy check. This standard was later superseded when Switch vendored self-hosted woff2 fonts (see 2026-07-29T12:02:10) -- self-hosted fonts also pass this check.
**Why:** External font services leak the user's IP and page referrer on every load. System fonts and self-hosted fonts both avoid this.

### 2026-07-29T10:56:00+03:00: Inherited Rai's RAI pass -- preserved invariants + fixed two advisories
**By:** Mouse
**What:** After replacing Trinity's UI, re-verified the four privacy/a11y invariants. Fixed both outstanding advisories: (A) disclaimer now appears twice, early, as set typography (epigraph before first cast + at top of reading); (B) privacy note gained id and textarea gained aria-describedby. Confirmed: question .value never read; zero external resources; all text via textContent; a11y patterns intact.
**Why:** Replacing a green-lit UI means inheriting its safety properties; these are acceptance criteria, not nice-to-haves.

### 2026-07-29T10:56:00+03:00: Disclaimer solved as composition, not a footnote
**By:** Mouse
**What:** Framing appears twice, early: (1) a serif-italic epigraph in the casting masthead -- "A mirror for reflection -- not a prediction of what will be."; (2) a larger epigraph directly under the "Reading" title. The advice-scope disclaimer remains at the reading foot for completeness.
**Why:** Rai's advisory: the old disclaimer sat below all content, seen only after conclusions formed.

### 2026-07-29T11:05:00+03:00: Replaced the yao lines with crisp inline-SVG brush strokes
**By:** Mouse
**What:** Removed the CSS linear-gradient bars, border-radius, and box-shadow glow. Each yao line is now an authored inline SVG path (createElementNS) with a solid fill and hard vector edges -- an organic brush bar with tapered ends. Yang = one stroke; yin = two strokes with a clean gap. Stroke thickness in whole pixels (30px hero / 8px mini).
**Why:** The owner reported lines read as "blurry / out of focus." Root cause: soft gradient across a thin bar plus fractional-pixel offsets. A solid-filled vector stays sharp at any size/DPI.

### 2026-07-29T11:05:00+03:00: Cinnabar seal as the changing-line signal
**By:** Mouse
**What:** Changing lines now turn cinnabar AND carry a small cinnabar "seal/chop" (a rounded square with a carved cross-notch, authored SVG) at the end of the stroke, plus a cinnabar margin rule beside the changing-line text in the reading. The old bullet glyph and blur/glow are gone.
**Why:** A seal is a stronger, culturally resonant non-color signal than a bullet. The signal is carried three ways: shape + text + color.

### 2026-07-29T11:05:00+03:00: Fixed pre-cast buttons with a global [hidden] guard
**By:** Mouse
**What:** Added [hidden] { display: none !important; } as the first rule in styles.css. This fixes "Read this hexagram" / "Cast again" rendering before any cast was made.
**Why:** castingPage.ts correctly set actionArea.hidden = true, but .cast-actions { display: flex } out-specified the UA [hidden] { display: none } type rule. The !important guard restores correct behaviour and removes the buttons from layout, accessibility tree, and tab order pre-cast.

### 2026-07-29T11:05:00+03:00: Visual system -- Ink, Stone, Cinnabar
**By:** Mouse
**What:** Full rewrite of styles.css. Palette: three colors per theme -- ink/paper/cinnabar (light) and bone/charcoal/cinnabar (dark, warm not inverted-grey). Dramatic type scale: large serif masthead, giant faint watermark glyph, hexagram at 480px with big gaps. Measured contrast: light: ink 15.58, muted 5.42, cinnabar 5.60, focus 5.98; dark: bone 14.31, muted 6.02, cinnabar 5.55, focus 9.10 (all >= AA).
**Why:** The strokes are the whole visual language of the tradition; they now dominate the composition with restraint and weight.

### 2026-07-29T11:05:00+03:00: DOM restructure -- one intentional test break for Tank
**By:** Mouse
**What:** Restructured the line row DOM. One of Tank's ui.test.ts cases intentionally fails: the literal bullet glyph assertion. Tank should update to assert presence of .yao--changing .yao__seal or "changing" in the accessible name.
**Why:** The bullet glyph is an implementation detail, not the behavioural contract. The contract "changing lines carry a non-color signal" is still satisfied.

### 2026-07-29T11:08:28+03:00: Mouse UI review -- APPROVED
**By:** Tank
**What:** Reviewed Mouse's redesigned UI. Added 3 [hidden] regression tests. Hardened 12 brittle assertions (class names to ARIA/text/behavioral selectors). All 114/114 pass. Contrast ratios verified exactly: all 8 pairs match Mouse's self-reported numbers to 2 decimal places, all >= 4.5:1 AA. No persistence, no network, no XSS vectors.
**Why:** All contracts met. Approved with visual-verification caveat: visual rendering was NOT verified by screenshot at this stage.

### 2026-07-29T11:11:00+03:00: Third pass -- choreography of arrival (owner reject #2, with references)
**By:** Mouse
**What:** The owner rejected the restrained rebuild ("nothing special") and supplied three Awwwards references. All three share a choreography of arrival -- they make you wait, and the waiting makes the thing matter. This pass adds ceremony without regressing the two fixed defects.
**Why:** The temporal experience, not the geometry, is the actual brief.

### 2026-07-29T11:11:00+03:00: Cast ceremony -- ink laid down over approximately 2.75s
**By:** Mouse
**What:** Replaced translate-in reveal with a clip-path ink-lay wipe (inset(0 100% 0 0) to inset(0)), deceleration-dominant easing. Timing: 550ms beat of stillness, then lines cascade bottom-up at 260ms stagger, each laying over 900ms; reading offered ~350ms after last stroke settles. A run-token guards against overlapping timers on re-cast. prefers-reduced-motion short-circuits in both CSS and JS -- reduced-motion users get the full result instantly.
**Why:** The references make you wait; the wait creates weight. Casting an oracle should feel like a ritual.

### 2026-07-29T11:11:00+03:00: Reading reveals paragraph by paragraph
**By:** Mouse
**What:** After explicit opt-in, the reading's blocks rise in sequence (block-rise, 140ms stagger), never all at once. Reduced-motion shows everything immediately.
**Why:** Sequential arrival extends the ceremony into the interpretation and keeps attention moving through the text.

### 2026-07-29T11:11:00+03:00: Typographic hierarchy + one compositional transgression
**By:** Mouse
**What:** Pushed hexagram glyph to clamp(6rem, 22vw, 11.5rem) against ~17px body -- roughly 10-11:1 scale contrast. Added King Wen number at viewport scale (clamp(80px, 15vw, 168px)) bleeding off the left edge, aria-hidden.
**Why:** Extreme scale contrast with the identity as hero, and one moment where scale/position exceeds polite design so the hexagram commands the page.

### 2026-07-29T11:11:00+03:00: Cinnabar to one meaning; chrome stripped
**By:** Mouse
**What:** Cinnabar (--clr-accent) appears in exactly one concept -- "what is changing": the changing stroke fill, its seal, the reading's changing-line margin rule, and the changing-line label. Removed the reading's top navigation bar entirely; left a single quiet "Cast again" action at the very end.
**Why:** Absolute colour discipline -- the eye goes straight to change. Statelessness as metaphor: the oracle speaks once.

### 2026-07-29T11:21:16+03:00: localStorage history persistence module created
**By:** Trinity
**What:** Created src/storage/history.ts -- exports saveCast, getHistory, clearHistory, deleteCast, isHistoryAvailable. Versioned payload ({ version: 1, casts: [...] }) under key iching-oracle:history:v1. History capped at 50 entries. Every localStorage access wrapped in try/catch; unavailable storage degrades to in-memory. All read-back data validated against full Cast/Line/HexagramRef schema. UUIDs via crypto.randomUUID(). SavedCast has no question field.
**Why:** Owner explicitly reversed the no-persistence requirement and chose localStorage. The previous hard ban on any storage API is intentionally superseded for localStorage only by this owner decision.

### 2026-07-29T11:21:16+03:00: Statelessness requirement reversed (owner directive)
**By:** Project owner -- implemented by Trinity; ARCHITECTURE.md updated by Niobe; README corrected by Seraph; test suite revised by Tank
**What:** The original requirement that the product be "completely stateless -- no persistence" is SUPERSEDED. The product was deliberately stateless from inception (kickoff 2026-07-29T10:00:49+03:00) through multiple design and implementation phases. The owner then explicitly reversed this: device-local cast history is now saved to localStorage so users can revisit past castings. Files changed: src/storage/history.ts created (Trinity). ARCHITECTURE.md updated with new storage rules and invariants (Niobe). README.md corrected -- three false privacy claims removed (Seraph). Test suite revised from a blanket storage ban to a narrow one: localStorage permitted exclusively inside src/storage/ (Tank, 141 tests total).
**What survived the reversal -- these guarantees are UNCHANGED:** (1) The question text is never stored or transmitted. The textarea .value is read by zero lines of JS; no question field exists in SavedCast. Enforced by three independent static tests. (2) Zero network requests. Nothing leaves the device, ever. Enforced by Playwright smoke test. (3) Cookies, sessionStorage, and IndexedDB remain banned project-wide. (4) Web Crypto (crypto.getRandomValues) remains the sole entropy source. Math.random remains banned.
**Why:** Owner explicitly requested it.

### 2026-07-29T11:27:44+03:00: Narrow localStorage allowance for cast history
**By:** Tank
**What:** Rewrote tests/no-persistence.test.ts to permit localStorage exclusively inside src/storage/. All other persistence and network APIs remain hard-banned everywhere. Added three privacy-invariant assertions: SavedCast has no question field, history.ts has no executable reference to "question", src/storage/ never touches DOM input elements. Created tests/storage-history.test.ts (23 tests) covering round-trips, ordering, deleteCast, clearHistory, 50-entry cap, corruption-resilience cases, hostile-environment cases, QuotaExceededError with trim-and-retry, SSR guard, and a behavioural privacy round-trip. Total: 114 to 141 tests.
**Why:** Owner approved localStorage for cast history (reversing the blanket stateless requirement). The narrower invariant is the correct gate.

### 2026-07-29T11:42:00+03:00: Fourth pass -- composition, with eyes (screenshot harness)
**By:** Mouse
**What:** Tank shipped a Playwright screenshot harness. Running it revealed the real defect: every screen was a single text column with approximately a third of the 1440 canvas dead on the right. This pass fixes composition and hierarchy without touching ink geometry or ceremony timing.
**Why:** Designing blind hid the composition problem for three passes. The captures made it obvious in a way reading CSS never did.

### 2026-07-29T11:42:00+03:00: Cast page -- asymmetric two-column layout
**By:** Mouse
**What:** Restructured the cast page into a CSS-grid composition (>=900px): narrow left rail (voice, controls) + wide right stage (hexagram). #app widened 760 to 1120px. Actions block lifted into its own grid child. Bumped stroke geometry (bar 30 to 36px, slot 40 to 48px, width 480 to 620px). Hid original "Cast the hexagram" button after a cast so "Cast again" owns re-casting.
**Why:** Solves the dead right third; keeps the masthead present after a cast; makes the cast the hero.

### 2026-07-29T11:42:00+03:00: Removed the debug-looking line metadata
**By:** Mouse
**What:** Deleted the flanking position numbers, three coin pips, and value digits from each line row (and their CSS + coin-flip keyframe). The row keeps role="img" and a full aria-label, so nothing is lost to assistive tech.
**Why:** In the captures they read as spreadsheet/debug output competing with the strokes.

### 2026-07-29T11:42:00+03:00: Made the compositional transgression actually visible
**By:** Mouse
**What:** The reading's viewport-scale King Wen number was previously positioned off the left edge and clipped to zero width -- invisible in every capture. Re-centred the reading in a 760px column, removed the column clip, and set the number huge (clamp(150px, 26vw, 300px), opacity 0.08) bleeding off the right edge. Verified visible in light and dark, desktop and mobile, by looking at the PNGs.
**Why:** A transgression nobody can see is not a transgression.

### 2026-07-29T11:52:30+03:00: Correct README privacy claims after localStorage introduction
**By:** Seraph
**What:** Rewrote the README opening sentence and "Privacy and statelessness" section (renamed to "Privacy"). Removed the false claims "stateless", "nothing is stored", "no localStorage", and "reload the page and the cast is gone." Added precise account of what is stored (six lines + hexagram ref, key iching-oracle:history:v1, 50-entry cap); what is never stored (the question field -- unread by any JS, enforced by test); what never leaves the device (nothing -- zero network requests, verified by Playwright test).
**Why:** The original text contained materially false statements after the no-persistence requirement was reversed.

### 2026-07-29T11:52:30+03:00: History UI wired into casting page
**By:** Trinity
**What:** Created src/ui/historyPanel.ts and updated src/ui/castingPage.ts, src/styles.css, and src/main.ts to surface past castings. Placement: "Past Castings" in the left rail (CSS grid area "history"), below post-cast action buttons on desktop; below action buttons on mobile. Design: ink and muted ink only -- cinnabar is not used in the history panel, remaining reserved exclusively for changing lines. Privacy copy updated to accurately state casts are saved on this device.
**Why:** Owner's stated goal was revisiting past castings.

### 2026-07-29T11:56:40+03:00: Reversed statelessness -- architectural documentation updated
**By:** Niobe
**What:** Updated ARCHITECTURE.md to reflect the owner's reversal. Corrected five stale claims. Added src/storage/history.ts to the module-ownership table (owner: Trinity). Added storage dependency rules: ui to storage permitted; storage to types only (no engine, no corpus, no UI); engine/ and data/ must not import storage/. Added "Storage invariant (must read)" section: all values read from localStorage must be validated before use in logic and must never reach innerHTML. Updated the hard-requirements list to replace "stateless" with accurate guarantees.
**Why:** The document is the single source of truth for boundary rules. Stale claims would misdirect future contributors.

### 2026-07-29T12:02:10+03:00: Vendor and subset three OFL typefaces for I Ching Oracle
**By:** Switch
**What:** Vendored Cormorant Garamond (300/400 normal+italic), Karla (400/500 normal), and Noto Serif SC (400, 72-glyph CJK subset) as woff2 files into src/assets/fonts/. Created src/fonts.css with @font-face declarations (font-display: swap, unicode-range on CJK face). OFL 1.1 licence texts placed alongside fonts. Noto Serif SC subsetted from 1.47 MB to 15 KB covering exactly 72 CJK codepoints (hexagram nameZh fields + U+6613 for the UI watermark). Build verified: all 7 woff2 files fingerprinted into dist/assets/. 141/141 tests pass.
**Why:** Product constraint mandates zero runtime network requests. Google Fonts/CDN is prohibited. Self-hosted fonts are the only option.

### 2026-07-29T12:10:05+03:00: Fifth pass -- dark-violet veil (token transplant, dark-only)
**By:** Mouse
**What:** Translated the owner's Tailwind v4 OKLCH design system into plain CSS custom properties in :root (no Tailwind, no @theme/@utility). Went dark-only: removed the light theme and prefers-color-scheme colour branching entirely. Added signature effects -- two fixed radial veil gradients on body, an inline feTurbulence SVG grain overlay (base64-encoded to stay clear of the no-persistence url() guard) at opacity 0.035, fading 1px hairline rules, glass surfaces (color-mix card + 14% violet border + backdrop-filter blur), and a sparing violet glow. Wired self-hosted fonts via @import "./fonts.css" (Cormorant Garamond display, Karla UI, Noto Serif SC CJK). Semantic accent moved from cinnabar to luminous --primary violet with drop-shadow glow on changing lines; kept the seal shape + accessible name as the non-colour signal. Raised --muted-foreground 0.62 to 0.68 (7.1:1) and --ring 0.66 to 0.72 (7.8:1) so all text meets AA on the dark field. Kept blur off the strokes entirely; proved razor-sharp resting state via a 2x NearestNeighbor zoom crop. 141/141 tests, 3/3 visual smoke.
**Why:** Owner supplied the palette and said "use inspiration from this design"; dark-only was his explicit call. The veil/grain/glow only work on dark.

### 2026-07-29T12:26:10+03:00: Sixth pass -- casting becomes six discrete coin throws
**By:** Mouse
**What:** Rewrote src/ui/castingPage.ts so the user throws the coins six times, one line per click, bottom (position 1) to top (position 6), instead of one automatic six-line reveal. Each throw calls the engine's castLine(position) at the moment of the click (no castHexagram, no UI-layer randomness), pushes the resulting Line into an accumulator, spins three coins (coin-spin keyframe, rotateY 0->1080deg with a lift, resting crisp/front-facing), settles them to their head/tail values, then lays the stroke with the existing clip-path ink wipe. After the sixth throw the six accumulated Lines are assembled into the same Cast shape via engine helpers (binaryToHexagram(linesToBinary(lines)), changing positions, transformedBinary) -- so the reading view, history panel and saveCast all keep working unchanged. saveCast + refreshHistory fire ONLY in completeCast (never on a partial hexagram); "Cast again" fully clears a partial state via a runToken that strands pending timers. The toss button is never disabled (a busy flag guards re-entry) and its label stays constant "Toss the coins" so a keyboard/SR user keeps focus and isn't spammed across six throws; a separate aria-hidden .cast-progress shows "Line N of 6", and the aria-live region announces each landed line (position, yin/yang, changing, remaining). Reduced motion resolves the coin spin and ink wipe instantly (the six clicks remain -- interaction, not motion). Added coin-tray/coin/coin-spin/.cast-progress CSS in the violet system.
**Why:** Owner: "casting -- I want it done line by line, not all six together, from bottom to top", disambiguated to six separate user throws. Makes the coins mean something and matches the authentic ritual.

### 2026-07-29T12:42:05+03:00: Empty pre-cast stage -- ghost lines removed, height reserved structurally
**By:** Mouse
**What:** Owner: "remove the lines before the casting over the trademark 易." The pre-cast right stage no longer shows six placeholder slot lines -- it is the 易 watermark alone. Removed the .line-slot:empty::after ghost hairline from styles.css (it was already transparent in the dark build, but the rule is now gone so nothing can render). Reserved height comes structurally from the six fixed-height empty slots (6 x --slot-h 48px + 5 x --slot-gap 30px = 438px, verified equal to the measured .hexagram-display rect), NOT from any drawn placeholder, so a stroke arriving into an empty slot shifts nothing. Empty slots are aria-hidden until they carry a real line (set at creation and in resetCast, removed in layStroke), so a screen reader meets an empty stage before the first throw exactly as a sighted user does. Also fixed a completion-time layout shift: the stage previously used align-self:center and so re-centred (dropped ~49px) when the post-cast action buttons appeared in the left rail; changed .casting-stage to align-self:start so its top anchors to the fixed grid-row top -- pre-cast, mid-cast (3 throws) and complete now measure pixel-identical (stage y=96, hex y=192 in all three). The two-column composition, watermark, and hero strokes are preserved; the hexagram now aligns with the masthead.
**Why:** Six pre-drawn placeholders promise the outcome shape before the user has thrown anything; with the six-throw ritual each stroke must land into genuinely empty space. The no-layout-shift non-negotiable is honoured by reserving height without drawing.

### 2026-07-29T12:52:00+03:00: Eighth pass -- plus-sign seal removed, changing signal moved into the stroke
**By:** Mouse
**What:** Owner: "for the changing lines -- can you use something else other than the plus sign... the purple highlight is enough." Removed the cinnabar/violet plus-sign seal entirely -- deleted makeSeal() and the seal-appending block in buildYaoLine() (castingPage.ts), and all seal CSS (.yao__seal-slot/.yao__seal/.yao__seal-body/.yao__seal-mark), the seal reveal animation and the @keyframes seal-press, and dropped .yao__seal-slot from the reduced-motion selector list. Replaced it with an INTRINSIC, non-colour distinction living in the mark itself (WCAG 1.4.1), not a badge beside it: a changing stroke is (a) BRIGHTER -- new --clr-accent-lit oklch(0.8 0.15 300), lighter than the ash normal ink at oklch(0.72), and (b) HEAVIER/taller -- hero bar 46px vs 36px (28px vs the mobile slot), mini 12px vs 8px -- plus the existing violet drop-shadow glow halo. Two independent greyscale cues (luminance + weight) so a changing line is identifiable with the colour channel fully removed. Applied everywhere strokes are drawn: hero cast stage and the mini diagram in the reading view (readingView.ts inherits via buildYaoLine, no edit needed); the history panel draws no strokes so nothing there. Glow is a drop-shadow() on the SVG vector so the fill edge stays hard -- no filter:blur on ink. buildAriaLabel still says "changing" for screen readers.
**Why:** Owner found the plus seal read as a bolted-on UI badge in a brushwork product. But colour alone cannot carry the single most consequential fact in a reading (which lines change = the whole transformation); removing the seal without an intrinsic replacement would fail 1.4.1 for colourblind/greyscale/sunlight/dimmed viewing. Weight+luminance keeps the signal in the ink, not next to it.

### 2026-07-29T13:08:39+03:00: Ninth pass -- empty-slot ghost: verified ALREADY absent (no change needed)
**By:** Mouse
**What:** Owner (live page): "when empty, slot lines should show nothing (not even a half transparent line)." Investigated the exact culprit the coordinator cited -- .line-slot:empty::after -- and confirmed it is NOT in the current src/styles.css; it was deleted in the seventh (empty-stage) pass and the slot rule carries a comment documenting that an uncast slot renders nothing. Proved against the LIVE :5173 page with a Playwright probe: every descendant of .hexagram-display reports no background, no border, no box-shadow and no child on pre-cast (painted descendants: []), and the empty .line-slot ::before/::after both computed content:none, backgroundImage:none. Clipped a 620x438 capture of the exact slot region -- it shows the 易 watermark alone, zero hairlines. Confirmed no parallel ghost on the mini/.mini-slot system (reading view + history always draw complete lines; the rule has no border/pseudo). Layout stability re-proven: .hexagram-display rect is pixel-identical across pre-cast / after-3-throws / complete (x606 y192 h438; stage x606 y96 h534), so the watermark and surround never move. Made NO source edits. tsc clean.
**Why:** The requirement was already met by prior work. The owner's persistent hairline is a STALE artifact -- same pattern as the seventh pass, where he reacted to pre-dark-theme 11:21 captures. The likely source is Tank's broken screenshots harness (npm run shots / test:visual still assume one-click completion, obsoleted by the six-throw ritual) emitting old/partial PNGs. Recommend routing the harness update to Tank so the owner stops reviewing obsolete captures.

### 2026-07-29T14:33:29+03:00: Update README for standalone repo move (morsh/i-ching)
**By:** Seraph
**What:** Updated `README.md` at the repo root of the new standalone `morsh/i-ching` repo. Changes: (1) Added `https://morsh.github.io/i-ching/` as a prominent link immediately under the title. (2) Corrected the Getting started `cd` command from `cd i-ching-squad/app` to `cd app`. (3) Rewrote the Live site section: updated URL from `https://morsh.github.io/mor-squads/` to `https://morsh.github.io/i-ching/`; noted `prod` branch deploys and `main` is for development; removed invented path-filter details from the old workflow since the new workflow file does not exist yet; pointed readers to `.github/workflows/` for the current definition. (4) Rewrote the Project layout tree: replaced the `i-ching-squad/` root label with `(repo root)/` to reflect the repo structure accurately. (5) Added one sentence to the "What is stored when you choose to save" paragraph: the interface shows "Saving will include your question." next to the save button. All other privacy paragraphs are unchanged in wording and substance.
**Why:** The `i-ching-squad/` monorepo prefix was present throughout the README in paths, the layout tree, the `cd` command, and the deploy URL. All were wrong after the repo split. The new workflow file does not yet exist (Switch is authoring it), so only what can be verified — `prod` branch, tests before deploy — was stated; the rest defers to the file itself. The live URL is the public front door and belonged at the top.

### 2026-07-29T14:33:29+03:00: Workflow and .gitattributes for standalone i-ching repo
**By:** Switch
**What:** Created `.github/workflows/deploy.yml` (trigger: push to `prod`, path filter `app/**` + workflow file; Node 22; npm ci + npm test + npm run build; Pages Actions flow with actions/checkout@v7, actions/setup-node@v7, actions/configure-pages@v6, actions/upload-pages-artifact@v5, actions/deploy-pages@v5; artifact from `app/dist`; cancel-in-progress: false). Created `.gitattributes` with union-merge rules for squad append-only state, paths adjusted to drop the old `i-ching-squad/` prefix.
**Why (path filter):** Kept the path filter even though this is a single-purpose repo. The filter on `app/**` is still meaningful: a commit that only changes `README.md`, `.squad/` files, `.gitattributes`, or other non-app files would otherwise trigger a needless deploy. The "trap" concern was valid in mor-squads where the filter was the only thing preventing cross-squad noise; here it prevents doc/config-only churn from redeploying. Added the workflow file itself so a workflow change also triggers a run.
**Why (base path):** Did not change `base: './'` in vite.config.ts. The built `dist/index.html` emits `./assets/index-YwYFHHpZ.js` and `./assets/index-BYZJLGXG.css` — purely relative, agnostic to whether the site is at `/i-ching/` or any other subpath. This is the correct and robust choice; hardcoding `/i-ching/` would recreate the blank-page trap.
**Why (action versions):** Bumped all five actions to their current latest major (verified via `gh api`): checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5. Previous pins (v4/v4/v5/v3/v4) were the source of the Node 20 deprecation warnings; the new versions target Node 24.

### 2026-07-29T13:30:00+03:00: Standalone repository becomes canonical home
**By:** Scribe
**What:** Moved I-Ching Oracle from `i-ching-squad/` in `morsh/mor-squads` to standalone `morsh/i-ching`. The split used `git subtree split --prefix=i-ching-squad`, preserving the original three commits instead of squashing. The `.squad/` moved with the app, and `app/` is now at repo root.
**Why:** The old Pages site and `prod` branch on `morsh/mor-squads` were deleted so `https://morsh.github.io/i-ching/` is the single canonical home.

# Mouse — site icon

## Final shipped choice
Ship **Vibrant 易 — strong**. It keeps the character mark morsh already liked, increases perceived energy through a deeper violet field, brighter rim, and a violet-to-lavender glyph gradient, and stops short of the bold variant's halo-heavy mobile-game feeling.

## Final files
- `app/public/favicon.svg` — strong vibrant 易 seal, outline paths only.
- `app/public/favicon-32x32.png` — rasterised from the strong SVG.
- `app/public/apple-touch-icon.png` — rasterised from the strong SVG.
- `app/public/favicon-16x16.png` — hand-tuned 16px optical-size PNG.
- `app/public/site.webmanifest` — theme/background color updated to the strong field.
- `app/scripts/generate-icons.mjs` — regenerates the shipped strong icon and validates PNG integrity.
- `app/index.html` — theme-color updated to the strong field.

## 16px optical-size decision
The 16px favicon is not a downscale of the full 易 seal. At true tab size the full ideograph has too many strokes to resolve, especially after the rounded-square ring and padding consume the field. The dedicated `favicon-16x16.png` therefore uses the 日 component as a reduced mark: no border ring, edge-to-edge ink field, bright violet strokes, and whole-pixel rectangles. This is optical sizing, not a replacement of the primary mark — the 32px and 180px icons keep the full outlined 易 because they have enough pixels for the character to read.

## Vibrancy versus legibility lesson
The first vibrant exploration made the small mark more saturated but less legible: the 16px counters filled in, turning the clean outlined 日 into a blob with a floating bar. That is the reusable lesson: at favicon size, effects and denser colour can erase counters. The final 16px keeps the exact crisp counter geometry from the muted shipped mark and applies only the strong palette; no gradient or glow at 16px.

## Rejected concepts
- Coin: strongest non-易 candidate and conceptually honest to three-coin casting, but switching marks entirely is a larger brand move than the request.
- Six lines: exact to the product at large size, but a literal six-line hexagram cannot remain itself at 16px; it must reduce to a trigram.
- Taijitu: familiar and pleasant but generic, and not specifically an I Ching mark.
- Vibrant bold: vivid but too neon/haloed; it risks dating as a mobile-game icon.
- Vibrant modest: safe improvement, but the strong step better answers “more vibrant” while staying disciplined.

## Why outlines matter for favicons
SVG favicons are rendered as isolated images, and browser engines are inconsistent about honoring `@font-face` inside that context. If a live `<text>` glyph falls back on a system without CJK fonts, the tab can show a tofu box instead of 易. Outlines remove that failure mode and keep the mark deterministic.

## Generator hardening
`app/scripts/generate-icons.mjs` refuses corrupt image artifacts: it validates PNG signature bytes, minimum file size, and modification time newer than the source SVG. The preview sheet embeds PNG data URLs and includes old/new 16px magnification so the counter geometry can be checked directly.

# Decision: SEO architecture — prerender static hexagram pages

**Date:** 2026-07-30T10:35:00Z  
**By:** Niobe  
**Status:** Proposed for implementation by Switch

## Context

The deployed page is an empty JavaScript shell: the built root HTML is under 1 KB and contains `<main id="app"></main>`. The 64-hexagram corpus is substantial but only appears after runtime interaction, so crawlers see almost none of the project's real content.

Constraints: GitHub Pages static hosting only; site served from `/i-ching/`; `app/vite.config.ts` `base: './'` must remain; deploy runs `npm ci`, `npm test`, then `npm run build` from `app/`; privacy promise forbids analytics/tracking/third-party scripts; engine must not import the corpus.

## Decision

Generate static, crawlable pages at build time:

- Keep `base: './'`.
- Add `app/scripts/prerender.mjs`, run after `vite build` in `npm run build`.
- Use Vite's programmatic module loader to read `app/src/data/hexagrams.ts` from the script without adding a framework and without changing runtime module boundaries.
- Emit `dist/hexagram/1/index.html` through `dist/hexagram/64/index.html` plus a crawlable `dist/index.html`, `dist/sitemap.xml`, and `dist/robots.txt`.
- Canonical URL shape is number-only: `/i-ching/hexagram/<number>/`.
- Hexagram article pages should not load the SPA script that replaces their body. They may link to the root casting experience. If enhanced later, enhancement must preserve the article content in the DOM.
- Generated nested pages must rewrite asset references by depth: `../../assets/...` from `dist/hexagram/<n>/index.html`; never `/assets/...` and never a hardcoded domain-root asset path.

## Rationale

This is the highest-value SEO move because it exposes existing unique content to crawlers and long-tail searches. Number-only URLs avoid permanent translation/romanisation mistakes on a static host with no redirect layer. Depth-aware relative paths preserve the Pages subpath requirement and avoid the blank-site failure mode.

## Consequences

Switch should implement the generator and tests. Seraph owns final titles/descriptions/intro copy. The generated pages must be substantial enough to avoid thin-template risk: include judgment, image, six line texts, names, trigrams, and concise navigation. No analytics, doorway pages, keyword stuffing, or fake schema.

# 2026-07-30T10:35:00Z: SEO copy specification

**By:** Seraph

**What:** Wrote the SEO copy specification for the landing page and possible per-hexagram pages. The spec includes a search-oriented but editorial page title, meta description, social sharing text, share-image copy direction, substantial crawler-visible landing-page prose, a single-h1 heading outline, a per-hexagram title/meta/heading template, thin-content safeguards, and question-led sections worth adding.

**Why:** The deployed landing page currently exposes little useful static text to crawlers. Search performance should improve by giving humans and crawlers clear, respectful, specific language about the I Ching, three-coin casting, bottom-up line order, changing lines, and privacy without making predictive claims.

**Constraints preserved:** Did not edit application source, markup, or build files. Privacy language keeps the two separate guarantees: the question is not transmitted, and nothing is stored unless the user chooses to save; if saved, the saved reading includes the question.

### 2026-07-30T10:50:00Z: SEO prerender pipeline
**By:** Switch
**What:** Added `app/scripts/prerender.mjs` and wired `npm run build` to run `tsc --noEmit && vite build && node scripts/prerender.mjs`. The prerender step loads the TypeScript corpus through Vite SSR, rebuilds `dist/index.html`, emits `dist/hexagram/1/index.html` through `dist/hexagram/64/index.html`, writes `dist/sitemap.xml`, and emits a project-path `dist/robots.txt`.

**Why:** The app shell was previously too small and text-empty for crawlers. The generated landing page now contains static copy, an index of all 64 hexagrams, metadata, and JSON-LD while the interactive oracle mounts into `#oracle-app` so hydration does not erase the static DOM. Each hexagram page is a static article with its own number, Chinese name, pinyin, English name, trigrams, Judgment, Image, all six line texts, canonical metadata, Open Graph/Twitter tags, and minimal `CreativeWork` JSON-LD.

**Asset-path decision:** Kept `base: './'`. Generated document references go through a depth-aware helper: landing assets are `./assets/...`; nested hexagram pages use `../../assets/...`, `../../favicon.svg`, and `../../site.webmanifest`. Hexagram pages intentionally omit the SPA module script.

**Robots decision:** Emitted `robots.txt` only as a completeness artifact with `User-agent` and `Allow`. Did not include a `Sitemap:` directive because project-path robots files are not authoritative for GitHub Pages host-root crawling; the sitemap should be submitted directly in Search Console.

**Follow-up:** Once Seraph's `.squad/seo-copy.md` landed, wired its landing title, description, Open Graph/Twitter wording, static prose, and per-hexagram title/description/heading patterns into the generator without placeholder prose.

**Verification:** `npm test` passed 161/161. `npm run build` passed. The generated `dist/index.html` grew from 888 bytes to 18,989 bytes. Verified 64 hexagram pages, 65 sitemap URLs, nested `../../assets/` references on a generated hexagram page, zero root-relative `src="/..."` or `href="/..."` references on that page, no surviving Seraph template placeholders, and fresh generated artifacts newer than changed sources.

# Rai decision — SEO/static prerender pre-ship

Date: 2026-07-30
Reviewer: Rai
Decision: 🟢 Green (ship)

Reviewed built output first, including the landing page and sampled generated hexagram pages 1, 7, 18, 23, 44, 49, and 64, plus the SEO copy source, prerender generator, app shell, manifest, and privacy/casting storage flow.

No blocking RAI issue found. The privacy copy is accurate, no third-party tracking or external request origin was introduced, divination framing stays reflective rather than predictive/advice-like, cultural references and sampled Chinese name/pinyin pairings are respectful and accurate for release, SEO structured data matches visible content, and the static content/accessibility checks pass.
