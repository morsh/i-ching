/**
 * Reading view — primary hexagram, changing lines, transformation diagram.
 * OWNER: Trinity.
 *
 * RAI: no innerHTML with corpus or user text; no network; persistence only
 * through src/storage/ (opt-in save button, never automatic).
 */

import type { Cast, Hexagram, HexagramRef } from '../types';
import { getHexagramByNumber } from '../data/hexagrams';
import { buildYaoLine } from './castingPage';
import { saveCast, isHistoryAvailable } from '../storage/history';

/**
 * Renders the full reading for a completed Cast into `container`.
 *
 * @param container  Host element (replaced wholesale).
 * @param cast       The cast to display.
 * @param options    Optional configuration:
 *   - `question`      The user's question at cast time (for the save payload).
 *   - `alreadySaved`  True when this reading was opened from history (starts in saved state).
 *   - `onRestart`     Called when user chooses to cast again; falls back to location.reload().
 */
export function renderReadingView(
  container: HTMLElement,
  cast: Cast,
  options: {
    question?: string;
    alreadySaved?: boolean;
    onRestart?: () => void;
  } = {}
): void {
  const { question, alreadySaved = false, onRestart } = options;
  container.textContent = '';

  const page = document.createElement('section');
  page.className = 'reading-page';

  // No top navigation, no header chrome — the oracle has spoken; the user is
  // sealed into the moment. A single quiet way back waits at the very end.

  // ── Heading ───────────────────────────────────────────────────────
  const h1 = document.createElement('h1');
  h1.textContent = 'The Reading';
  page.appendChild(h1);

  // Framing, encountered before any interpretation forms — set as an
  // epigraph, part of the composition rather than a disclaimer bolted on.
  const epigraph = document.createElement('p');
  epigraph.className = 'reading-epigraph';
  epigraph.textContent =
    'Read for reflection, not prediction. What follows is a mirror; the meaning you draw from it is your own.';
  page.appendChild(epigraph);

  // ── Corpus (may throw until Seraph ships) ─────────────────────────
  let primaryHex: Hexagram | null = null;
  let transformedHex: Hexagram | null = null;

  try { primaryHex = getHexagramByNumber(cast.primary.number); } catch { /* not yet */ }
  if (cast.transformed !== null) {
    try { transformedHex = getHexagramByNumber(cast.transformed.number); } catch { /* not yet */ }
  }

  // ── Primary hexagram section ──────────────────────────────────────
  const primarySection = document.createElement('section');
  primarySection.setAttribute('aria-labelledby', 'primary-heading');

  const primaryH2 = document.createElement('h2');
  primaryH2.id = 'primary-heading';
  primaryH2.textContent = 'Primary Hexagram';
  primarySection.appendChild(primaryH2);

  appendHexagramContent(primarySection, cast.primary, primaryHex, cast);
  page.appendChild(primarySection);

  page.appendChild(makeDivider());

  // ── Changing lines ────────────────────────────────────────────────
  const changingSection = document.createElement('section');
  changingSection.setAttribute('aria-labelledby', 'changing-heading');

  const changingH2 = document.createElement('h2');
  changingH2.id = 'changing-heading';
  changingH2.textContent = 'Changing Lines';
  changingSection.appendChild(changingH2);

  if (cast.changing.length === 0) {
    const none = document.createElement('p');
    none.className = 'no-changing-note';
    none.textContent =
      'No changing lines. The reading rests with the primary hexagram alone.';
    changingSection.appendChild(none);
  } else {
    for (const pos of cast.changing) {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'changing-line';

      const labelP = document.createElement('p');
      labelP.className = 'changing-line-label';
      labelP.textContent =
        pos === 1 ? 'Line 1 — bottom'
        : pos === 6 ? 'Line 6 — top'
        : `Line ${pos}`;
      lineDiv.appendChild(labelP);

      const textP = document.createElement('p');
      textP.className = 'changing-line-text';

      if (primaryHex !== null) {
        const text = primaryHex.lines[pos - 1];
        textP.textContent = text !== undefined ? text : '—';
      } else {
        textP.className += ' corpus-pending';
        textP.textContent = 'Line text not yet available.';
      }

      lineDiv.appendChild(textP);
      changingSection.appendChild(lineDiv);
    }
  }

  page.appendChild(changingSection);

  // ── Transformed hexagram ──────────────────────────────────────────
  if (cast.transformed !== null) {
    page.appendChild(makeDivider());

    const transformedSection = document.createElement('section');
    transformedSection.setAttribute('aria-labelledby', 'transformed-heading');

    const transformedH2 = document.createElement('h2');
    transformedH2.id = 'transformed-heading';
    transformedH2.textContent = 'Transformation';
    transformedSection.appendChild(transformedH2);

    const noteP = document.createElement('p');
    noteP.className = 'transformed-note';
    noteP.textContent =
      'The changing lines transform, moving the reading toward:';
    transformedSection.appendChild(noteP);

    // Side-by-side visual: primary → transformed
    transformedSection.appendChild(
      buildTransformationDiagram(cast.primary.binary, cast.transformed.binary, cast)
    );

    // Full transformed hexagram text
    appendHexagramContent(transformedSection, cast.transformed, transformedHex, null);
    page.appendChild(transformedSection);
  }

  // ── Disclaimer ────────────────────────────────────────────────────
  const disclaimer = document.createElement('aside');
  disclaimer.className = 'disclaimer';
  const discP = document.createElement('p');
  discP.textContent =
    'This reading is for reflection and contemplation only. ' +
    'It is not medical, legal, financial, or psychiatric advice. ' +
    'Interpretations are your own.';
  disclaimer.appendChild(discP);
  page.appendChild(disclaimer);

  // ── Save section — opt-in, never automatic ────────────────────────
  // Only rendered when localStorage is available. When the reading was opened
  // from history it starts in the saved state. A user with storage disabled
  // sees no save affordance — casting and reading work perfectly without it.
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  page.appendChild(liveRegion);

  if (isHistoryAvailable()) {
    let isSaved = alreadySaved;

    const saveSection = document.createElement('div');
    saveSection.className = 'reading-save';

    // Consent note — only when a question was typed and the reading has not yet been
    // saved. Gives the user point-of-decision awareness that their question is included.
    // Hidden once saving completes so it does not linger as a stale instruction.
    let consentNote: HTMLParagraphElement | null = null;
    if (!isSaved && question !== undefined && question.trim() !== '') {
      consentNote = document.createElement('p');
      consentNote.className = 'reading-save-note';
      consentNote.textContent = 'Saving will include your question.';
      saveSection.appendChild(consentNote);
    }

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn--secondary reading-save-btn';

    function applySavedState(): void {
      saveBtn.textContent = 'Saved to this device';
      saveBtn.disabled = true;
      saveBtn.setAttribute('aria-disabled', 'true');
      if (consentNote !== null) {
        consentNote.hidden = true;
      }
    }

    if (isSaved) {
      applySavedState();
    } else {
      saveBtn.textContent = 'Save reading locally';
      saveBtn.addEventListener('click', () => {
        if (isSaved) return;  // belt-and-suspenders guard (WeakMap handles duplicates too)
        saveCast(cast, question);
        isSaved = true;
        applySavedState();
        liveRegion.textContent = 'Reading saved to this device.';
      });
    }

    saveSection.appendChild(saveBtn);
    page.appendChild(saveSection);
  }

  // ── Bottom navigation ─────────────────────────────────────────────
  const bottomNav = document.createElement('div');
  bottomNav.className = 'reading-nav reading-nav--bottom';
  const bottomBtn = document.createElement('button');
  bottomBtn.className = 'btn btn--secondary';
  bottomBtn.textContent = 'Cast again';
  bottomBtn.addEventListener('click', restart);
  bottomNav.appendChild(bottomBtn);
  page.appendChild(bottomNav);

  // Sequential reveal — the interpretation rises paragraph by paragraph,
  // only after the user has opted in. Reduced-motion users get it at once.
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  if (!prefersReducedMotion) {
    let step = 0;
    for (const child of Array.from(page.children)) {
      const el = child as HTMLElement;
      el.classList.add('reveal-block');
      el.style.setProperty('--reveal-delay', `${step * 140}ms`);
      step++;
    }
  }

  container.appendChild(page);

  function restart(): void {
    if (onRestart !== undefined) onRestart();
    else window.location.reload();
  }
}

