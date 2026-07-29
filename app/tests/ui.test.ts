/**
 * @vitest-environment jsdom
 *
 * UI tests for src/ui/castingPage.ts and src/ui/readingView.ts.
 * Owner: Tank
 *
 * NOTE: jsdom was installed as a devDependency for this file.
 *
 * MANUAL CHECKS (cannot be automated in jsdom — no computed-style support):
 * - CSS animations are suppressed under prefers-reduced-motion (verified by
 *   code-reading: every animated class has an `animation: none` override).
 * - Focus ring on #question-input uses a box-shadow replacement (`outline: none`
 *   in `#question-input:focus` with higher specificity than `:focus-visible`).
 *   The replacement has sufficient contrast (≥ 15:1 both modes) but keyboard
 *   users see a different indicator than all other controls. Flagged to
 *   coordinator — not a WCAG 2.1 AA failure but worth revisiting for 2.2.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Cast, Line, LinePosition, LineValue, CoinTriplet, Hexagram } from '../src/types';

// ── Module mocks (must be top-level — hoisted by Vitest) ────────────────────

vi.mock('../src/engine/cast', () => ({
  castHexagram: vi.fn(),
  castLine: vi.fn(),
  rollThreeCoins: vi.fn(),
  coinsToValue: vi.fn(),
}));

vi.mock('../src/data/hexagrams', () => ({
  HEXAGRAMS: [],
  getHexagramByNumber: vi.fn(),
  getHexagramByBinary: vi.fn(),
}));

import { castHexagram, castLine } from '../src/engine/cast';
import { getHexagramByNumber } from '../src/data/hexagrams';
import { renderCastingPage } from '../src/ui/castingPage';
import { renderReadingView } from '../src/ui/readingView';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeLine(position: LinePosition, value: LineValue): Line {
  const coins: CoinTriplet =
    value === 6 ? [2, 2, 2] :
    value === 7 ? [2, 2, 3] :
    value === 8 ? [2, 3, 3] :
    /* 9 */       [3, 3, 3];
  return {
    position,
    value,
    coins,
    polarity: (value === 6 || value === 8) ? 'yin' : 'yang',
    changing: value === 6 || value === 9,
  };
}

const POSITIONS: LinePosition[] = [1, 2, 3, 4, 5, 6];

/** All old-yang lines (value 9) → all changing, transformed exists. */
function makeAllChangingCast(): Cast {
  const lines = POSITIONS.map(p => makeLine(p, 9));
  return {
    lines,
    primary: { number: 1, binary: '111111' },
    changing: [1, 2, 3, 4, 5, 6],
    transformed: { number: 2, binary: '000000' },
  };
}

/** All young-yang lines (value 7) → none changing, transformed = null. */
function makeNoChangingCast(): Cast {
  const lines = POSITIONS.map(p => makeLine(p, 7));
  return {
    lines,
    primary: { number: 1, binary: '111111' },
    changing: [],
    transformed: null,
  };
}

/** One changing line at position 1 only. */
function makeOneChangingCast(): Cast {
  const lines: Line[] = [
    makeLine(1, 6), // old yin — changing
    makeLine(2, 7),
    makeLine(3, 7),
    makeLine(4, 7),
    makeLine(5, 7),
    makeLine(6, 7),
  ];
  return {
    lines,
    primary: { number: 1, binary: '111111' },
    changing: [1],
    transformed: { number: 2, binary: '000000' },
  };
}

const FAKE_HEXAGRAM: Hexagram = {
  number: 1,
  binary: '111111',
  nameZh: '乾',
  namePinyin: 'Qián',
  nameEn: 'The Creative',
  trigrams: {
    upper: { binary: '111', name: 'Qian' },
    lower: { binary: '111', name: 'Qian' },
  },
  judgment: 'JUDGMENT_TEXT_SENTINEL',
  image: 'IMAGE_TEXT_SENTINEL',
  lines: [
    'LINE_1_SENTINEL', 'LINE_2_SENTINEL', 'LINE_3_SENTINEL',
    'LINE_4_SENTINEL', 'LINE_5_SENTINEL', 'LINE_6_SENTINEL',
  ],
};

// ── Setup helpers ───────────────────────────────────────────────────────────

