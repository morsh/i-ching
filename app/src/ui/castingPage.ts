/**
 * Casting page — a cast *ceremony*: a deliberate beat of stillness, then the
 * six lines lay down as ink from the ground up, each stroke arriving with
 * weight. The reading becomes available only after all six have settled.
 * OWNER: Trinity (visual system rebuilt by Mouse).
 *
 * RAI: no innerHTML with uncontrolled input; the question textarea is never
 * read; cast results are saved to localStorage via src/storage/ only; no
 * network.
 */

import type { Cast, Line, LinePosition } from '../types';
import { castLine } from '../engine/cast';
import { linesToBinary, transformedBinary, binaryToHexagram } from '../engine/hexagram';
import { renderHistoryPanel } from './historyPanel';

// ── Throw choreography (ms) ──────────────────────────────────────────
// The ritual is now six discrete throws — the user tosses the coins once per
// line. Each throw: the three coins tumble, settle onto their faces, then the
// resulting stroke lays down in ink. Slow is correct, but the PACING is the
// user's — nothing advances until they ask for the next line.
const COIN_SPIN_MS   = 780;   // three coins tumbling (covers the nth-child stagger)
const COIN_SETTLE_MS = 150;   // a beat on the settled faces before the ink
const STROKE_LAY_MS  = 900;   // matches the CSS ink-lay duration
const STROKE_LAY_DELAY_MS = 130; // matches the CSS delay before the wipe begins

/**
 * Renders the casting page into `container`. Six fixed slots prevent layout
 * shift — lines settle into pre-reserved positions, bottom-to-top.
 *
 * @param container The host element.
 * @param onAnalyze Called when the user opts to read the result. Receives the
 *                  completed cast, the captured question (if any), and whether
 *                  the reading was already saved (when opening from history).
 */