// ── Hexagram content block ───────────────────────────────────────────

function appendHexagramContent(
  section: HTMLElement,
  ref: HexagramRef,
  hex: Hexagram | null,
  cast: Cast | null
): void {
  // Identity block
  const identity = document.createElement('div');
  identity.className = 'hexagram-identity';

  if (hex !== null) {
    // Compositional transgression: the King Wen number at viewport scale,
    // cropped by the left edge. Decorative echo — the accessible number
    // still lives in the names row below, so this is aria-hidden.
    if (cast !== null) {
      const bigNum = document.createElement('span');
      bigNum.className = 'hexagram-bignum';
      bigNum.setAttribute('aria-hidden', 'true');
      bigNum.textContent = String(hex.number);
      identity.appendChild(bigNum);
    }

    // Large Chinese glyph — a design element
    const zh = document.createElement('span');
    zh.className = 'hexagram-zh';
    zh.textContent = hex.nameZh;
    identity.appendChild(zh);

    // Names row
    const namesRow = document.createElement('div');
    namesRow.className = 'hexagram-names-row';

    const numSpan = document.createElement('span');
    numSpan.className = 'hexagram-number';
    numSpan.textContent = `No.\u00a0${hex.number}`;
    namesRow.appendChild(numSpan);

    const pinyin = document.createElement('span');
    pinyin.className = 'hexagram-pinyin';
    pinyin.textContent = hex.namePinyin;
    namesRow.appendChild(pinyin);

    const en = document.createElement('span');
    en.className = 'hexagram-en';
    en.textContent = hex.nameEn;
    namesRow.appendChild(en);

    identity.appendChild(namesRow);

    const trigramsP = document.createElement('p');
    trigramsP.className = 'hexagram-trigrams';
    trigramsP.textContent =
      `Upper: ${hex.trigrams.upper.name}\u2003\u00b7\u2003Lower: ${hex.trigrams.lower.name}`;
    identity.appendChild(trigramsP);
  } else {
    const refP = document.createElement('p');
    refP.className = 'corpus-pending';
    refP.textContent =
      `Hexagram No.\u00a0${ref.number} (${ref.binary}) — corpus not yet loaded.`;
    identity.appendChild(refP);
  }

  section.appendChild(identity);

  // Mini hexagram visual
  section.appendChild(buildMiniHexagram(ref.binary, cast));

  if (hex !== null) {
    const jH3 = document.createElement('h3');
    jH3.textContent = 'Judgment';
    section.appendChild(jH3);
    const jP = document.createElement('p');
    jP.className = 'judgment-text';
    jP.textContent = hex.judgment;
    section.appendChild(jP);

    const iH3 = document.createElement('h3');
    iH3.textContent = 'Image';
    section.appendChild(iH3);
    const iP = document.createElement('p');
    iP.className = 'image-text';
    iP.textContent = hex.image;
    section.appendChild(iP);
  }
}

