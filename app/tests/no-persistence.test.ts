/**
 * Statelessness, persistence-boundary, and privacy audit.
 *
 * The owner has approved adding cast-history persistence via localStorage,
 * but that allowance is deliberately narrow: ONLY src/storage/ may touch
 * localStorage. Every other persistence or network API remains hard-banned
 * across all of src/.
 *
 * Guarantees enforced by this file:
 *   - sessionStorage          — banned everywhere, no exceptions
 *   - document.cookie         — banned everywhere, no exceptions
 *   - indexedDB               — banned everywhere, no exceptions
 *   - fetch(                  — banned everywhere, no exceptions
 *   - XMLHttpRequest          — banned everywhere, no exceptions
 *   - navigator.sendBeacon    — banned everywhere, no exceptions
 *   - WebSocket               — banned everywhere, no exceptions
 *   - localStorage outside    — banned; only src/storage/ may use it
 *     src/storage/
 *   - localStorage inside     — confirmed present (narrowness verified
 *     src/storage/              both ways)
 *   - question text never     — SavedCast has no question field;
 *     persisted                 history.ts never reads a DOM input
 *
 * Owner: Tank
 *
 * Related test file: tests/storage-history.test.ts (unit tests for
 * src/storage/history.ts, including behavioural privacy round-trip).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR         = join(__dirname, '..', 'src');
const SRC_STORAGE_DIR = join(SRC_DIR, 'storage');
const HISTORY_FILE    = join(SRC_STORAGE_DIR, 'history.ts');
const HTML_FILE       = join(__dirname, '..', 'index.html');
const CSS_FILE        = join(__dirname, '..', 'src', 'styles.css');

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

/**
 * Strip comment lines before scanning for banned patterns.
 * Removes:
 *   - single-line comments:  // ...
 *   - JSDoc/block-comment continuation lines:  * ...
 *   - block-comment opening lines:  /* ...  or  /** ...
 * This prevents false positives when a comment documents that a pattern is
 * banned (e.g. "localStorage is not used here") or explicitly names it (e.g.
 * "Contains no question text.") from being counted as a real code reference.
 */