export function renderCastingPage(
  container: HTMLElement,
  onAnalyze: (cast: Cast, question?: string, alreadySaved?: boolean) => void
): void {
  container.textContent = '';

  const page = document.createElement('section');
  page.className = 'casting-page';

  // Two-column composition (desktop): the LEDE carries the voice and controls
  // on the left; the STAGE holds the hexagram at full presence on the right,
  // so the strokes command the space rather than a column nudged left. On
  // narrow screens this collapses to a single column (stage under lede).
  const lede = document.createElement('div');
  lede.className = 'casting-lede';

  const stage = document.createElement('div');
  stage.className = 'casting-stage';

  // ── Heading ──────────────────────────────────────────────────────
  const h1 = document.createElement('h1');
  h1.textContent = 'I Ching Oracle';
  lede.appendChild(h1);

  const tagline = document.createElement('p');
  tagline.className = 'tagline';
  tagline.textContent = 'Toss the coins six times — each throw lays one line, from the ground up. Then, if you wish, read what is changing.';
  lede.appendChild(tagline);

  // Framing, set as composition — encountered before the first cast, so the
  // stance is established before any reading forms. Not a legal sticker.
  const framing = document.createElement('p');
  framing.className = 'framing';
  framing.textContent = 'A mirror for reflection — not a prediction of what will be.';
  lede.appendChild(framing);

  // ── Question ─────────────────────────────────────────────────────
  const questionArea = document.createElement('div');
  questionArea.className = 'question-area';

  const qLabel = document.createElement('label');
  qLabel.htmlFor = 'question-input';
  qLabel.textContent = 'Your question (optional)';
  questionArea.appendChild(qLabel);

  const privacyNote = document.createElement('p');
  privacyNote.className = 'privacy-note';
  privacyNote.id = 'privacy-note';
  privacyNote.textContent =
    'Your question is never sent anywhere. ' +
    'Nothing is saved unless you choose to — save a reading and it stays on this device, question included. ' +
    'Clear any time.';
  questionArea.appendChild(privacyNote);

  const textarea = document.createElement('textarea');
  textarea.id = 'question-input';
  textarea.rows = 2;
  textarea.placeholder = 'What is on your mind?';
  textarea.setAttribute('autocomplete', 'off');
  textarea.setAttribute('spellcheck', 'false');
  textarea.setAttribute('aria-describedby', 'privacy-note');
  questionArea.appendChild(textarea);

  lede.appendChild(questionArea);

  // ── Progress (which line is next) — product voice, not a percentage ──
  // aria-hidden: the live region announces progress for AT; this is the
  // sighted counterpart, so the two never double up.
  const progress = document.createElement('p');
  progress.className = 'cast-progress';
  progress.setAttribute('aria-hidden', 'true');
  lede.appendChild(progress);

  // ── Toss control ──────────────────────────────────────────────────
  // Label stays constant across all six throws so a focused keyboard user is
  // never re-announced mid-ritual; progress lives in the elements above/below.
  const castBtn = document.createElement('button');
  castBtn.className = 'btn btn--primary';
  castBtn.textContent = 'Toss the coins';
  lede.appendChild(castBtn);

  // ── aria-live region ──────────────────────────────────────────────
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'false');
  liveRegion.className = 'sr-only';
  lede.appendChild(liveRegion);

  // ── Coin tray — the three coins, tossed once per line ─────────────
  // Always present (reserved height → no layout shift). Decorative for AT
  // (the live region carries every value); the coins are the sighted moment.
  const coinTray = document.createElement('div');
  coinTray.className = 'coin-tray';
  coinTray.setAttribute('aria-hidden', 'true');
  const coins: HTMLElement[] = [];
  for (let i = 0; i < 3; i++) {
    const coin = document.createElement('span');
    coin.className = 'coin';
    const face = document.createElement('span');
    face.className = 'coin__face';
    const hole = document.createElement('span');
    hole.className = 'coin__hole';
    coin.appendChild(face);
    coin.appendChild(hole);
    coinTray.appendChild(coin);
    coins.push(coin);
  }
  stage.appendChild(coinTray);

  // ── Hexagram display — 6 fixed slots (always in DOM, no layout shift) ──
  const hexDisplay = document.createElement('div');
  hexDisplay.className = 'hexagram-display';
  hexDisplay.setAttribute('aria-label', 'Hexagram');
  stage.appendChild(hexDisplay);

  // Slot ordering: slots[0] = position 6 (top line, DOM first)
  //               slots[5] = position 1 (bottom line, DOM last)
  // This matches the visual top-to-bottom layout.
  // We reveal bottom-to-top: first line at idx=0 → position 1 → slots[5]
  const slots: HTMLElement[] = [];
  for (let i = 0; i < 6; i++) {
    const slot = document.createElement('div');
    slot.className = 'line-slot';
    // An empty slot carries no cast line yet — keep it out of the accessibility
    // tree so a screen reader meets an empty stage before the first throw,
    // exactly as a sighted user does. resetCast() restores this; layStroke()
    // clears it the moment the slot holds a real line.
    slot.setAttribute('aria-hidden', 'true');
    hexDisplay.appendChild(slot);
    slots.push(slot);
  }

  // ── Post-cast actions (hidden until cast completes) ───────────────
  const actionArea = document.createElement('div');
  actionArea.className = 'cast-actions';
  actionArea.hidden = true;

  const readBtn = document.createElement('button');
  readBtn.className = 'btn btn--primary';
  readBtn.textContent = 'Read this hexagram';
  actionArea.appendChild(readBtn);

  const castAgainBtn = document.createElement('button');
  castAgainBtn.className = 'btn btn--secondary';
  castAgainBtn.textContent = 'Cast again';
  actionArea.appendChild(castAgainBtn);

  // Actions are a sibling of the lede and stage (not nested in the lede) so
  // that on a single-column (mobile) stack the order reads intro → cast →
  // hexagram → actions, with the result never buried beneath the buttons.
  page.appendChild(lede);
  page.appendChild(stage);
  page.appendChild(actionArea);

  // History panel — secondary affordance, sits below actions in the left rail
  // on desktop (grid area "history"). On mobile it follows actions naturally
  // in document order. Empty and unavailable states handled inside the panel.
  const historyContainer = document.createElement('div');
  historyContainer.className = 'casting-history';
  page.appendChild(historyContainer);

  container.appendChild(page);

  // ── State ─────────────────────────────────────────────────────────
  let lines: Line[] = [];        // accumulates one Line per throw, position 1→6
  let currentCast: Cast | null = null;
  let busy = false;              // a throw is mid-flight (coins spinning / ink laying)
  let runToken = 0;              // invalidates in-flight throw timers on a reset
  // Question captured reactively from the textarea as the user types — never
  // read from .value at analysis/save time (kept in local state instead).
  let capturedQuestion: string | undefined = undefined;
  textarea.addEventListener('input', () => {
    capturedQuestion = textarea.value || undefined;
  });

  // Render history panel; opens a saved reading when the user selects an entry.
  renderHistoryPanel(historyContainer, (saved) => {
    onAnalyze(saved.cast, saved.question, true);
  });

  // ── Events ───────────────────────────────────────────────────────
  castBtn.addEventListener('click', throwNext);
  castAgainBtn.addEventListener('click', () => {
    resetCast();
    castBtn.focus();
  });
  readBtn.addEventListener('click', () => {
    if (currentCast !== null) {
      if (capturedQuestion !== undefined) {
        onAnalyze(currentCast, capturedQuestion);
      } else {
        onAnalyze(currentCast);
      }
    }
  });

  resetCast();   // initial empty state (no focus steal on load)

  /**
   * Clears ALL cast state — a partial cast is not a cast. Invalidates any
   * in-flight throw timers so an abandoned throw can never mutate the next run.
   */
  function resetCast(): void {
    runToken++;                  // strand any pending throw timers
    lines = [];
    currentCast = null;
    capturedQuestion = undefined;
    busy = false;
    slots.forEach(s => { s.replaceChildren(); s.setAttribute('aria-hidden', 'true'); });
    coins.forEach(c => { c.className = 'coin'; });
    coinTray.classList.remove('coin-tray--spent');
    actionArea.hidden = true;
    castBtn.hidden = false;
    liveRegion.textContent = '';
    updateProgress();
  }

  function updateProgress(): void {
    const done = lines.length;
    progress.textContent = done >= 6 ? '' : `Line ${done + 1} of 6 · from the ground up`;
  }

  /** One throw: generate the next line via the engine, toss the coins, lay ink. */
  function throwNext(): void {
    if (busy || currentCast !== null || lines.length >= 6) return;
    const token = runToken;
    busy = true;

    const pos = (lines.length + 1) as LinePosition;
    let line: Line;
    try {
      // The engine owns ALL randomness (CSPRNG). The UI only asks for a line.
      line = castLine(pos);
    } catch (err) {
      busy = false;
      const msg = err instanceof Error ? err.message : String(err);
      liveRegion.textContent = 'Unable to cast: ' + msg;
      return;
    }
    lines.push(line);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setCoinFaces(coins, line);

    const layStroke = (): void => {
      const row = buildLineElement(line);
      // Per-throw: no stagger — the stroke lays as soon as the coins settle.
      row.style.setProperty('--reveal-delay', '0ms');
      // pos 1 (bottom) → slots[5]; pos 6 (top) → slots[0].
      const target = slots[6 - pos];
      if (target) {
        target.replaceChildren(row);
        // The slot now carries a real line — expose it to assistive tech.
        target.removeAttribute('aria-hidden');
      }
    };

    if (reduced) {
      // No motion: coins and stroke resolve instantly. The click still counts.
      layStroke();
      afterThrow(line, token);
      return;
    }

    // Toss: restart the spin animation on all three coins.
    coins.forEach(c => {
      c.classList.remove('coin--spin');
      void c.offsetWidth;          // reflow so the animation restarts each throw
      c.classList.add('coin--spin');
    });

    window.setTimeout(() => {
      if (token !== runToken) return;
      coins.forEach(c => c.classList.remove('coin--spin'));
      layStroke();
      window.setTimeout(() => {
        if (token !== runToken) return;
        afterThrow(line, token);
      }, STROKE_LAY_DELAY_MS + STROKE_LAY_MS);
    }, COIN_SPIN_MS + COIN_SETTLE_MS);
  }

  /** Runs after a stroke has landed: advance progress, or complete on the sixth. */
  function afterThrow(line: Line, token: number): void {
    if (token !== runToken) return;
    busy = false;
    updateProgress();
    if (lines.length >= 6) {
      completeCast(token);
    } else {
      announceThrow(liveRegion, line, 6 - lines.length);
      castBtn.focus();           // keep the toss control under the keyboard user
    }
  }

  /** The sixth line has landed: assemble the Cast, reveal actions. Nothing is saved here — saving is opt-in via the reading view. */
  function completeCast(token: number): void {
    if (token !== runToken) return;

    // Assemble the six accumulated lines into the same Cast shape the rest of
    // the app consumes, using the engine's own derivation helpers — no logic or
    // randomness is duplicated in the UI.
    const primary = binaryToHexagram(linesToBinary(lines));
    const changing = lines.filter(l => l.changing).map(l => l.position);
    const transformed =
      changing.length > 0 ? binaryToHexagram(transformedBinary(lines)) : null;
    const cast: Cast = { lines: lines.slice(), primary, changing, transformed };
    currentCast = cast;

    castBtn.hidden = true;        // "Cast again" now owns re-casting
    actionArea.hidden = false;
    coinTray.classList.add('coin-tray--spent');   // fade coins → strokes are the hero
    updateProgress();
    readBtn.focus();

    const n = cast.changing.length;
    const last = lines[5] as Line;
    liveRegion.textContent =
      `Line 6 (top): ${ageOf(last)}${last.changing ? ' — changing' : ''}. ` +
      (n > 0
        ? `Hexagram complete with ${n} changing line${n === 1 ? '' : 's'}. The reading is ready.`
        : 'Hexagram complete. No changing lines. The reading is ready.');
  }
}