/** Mock window.matchMedia so castingPage.ts can use it (jsdom does not provide it). */
function mockMatchMedia(prefersReducedMotion: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: prefersReducedMotion && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => { /* noop */ },
      removeListener: () => { /* noop */ },
      addEventListener: () => { /* noop */ },
      removeEventListener: () => { /* noop */ },
      dispatchEvent: () => false,
    }),
  });
}

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  // Use reduced motion so every throw is synchronous (no setTimeout delays).
  mockMatchMedia(true);
  // Default stubs — individual tests override these as needed.
  // castLine is the per-throw API; castHexagram is no longer called by the casting page.
  vi.mocked(castLine).mockImplementation((pos: LinePosition) => makeLine(pos, 7));
  vi.mocked(castHexagram).mockReturnValue(makeNoChangingCast());
  vi.mocked(getHexagramByNumber).mockReturnValue(FAKE_HEXAGRAM);
});

afterEach(() => {
  document.body.removeChild(container);
  // clearAllMocks resets call history but preserves the mock implementation,
  // so the next test's beforeEach can safely re-set mockReturnValue.
  // Do NOT call restoreAllMocks() — that calls .mockRestore() on vi.fn()
  // which strips the implementation, causing the next test to get undefined.
  vi.clearAllMocks();
});

/**
 * Perform n throws by clicking the "Toss the coins" button.
 * Uses the button's text content rather than a class selector so it never
 * accidentally clicks "Read this hexagram" (which also carries .btn--primary).
 * With reduced motion active (the beforeEach default) every throw is synchronous.
 */
function doThrows(n = 6): void {
  for (let i = 0; i < n; i++) {
    const btn = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
      .find(b => !b.hidden && b.textContent?.trim() === 'Toss the coins');
    if (!btn) throw new Error(`"Toss the coins" button not found on throw ${i + 1}`);
    btn.click();
  }
}

// ── Casting page — DOM structure ────────────────────────────────────────────

describe('castingPage — 6 fixed slots (always in DOM)', () => {
  it('renders exactly 6 line-slot elements before any cast', () => {
    renderCastingPage(container, vi.fn());
    expect(container.querySelectorAll('.line-slot')).toHaveLength(6);
  });

  it('slots are empty before the first cast (no .line-row children)', () => {
    renderCastingPage(container, vi.fn());
    const populated = Array.from(container.querySelectorAll('.line-slot'))
      .filter(s => s.children.length > 0);
    expect(populated).toHaveLength(0);
  });
});

describe('castingPage — bottom-up ordering after cast', () => {
  it('the BOTTOM line (position 1) occupies the last DOM slot — visual bottom', () => {
    // Central convention: lines[0].position === 1, rendered last in DOM so it
    // appears at the bottom of the column.
    renderCastingPage(container, vi.fn());
    doThrows(6);

    const slots = container.querySelectorAll('.line-slot');
    expect(slots).toHaveLength(6);

    // Last slot in DOM = visual bottom = position 1
    const bottomSlot = slots[slots.length - 1]!;
    const bottomLine = bottomSlot.querySelector('[role="img"]');
    expect(bottomLine).not.toBeNull();
    expect(bottomLine!.getAttribute('aria-label')).toMatch(/Line 1/);
    expect(bottomLine!.getAttribute('aria-label')).toMatch(/bottom/);
  });

  it('the TOP line (position 6) occupies the first DOM slot — visual top', () => {
    renderCastingPage(container, vi.fn());
    doThrows(6);

    const slots = container.querySelectorAll('.line-slot');
    const topSlot = slots[0]!;
    const topLine = topSlot.querySelector('[role="img"]');
    expect(topLine).not.toBeNull();
    expect(topLine!.getAttribute('aria-label')).toMatch(/Line 6/);
    expect(topLine!.getAttribute('aria-label')).toMatch(/top/);
  });

  it('after a cast, all 6 slots are populated', () => {
    renderCastingPage(container, vi.fn());
    doThrows(6);
    const populated = Array.from(container.querySelectorAll('.line-slot'))
      .filter(s => s.querySelector('[role="img"]') !== null);
    expect(populated).toHaveLength(6);
  });
});

// ── Casting page — accessible names ────────────────────────────────────────