// ── Mini hexagram visual ─────────────────────────────────────────────

function buildMiniHexagram(binary: string, cast: Cast | null): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'mini-hexagram';
  wrapper.setAttribute('role', 'img');

  // Accessible label lists all lines
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const ch = binary.charAt(i);
    parts.push(`Line ${i + 1}: ${ch === '1' ? 'yang' : 'yin'}`);
  }
  wrapper.setAttribute('aria-label', `Hexagram lines: ${parts.join('; ')}`);

  const changingSet = new Set<number>(cast !== null ? cast.changing : []);

  // Render top-to-bottom (line 6 first, line 1 last)
  for (let i = 5; i >= 0; i--) {
    const ch = binary.charAt(i);
    const isYang = ch === '1';
    const position = i + 1;

    const slot = document.createElement('div');
    slot.className = 'mini-slot';

    const lineEl = buildYaoLine(isYang, changingSet.has(position), 'mini');
    slot.appendChild(lineEl);

    wrapper.appendChild(slot);
  }

  return wrapper;
}

// ── Transformation diagram ───────────────────────────────────────────

/**
 * Shows primary and transformed hexagrams side by side with a visual arrow,
 * so the user sees which lines changed and what they became.
 */
function buildTransformationDiagram(
  primaryBinary: string,
  transformedBinary: string,
  cast: Cast
): HTMLElement {
  const diagram = document.createElement('div');
  diagram.className = 'transformation-diagram';
  diagram.setAttribute('role', 'img');
  diagram.setAttribute(
    'aria-label',
    'Primary hexagram transforming into the transformed hexagram'
  );

  // Primary side
  const primaryCol = document.createElement('div');
  const primaryLabel = document.createElement('p');
  primaryLabel.className = 'transformation-label';
  primaryLabel.textContent = 'Primary';
  primaryLabel.setAttribute('aria-hidden', 'true');
  primaryCol.appendChild(primaryLabel);
  primaryCol.appendChild(buildCompactHex(primaryBinary, cast));
  diagram.appendChild(primaryCol);

  // Arrow
  const arrow = document.createElement('span');
  arrow.className = 'transformation-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';
  diagram.appendChild(arrow);

  // Transformed side
  const transformedCol = document.createElement('div');
  const transformedLabel = document.createElement('p');
  transformedLabel.className = 'transformation-label';
  transformedLabel.textContent = 'Transformed';
  transformedLabel.setAttribute('aria-hidden', 'true');
  transformedCol.appendChild(transformedLabel);
  transformedCol.appendChild(buildCompactHex(transformedBinary, cast));
  diagram.appendChild(transformedCol);

  return diagram;
}

/** Compact hexagram visual used only in the transformation diagram. */
function buildCompactHex(binary: string, cast: Cast | null): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'transformation-hex';
  wrapper.setAttribute('aria-hidden', 'true');

  const changingSet = new Set<number>(cast !== null ? cast.changing : []);

  for (let i = 5; i >= 0; i--) {
    const ch = binary.charAt(i);
    const isYang = ch === '1';
    const position = i + 1;

    const row = document.createElement('div');
    row.className = 'mini-slot';

    const lineEl = buildYaoLine(isYang, changingSet.has(position), 'mini');
    row.appendChild(lineEl);

    wrapper.appendChild(row);
  }

  return wrapper;
}

function makeDivider(): HTMLElement {
  const hr = document.createElement('hr');
  hr.className = 'section-divider';
  return hr;
}
