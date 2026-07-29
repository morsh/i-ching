/**
 * historyPanel.ts — Past castings panel for the casting page.
 *
 * Renders a list of stored casts (newest first) into a given container.
 * Hexagram identity (Chinese name, English name) is resolved fresh from the
 * corpus on every render — no denormalised text is stored in localStorage.
 * If a cast was saved with a question, it appears as the first line of each
 * entry, clipped to a single line with `text-overflow: ellipsis`.
 *
 * OWNER: Trinity.
 * RAI: no innerHTML; no network; localStorage access only through src/storage/.
 */

import type { SavedCast } from '../storage/history';
import { getHistory, deleteCast, clearHistory, isHistoryAvailable } from '../storage/history';
import { getHexagramByNumber } from '../data/hexagrams';

/**
 * Renders the history panel into `container` and returns a `refresh` function.
 * Call `refresh()` after a new cast is saved to update the list in place.
 *
 * When `isHistoryAvailable()` is false (private mode, storage disabled) the
 * container remains empty and the returned function is a no-op — casting
 * works normally for users with storage disabled.
 *
 * @param container The element to render history into.
 * @param onOpen    Called with the full SavedCast when the user selects an entry.
 * @returns A zero-argument refresh function.
 */
export function renderHistoryPanel(
  container: HTMLElement,
  onOpen: (saved: SavedCast) => void,
): () => void {
  function refresh(): void {
    buildPanel(container, onOpen, refresh);
  }
  refresh();
  return refresh;
}

// ── Internal render ─────────────────────────────────────────────────────────

function buildPanel(
  container: HTMLElement,
  onOpen: (saved: SavedCast) => void,
  refresh: () => void,
): void {
  container.textContent = '';

  if (!isHistoryAvailable()) return;

  const history = getHistory();

  const panel = document.createElement('section');
  panel.className = 'history-panel';
  panel.setAttribute('aria-labelledby', 'history-heading');

  const heading = document.createElement('h2');
  heading.id = 'history-heading';
  heading.textContent = 'Past Castings';
  panel.appendChild(heading);

  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'No casts yet. The record begins with your first throw.';
    panel.appendChild(empty);
    container.appendChild(panel);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'history-list';
  list.setAttribute('role', 'list');

  for (const saved of history) {
    list.appendChild(buildItem(saved, onOpen, refresh));
  }  panel.appendChild(list);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn--secondary history-clear-btn';
  clearBtn.textContent = 'Clear all';
  clearBtn.setAttribute('aria-label', 'Clear all past castings');
  clearBtn.addEventListener('click', () => {
    clearHistory();
    refresh();
  });
  panel.appendChild(clearBtn);

  container.appendChild(panel);
}

function buildItem(
  saved: SavedCast,
  onOpen: (saved: SavedCast) => void,
  refresh: () => void,
): HTMLLIElement {
  const num = saved.cast.primary.number;
  let nameZh = '';
  let nameEn = '';

  try {
    const hex = getHexagramByNumber(num);
    nameZh = hex.nameZh;
    nameEn = hex.nameEn;
  } catch {
    /* corpus not yet available — fall back to number only */
  }

  const openLabel = nameEn
    ? `Open reading: Hexagram\u00a0${num}, ${nameEn}`
    : `Open reading: Hexagram\u00a0${num}`;
  const deleteLabel = nameEn
    ? `Delete Hexagram\u00a0${num}, ${nameEn} from history`
    : `Delete Hexagram\u00a0${num} from history`;

  const li = document.createElement('li');
  li.className = 'history-item';

  // Open button — the entire left portion of the row is the interactive target.
  const openBtn = document.createElement('button');
  openBtn.className = 'history-item__open';
  openBtn.setAttribute('aria-label', openLabel);
  openBtn.addEventListener('click', () => onOpen(saved));

  const zhSpan = document.createElement('span');
  zhSpan.className = 'history-item__zh';
  zhSpan.textContent = nameZh || String(num);
  zhSpan.setAttribute('aria-hidden', 'true');
  openBtn.appendChild(zhSpan);

  const textBlock = document.createElement('span');
  textBlock.className = 'history-item__text';

  // Question first line — single line with ellipsis (CSS handles truncation).
  // Only rendered when present; absent question leaves no blank space.
  if (saved.question !== undefined && saved.question.length > 0) {
    const qSpan = document.createElement('span');
    qSpan.className = 'history-item__question';
    qSpan.textContent = saved.question;   // textContent — stored data is untrusted
    textBlock.appendChild(qSpan);
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = 'history-item__name';
  nameSpan.textContent = nameEn
    ? `No.\u00a0${num}\u2003${nameEn}`
    : `No.\u00a0${num}`;
  textBlock.appendChild(nameSpan);

  const timeSpan = document.createElement('span');
  timeSpan.className = 'history-item__time';
  timeSpan.textContent = relativeTime(saved.savedAt);
  textBlock.appendChild(timeSpan);

  openBtn.appendChild(textBlock);
  li.appendChild(openBtn);

  // Delete button — small, beside the open button, clearly labelled.
  const delBtn = document.createElement('button');
  delBtn.className = 'history-item__delete';
  delBtn.setAttribute('aria-label', deleteLabel);
  delBtn.textContent = '\u00d7'; // ×
  delBtn.addEventListener('click', () => {
    deleteCast(saved.id);
    refresh();
  });
  li.appendChild(delBtn);

  return li;
}

// ── Relative time ────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  let diff: number;
  try {
    diff = Date.now() - new Date(isoString).getTime();
  } catch {
    return '';
  }
  if (diff < 0) return 'just now';
  const secs = Math.floor(diff / 1000);
  if (secs < 90) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'last week';
  return `${weeks} weeks ago`;
}