describe('castingPage — aria-label on line elements', () => {
  it('changing lines carry the yao--changing weight/luminance non-colour signal', () => {
    // Contract: a changing line must carry a non-colour visual signal in addition
    // to the violet fill. The signal is the .yao--changing class, which drives a
    // taller bar height (--hero-bar-h-changing) and a brighter ink fill
    // (--clr-accent-lit) via CSS — weight + luminance, not hue alone (WCAG 1.4.1).
    // The old SVG seal was removed; .yao--changing is now the sole structural marker.
    vi.mocked(castLine).mockImplementation((pos: LinePosition) => makeLine(pos, 9));
    renderCastingPage(container, vi.fn());
    doThrows(6);

    // Find changing lines by their accessible name — behavioural, not structural.
    const changingRows = container.querySelectorAll<HTMLElement>('[aria-label*=", changing"]');
    expect(changingRows).toHaveLength(6);
    for (const row of changingRows) {
      // The yao stroke element must carry the changing modifier class…
      expect(row.querySelector('.yao--changing')).not.toBeNull();
      // …and its yao__bar child is the element that receives the taller height.
      expect(row.querySelector('.yao--changing .yao__bar')).not.toBeNull();
      // The seal was removed — no .yao__seal anywhere in the row.
      expect(row.querySelector('.yao__seal')).toBeNull();
    }

    // Non-changing rows must NOT carry the changing modifier
    const allRows = container.querySelectorAll<HTMLElement>('[role="img"][aria-label]');
    const stableRows = Array.from(allRows).filter(
      r => !(r.getAttribute('aria-label') ?? '').includes(', changing')
    );
    expect(stableRows).toHaveLength(0); // all-changing cast → none stable
  });

  it('every line element has an accessible name stating position, yin/yang, and changing state', () => {
    vi.mocked(castLine).mockImplementation((pos: LinePosition) => makeLine(pos, 9));
    renderCastingPage(container, vi.fn());
    doThrows(6);

    const lineRows = container.querySelectorAll('[role="img"][aria-label]');
    expect(lineRows).toHaveLength(6);

    for (const row of lineRows) {
      const label = row.getAttribute('aria-label') ?? '';
      // Must identify the line by number
      expect(label).toMatch(/Line \d/);
      // Must state polarity
      expect(label).toMatch(/\b(yin|yang)\b/i);
      // All lines in this cast are changing — must say so
      expect(label).toContain('changing');
    }
  });

  it('non-changing lines do NOT say "changing" in their accessible name', () => {
    renderCastingPage(container, vi.fn());
    doThrows(6);

    for (const row of container.querySelectorAll('[role="img"][aria-label]')) {
      // Stable lines: their age description contains yin/yang but no "changing"
      const label = row.getAttribute('aria-label') ?? '';
      // "young yang" / "young yin" — not "changing"
      // The label DOES mention yin/yang via age, but the standalone "changing" word must be absent
      expect(label).not.toContain(', changing');
    }
  });
});

// ── Casting page — non-color signal on changing lines ──────────────────────

describe('castingPage — non-color signal on changing lines', () => {
  it('every changing line carries a non-colour visual signal (weight + luminance, not colour alone)', () => {
    // Mouse removed the SVG seal; the non-colour signal is now purely structural:
    // .yao--changing drives a taller bar (--hero-bar-h-changing) and a brighter ink
    // fill (--clr-accent-lit). Weight + luminance differ from stable lines; hue is
    // not the only channel (WCAG 1.4.1 satisfied).
    vi.mocked(castLine).mockImplementation((pos: LinePosition) => makeLine(pos, 9));
    renderCastingPage(container, vi.fn());
    doThrows(6);

    const changingRows = container.querySelectorAll<HTMLElement>('[aria-label*=", changing"]');
    expect(changingRows).toHaveLength(6);

    for (const row of changingRows) {
      // The stroke must have the changing modifier class
      expect(row.querySelector('.yao--changing')).not.toBeNull();
      // The yao__bar inside it receives the height increase — confirm it is present
      expect(row.querySelector('.yao--changing .yao__bar')).not.toBeNull();
    }
  });

  it('non-changing lines have no yao--changing class (and no seal anywhere)', () => {
    renderCastingPage(container, vi.fn());
    doThrows(6);

    // Locate non-changing rows by absence of ", changing" in the accessible name
    const allRows = container.querySelectorAll<HTMLElement>('[role="img"][aria-label]');
    const stableRows = Array.from(allRows).filter(
      r => !(r.getAttribute('aria-label') ?? '').includes(', changing')
    );
    expect(stableRows).toHaveLength(6);
    for (const row of stableRows) {
      // No changing modifier class on stable lines
      expect(row.querySelector('.yao--changing')).toBeNull();
    }
    // No seal anywhere in the entire cast display (seal was removed)
    expect(container.querySelector('.yao__seal')).toBeNull();
  });
});

// ── Casting page — aria-live region ────────────────────────────────────────