/** Reflects a line's three coin faces onto the tray (heads = 3, tails = 2). */
function setCoinFaces(coins: HTMLElement[], line: Line): void {
  coins.forEach((coin, i) => {
    const v = line.coins[i];
    coin.classList.remove('coin--heads', 'coin--tails');
    coin.classList.add(v === 3 ? 'coin--heads' : 'coin--tails');
  });
}

// ── Line element ────────────────────────────────────────────────────

function buildLineElement(line: Line): HTMLElement {
  const row = document.createElement('div');
  row.className = line.changing ? 'line-row line-row--changing' : 'line-row';
  // The row is the accessible unit for this line diagram. All of the coin /
  // position / value detail lives in this label, so the visible composition
  // can stay pure ink — the stroke alone, no spreadsheet marginalia.
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', buildAriaLabel(line));

  // The stroke — the hero, and now the only visible mark on the row.
  const stroke = buildYaoLine(line.polarity === 'yang', line.changing, 'hero');
  row.appendChild(stroke);

  return row;
}

// ── SVG yao strokes ─────────────────────────────────────────────────

const SVGNS = 'http://www.w3.org/2000/svg';

// An organic brush bar: tapered ends, a subtly irregular top/bottom edge.
// Solid fill, hard vector edges — no gradient, no blur. viewBox 0 0 1000 40.
const STROKE_PATH =
  'M7 20 L27 6 L214 5 L404 8 L601 5 L793 7 L978 5 L993 20 ' +
  'L978 35 L793 33 L601 35 L404 32 L214 35 L27 34 Z';

function makeStrokeSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 1000 40');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('yao__ink');
  const path = document.createElementNS(SVGNS, 'path');
  path.setAttribute('d', STROKE_PATH);
  svg.appendChild(path);
  return svg;
}

/**
 * Builds a single yao stroke element: solid (yang) or broken (yin). A changing
 * line is drawn as a HEAVIER, brighter brushstroke (see .yao--changing in the
 * stylesheet) — the distinction lives in the mark itself, not in a badge beside
 * it, so it survives with colour removed. Shared by the casting page and the
 * reading view's mini hexagrams.
 *
 * @param isYang   true → one unbroken stroke; false → two strokes with a gap.
 * @param changing true → luminous, heavier ink (a non-colour signal too).
 * @param variant  'hero' (large casting display) or 'mini' (reading view).
 */
export function buildYaoLine(
  isYang: boolean,
  changing: boolean,
  variant: 'hero' | 'mini'
): HTMLElement {
  const vis = document.createElement('span');
  vis.className =
    `yao yao--${variant} yao--${isYang ? 'yang' : 'yin'}` +
    (changing ? ' yao--changing' : '');

  const bar = document.createElement('span');
  bar.className = 'yao__bar';
  if (isYang) {
    bar.appendChild(makeStrokeSvg());
  } else {
    const left = document.createElement('span');
    left.className = 'yao__half';
    left.appendChild(makeStrokeSvg());
    const right = document.createElement('span');
    right.className = 'yao__half';
    right.appendChild(makeStrokeSvg());
    bar.appendChild(left);
    bar.appendChild(right);
  }
  vis.appendChild(bar);
  return vis;
}

function buildAriaLabel(line: Line): string {
  const posName =
    line.position === 1 ? 'bottom'
    : line.position === 6 ? 'top'
    : `position ${line.position}`;

  const age =
    line.changing
      ? line.polarity === 'yang' ? 'old yang' : 'old yin'
      : line.polarity === 'yang' ? 'young yang' : 'young yin';

  const changingNote = line.changing ? ', changing' : '';

  const coinsDesc = Array.from(line.coins)
    .map(c => (c === 3 ? 'heads' : 'tails'))
    .join(', ');

  return (
    `Line ${line.position} (${posName}): ${age}${changingNote}. ` +
    `Coins: ${coinsDesc}. Value: ${line.value}.`
  );
}

function ageOf(line: Line): string {
  return line.changing
    ? line.polarity === 'yang' ? 'old yang' : 'old yin'
    : line.polarity === 'yang' ? 'young yang' : 'young yin';
}

function announceThrow(region: HTMLElement, line: Line, remaining: number): void {
  const posName =
    line.position === 1 ? 'bottom'
    : line.position === 6 ? 'top'
    : `position ${line.position}`;
  const changingNote = line.changing ? ' — changing' : '';
  region.textContent =
    `Line ${line.position} (${posName}): ${ageOf(line)}${changingNote}. ` +
    `${remaining} line${remaining === 1 ? '' : 's'} remain. ` +
    `Toss again for line ${line.position + 1}.`;
}
