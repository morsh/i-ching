/**
 * XSS / injection audit.
 *
 * Hard project rule: corpus text and user input must reach the DOM only via
 * `textContent` or `createTextNode`. Any use of innerHTML, outerHTML,
 * insertAdjacentHTML, document.write, or eval in src/ is an automatic
 * quality-gate failure.
 *
 * Owner: Tank
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR   = join(__dirname, '..', 'src');
const HTML_FILE = join(__dirname, '..', 'index.html');

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

function nonCommentCode(source: string): string {
  return source
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*'); })
    .join('\n');
}

const XSS_PATTERNS: string[] = [
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'document.write',
  'eval(',
];

const tsFiles = collectTsFiles(SRC_DIR);

describe('no XSS / injection vectors in src/', () => {
  it('finds at least one .ts source file to scan', () => {
    expect(tsFiles.length).toBeGreaterThan(0);
  });

  for (const pattern of XSS_PATTERNS) {
    it(`no src/**/*.ts file uses "${pattern}"`, () => {
      const violations: string[] = [];
      for (const filePath of tsFiles) {
        const code = nonCommentCode(readFileSync(filePath, 'utf-8'));
        if (code.includes(pattern)) violations.push(filePath);
      }
      if (violations.length > 0) {
        expect.fail(`"${pattern}" found in (non-comment code):\n${violations.join('\n')}`);
      }
      expect(violations).toHaveLength(0);
    });
  }
});

describe('no XSS vectors in index.html', () => {
  it('index.html does not contain inline event handlers (onload, onerror, etc.)', () => {
    const html = readFileSync(HTML_FILE, 'utf-8');
    const inlineHandlers = html.match(/\bon\w+\s*=/g) ?? [];
    if (inlineHandlers.length > 0) {
      expect.fail(`Inline event handlers in index.html: ${inlineHandlers.join(', ')}`);
    }
    expect(inlineHandlers).toHaveLength(0);
  });
});