describe('castingPage — aria-live region', () => {
  it('an aria-live="polite" region exists before any cast', () => {
    renderCastingPage(container, vi.fn());
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it('the live region receives content once the cast is complete', () => {
    renderCastingPage(container, vi.fn());
    doThrows(6);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    // completeCast() sets: "Line 6 (top): … Hexagram complete. … The reading is ready."
    expect(liveRegion!.textContent).toMatch(/Hexagram complete/i);
  });

  it('live region announces changing-line count when there are changing lines', () => {
    // Position 1 is old yin (changing); positions 2-6 are young yang (stable).
    vi.mocked(castLine).mockImplementation((pos: LinePosition) => makeLine(pos, pos === 1 ? 6 : 7));
    renderCastingPage(container, vi.fn());
    doThrows(6);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion!.textContent).toMatch(/1 changing line/i);
  });

  it('live region says "No changing lines" when none change', () => {
    renderCastingPage(container, vi.fn());
    doThrows(6);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion!.textContent).toMatch(/No changing lines/i);
  });
});

// ── Reading NOT auto-shown (hard product requirement from Mor) ──────────────

describe('reading view — NOT auto-shown after casting', () => {
  it('the reading view does NOT appear automatically after a cast', () => {
    const onAnalyze = vi.fn();

    renderCastingPage(container, onAnalyze);
    doThrows(6);

    // Behavioural checks: casting page elements present, reading-specific elements absent.
    // "Toss the coins" must still be in the DOM (even hidden) — we're on the cast page.
    const castBtnInDom = Array.from(container.querySelectorAll('button'))
      .some(b => b.textContent?.trim() === 'Toss the coins');
    expect(castBtnInDom).toBe(true);
    // No reading-view heading — the primary hexagram section must not yet exist.
    expect(container.querySelector('#primary-heading')).toBeNull();
  });

  it('the onAnalyze callback is NOT called by the cast itself', () => {
    const onAnalyze = vi.fn();
    vi.mocked(castHexagram).mockReturnValue(makeNoChangingCast());

    renderCastingPage(container, onAnalyze);
    container.querySelector<HTMLButtonElement>('.btn--primary')!.click();

    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it('the onAnalyze callback IS called when the user clicks "Read this hexagram"', () => {
    const onAnalyze = vi.fn();
    // The expected cast: all young-yang lines (default castLine mock) → hex 1, no changing.
    const fakeCast = makeNoChangingCast();

    renderCastingPage(container, onAnalyze);
    doThrows(6);

    // Find and click the Read button
    const readBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
      .find(b => b.textContent?.includes('Read this hexagram'));
    expect(readBtn).not.toBeUndefined();
    readBtn!.click();

    expect(onAnalyze).toHaveBeenCalledOnce();
    // The cast assembled by the UI must structurally match the expected fixture.
    expect(onAnalyze).toHaveBeenCalledWith(fakeCast);
  });
});

// ── [hidden] guard regression (DEFECT 2) ────────────────────────────────────
//
// Root cause: `.cast-actions { display: flex }` out-specified the UA
// `[hidden] { display: none }` rule. Mouse added `[hidden] { display: none
// !important; }` as the very first rule in styles.css to close this gap.
// These tests pin the HTML `hidden` attribute state so a future author
// cannot accidentally re-introduce the defect by removing the CSS guard.

describe('castingPage — [hidden] guard on post-cast buttons (DEFECT 2 regression)', () => {
  it('the post-cast action area has hidden=true on first render, before any cast', () => {
    renderCastingPage(container, vi.fn());
    const actionArea = container.querySelector<HTMLElement>('.cast-actions');
    expect(actionArea).not.toBeNull();
    // hidden MUST be set — this is what the CSS [hidden]{display:none!important}
    // guard keys off of to override the author flex rule. Without this attribute
    // the !important rule is irrelevant and the buttons become visible.
    expect(actionArea!.hidden).toBe(true);
    expect(actionArea!.getAttribute('hidden')).not.toBeNull();
  });

  it('the post-cast action area becomes visible (hidden=false) after a successful cast', () => {
    renderCastingPage(container, vi.fn());
    doThrows(6);

    const actionArea = container.querySelector<HTMLElement>('.cast-actions');
    expect(actionArea!.hidden).toBe(false);
  });

  it('a second cast hides the action area again then re-shows it', () => {
    renderCastingPage(container, vi.fn());

    // First cast
    doThrows(6);
    const actionArea = container.querySelector<HTMLElement>('.cast-actions');
    expect(actionArea!.hidden).toBe(false);

    // "Cast again" resets state — action area should go back to hidden
    const castAgainBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
      .find(b => b.textContent?.trim() === 'Cast again');
    expect(castAgainBtn).not.toBeUndefined();
    castAgainBtn!.click();
    expect(actionArea!.hidden).toBe(true); // hidden again after reset

    // Second cast — all six throws complete synchronously → re-shown
    doThrows(6);
    expect(actionArea!.hidden).toBe(false);
  });
});



describe('castingPage — reduced-motion path', () => {
  it('all 6 lines still appear when prefers-reduced-motion is active', () => {
    // matchMedia is already mocked to return matches=true for reduced-motion.
    // With delay=0 each throw is synchronous; 6 clicks complete the cast.
    renderCastingPage(container, vi.fn());
    doThrows(6);

    const lineRows = container.querySelectorAll('[role="img"][aria-label]');
    expect(lineRows).toHaveLength(6);
  });
});

// ── Reading view — primary hexagram content ─────────────────────────────────

describe('renderReadingView — primary hexagram', () => {
  it('renders the hexagram number', () => {
    renderReadingView(container, makeNoChangingCast());
    expect(container.textContent).toContain(`No.\u00a0${FAKE_HEXAGRAM.number}`);
  });

  it('renders namePinyin and nameEn', () => {
    renderReadingView(container, makeNoChangingCast());
    expect(container.textContent).toContain(FAKE_HEXAGRAM.namePinyin);
    expect(container.textContent).toContain(FAKE_HEXAGRAM.nameEn);
  });

  it('renders the Judgment text', () => {
    renderReadingView(container, makeNoChangingCast());
    expect(container.textContent).toContain(FAKE_HEXAGRAM.judgment);
  });

  it('renders the Image text', () => {
    renderReadingView(container, makeNoChangingCast());
    expect(container.textContent).toContain(FAKE_HEXAGRAM.image);
  });
});

// ── Reading view — changing lines ───────────────────────────────────────────

describe('renderReadingView — changing lines section', () => {
  it('shows "No changing lines" note when cast.changing is empty', () => {
    renderReadingView(container, makeNoChangingCast());
    // Check behaviorally — does the page text contain the expected message?
    expect(container.textContent).toMatch(/No changing lines/i);
  });

  it('does NOT show "No changing lines" text when there are changing lines', () => {
    renderReadingView(container, makeOneChangingCast());
    expect(container.textContent).not.toMatch(/No changing lines/i);
  });

  it('renders exactly one changing-line entry for a cast with one changing position', () => {
    renderReadingView(container, makeOneChangingCast());
    // Use the class name for counting but check text content for the contract.
    expect(container.querySelectorAll('.changing-line')).toHaveLength(1);
  });

  it('renders the correct per-line text for the changing position', () => {
    renderReadingView(container, makeOneChangingCast()); // position 1 is changing
    const lineTexts = container.querySelectorAll('.changing-line-text');
    expect(lineTexts).toHaveLength(1);
    // position 1 → index 0 in FAKE_HEXAGRAM.lines
    expect(lineTexts[0]!.textContent).toContain(FAKE_HEXAGRAM.lines[0]);
  });

  it('renders all 6 changing-line entries when all 6 lines are changing', () => {
    renderReadingView(container, makeAllChangingCast());
    expect(container.querySelectorAll('.changing-line')).toHaveLength(6);
  });

  it('renders line texts for ALL changing positions', () => {
    renderReadingView(container, makeAllChangingCast());
    const lineTexts = Array.from(container.querySelectorAll('.changing-line-text'))
      .map(el => el.textContent ?? '');
    for (let i = 0; i < 6; i++) {
      expect(lineTexts.some(t => t.includes(FAKE_HEXAGRAM.lines[i]!))).toBe(true);
    }
  });
});

// ── Reading view — transformed hexagram section ────────────────────────────

describe('renderReadingView — transformed hexagram', () => {
  it('does NOT render a "Transformation" section when there are no changing lines', () => {
    renderReadingView(container, makeNoChangingCast());
    // Behavioural: heading text "Transformation" must not appear
    const headings = Array.from(container.querySelectorAll('h2'));
    expect(headings.some(h => h.textContent?.includes('Transformation'))).toBe(false);
  });

  it('renders a "Transformation" section when there is at least one changing line', () => {
    renderReadingView(container, makeAllChangingCast());
    // Behavioural: heading text "Transformation" must appear
    const headings = Array.from(container.querySelectorAll('h2'));
    expect(headings.some(h => h.textContent?.includes('Transformation'))).toBe(true);
  });
});