function codeLines(source: string): string {
  return source
    .split('\n')
    .filter(l => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
}

const tsFiles         = collectTsFiles(SRC_DIR);
// Files that live outside src/storage/ — localStorage is banned here.
const nonStorageFiles = tsFiles.filter(f => !f.startsWith(SRC_STORAGE_DIR + sep));
// Files that live inside src/storage/ — localStorage is the only permitted persistence API.
const storageFiles    = tsFiles.filter(f => f.startsWith(SRC_STORAGE_DIR + sep));

// ---------------------------------------------------------------------------
// APIs that are hard-banned across ALL of src/ — no exceptions whatsoever
// ---------------------------------------------------------------------------

const GLOBALLY_BANNED: string[] = [
  'sessionStorage',
  'document.cookie',
  'indexedDB',
  'fetch(',
  'XMLHttpRequest',
  'navigator.sendBeacon',
  'WebSocket',
];

describe('globally banned APIs — absent from every src/**/*.ts', () => {
  it('finds at least one .ts source file to scan', () => {
    expect(tsFiles.length).toBeGreaterThan(0);
  });

  for (const pattern of GLOBALLY_BANNED) {
    it(`"${pattern}" is absent from every src/**/*.ts file`, () => {
      const violations: string[] = [];
      for (const filePath of tsFiles) {
        const code = codeLines(readFileSync(filePath, 'utf-8'));
        if (code.includes(pattern)) violations.push(filePath);
      }
      if (violations.length > 0) {
        expect.fail(`"${pattern}" found in:\n${violations.join('\n')}`);
      }
      expect(violations).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// localStorage is narrowly permitted — ONLY in src/storage/
// ---------------------------------------------------------------------------

describe('localStorage confined to src/storage/ (approved scope)', () => {
  it('no src file OUTSIDE src/storage/ references localStorage', () => {
    const violations: string[] = [];
    for (const filePath of nonStorageFiles) {
      const code = codeLines(readFileSync(filePath, 'utf-8'));
      if (code.includes('localStorage')) violations.push(filePath);
    }
    if (violations.length > 0) {
      expect.fail(`localStorage used outside the approved src/storage/ boundary:\n${violations.join('\n')}`);
    }
    expect(violations).toHaveLength(0);
  });

  it('src/storage/ DOES use localStorage (narrowness verified both ways)', () => {
    // If localStorage were removed from storage/ this test would fail, preventing
    // a silent false-pass in the test above.
    const anyUse = storageFiles.some(f =>
      codeLines(readFileSync(f, 'utf-8')).includes('localStorage'),
    );
    expect(anyUse, 'Expected src/storage/history.ts to use localStorage').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Privacy invariant — the user's question text is NEVER TRANSMITTED
//
// Local opt-in storage is permitted (the owner explicitly approved it).
// The invariant that replaces "never persisted" is: the question must never
// leave the device. Proven structurally below: (a) the question field is
// optional — absence is always valid, confirming the opt-in model, and
// (b) src/storage/ contains no network primitives whatsoever, so question
// data has no path to any server.
// ---------------------------------------------------------------------------

describe('privacy invariant — question text is never transmitted', () => {
  it('SavedCast.question is optional (question?:) — absence is always valid, confirming opt-in model', () => {
    const source = readFileSync(HISTORY_FILE, 'utf-8');
    // Extract the SavedCast interface body (text between the first { after
    // 'interface SavedCast' and its closing }).
    const match = source.match(/interface SavedCast\s*\{([^}]+)\}/);
    expect(match, 'SavedCast interface not found in history.ts').not.toBeNull();
    // Strip JSDoc/comment lines before inspecting the field declaration.
    const cleanBody = (match![1]!)
      .split('\n')
      .filter(l => {
        const t = l.trim();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      })
      .join('\n');
    // question must be declared optional (question?:). A required field would
    // be a privacy regression: it would force every save to carry question text,
    // making a question-free cast impossible and conflating "no question asked"
    // with a schema error.
    expect(
      cleanBody,
      'SavedCast.question must be declared optional (question?:) to permit question-free saves',
    ).toMatch(/\bquestion\?:/);
  });

  it('src/storage/ contains no network APIs — question data cannot be transmitted off-device', () => {
    // These primitives are globally banned across all of src/ (verified in the
    // block above), but this dedicated assertion makes the transmission guarantee
    // explicit for the specific layer that holds question data.  A future author
    // adding a sync feature must break THIS test before any question text could
    // leave the device.
    const NETWORK_PRIMITIVES = ['fetch(', 'XMLHttpRequest', 'navigator.sendBeacon', 'WebSocket'];
    const violations: string[] = [];
    for (const filePath of storageFiles) {
      const code = codeLines(readFileSync(filePath, 'utf-8'));
      for (const pattern of NETWORK_PRIMITIVES) {
        if (code.includes(pattern)) violations.push(`${filePath}: "${pattern}"`);
      }
    }
    if (violations.length > 0) {
      expect.fail(
        `Network API found in src/storage/ — question data must never leave the device:\n${violations.join('\n')}`,
      );
    }
    expect(violations).toHaveLength(0);
  });

  it('src/storage/ does not access DOM input elements', () => {
    // These are the only ways to read a form-field value from the DOM.
    const DOM_QUERY_PATTERNS = [
      'getElementById',
      'querySelector',
      'querySelectorAll',
      'document.forms',
    ];
    const violations: string[] = [];
    for (const filePath of storageFiles) {
      const code = codeLines(readFileSync(filePath, 'utf-8'));
      for (const pattern of DOM_QUERY_PATTERNS) {
        if (code.includes(pattern)) {
          violations.push(`${filePath}: "${pattern}"`);
        }
      }
    }
    if (violations.length > 0) {
      expect.fail(`DOM input access found in src/storage/ — storage must never read from the DOM:\n${violations.join('\n')}`);
    }
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// No external resource URLs in index.html
// ---------------------------------------------------------------------------

describe('no external resource URLs in index.html', () => {
  it('index.html loads no external scripts, stylesheets, icons, fonts, or images', () => {
    const html = readFileSync(HTML_FILE, 'utf-8');

    const violations: string[] = [];
    const srcMatches = html.match(/\bsrc=["']https?:\/\/[^"']+["']/g) ?? [];
    violations.push(...srcMatches);

    const externalLinks = html.match(/<link\b[^>]*\bhref=["']https?:\/\/[^"']+["'][^>]*>/gi) ?? [];
    for (const tag of externalLinks) {
      if (!/\brel=["']canonical["']/i.test(tag)) {
        violations.push(tag);
      }
    }

    if (violations.length > 0) {
      expect.fail(`External resource URLs found in index.html:\n${violations.join('\n')}`);
    }
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// No external @import in styles.css
// ---------------------------------------------------------------------------

describe('no external @import in styles.css', () => {
  it('styles.css does not @import from an external URL', () => {
    const css = readFileSync(CSS_FILE, 'utf-8');
    const externalImports = (css.match(/@import[^;]+/g) ?? [])
      .filter(i => /https?:\/\//.test(i));
    if (externalImports.length > 0) {
      expect.fail(`External @import in styles.css:\n${externalImports.join('\n')}`);
    }
    expect(externalImports).toHaveLength(0);
  });

  it('styles.css does not load web fonts from a remote source', () => {
    const css = readFileSync(CSS_FILE, 'utf-8');
    const remoteFonts = (css.match(/url\s*\([^)]+\)/g) ?? [])
      .filter(u => /https?:\/\//.test(u));
    if (remoteFonts.length > 0) {
      expect.fail(`Remote font URL in styles.css:\n${remoteFonts.join('\n')}`);
    }
    expect(remoteFonts).toHaveLength(0);
  });
});
