/**
 * Enforces the project-wide hard rule: Math.random is BANNED in all src/ files.
 * Any hit causes an automatic quality-gate failure.
 *
 * Owner: Tank
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src');

/** Recursively collect every .ts file path under a directory. */
function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('no Math.random in src/', () => {
  const tsFiles = collectTsFiles(SRC_DIR);

  it('finds at least one .ts source file to scan', () => {
    expect(tsFiles.length).toBeGreaterThan(0);
  });

  it('no src/**/*.ts file contains Math.random in non-comment code', () => {
    // Strip single-line comment lines and JSDoc lines (starting with // or *)
    // before searching. This prevents false positives from comments that
    // document the ban (e.g. "Math.random is BANNED in this file"), while
    // still catching any actual call or reference in executable code.
    const violations: string[] = [];
    for (const filePath of tsFiles) {
      const source = readFileSync(filePath, 'utf-8');
      const codeLines = source
        .split('\n')
        .filter((line) => {
          const trimmed = line.trim();
          // Skip single-line comments and JSDoc/block-comment lines.
          return !trimmed.startsWith('//') && !trimmed.startsWith('*');
        })
        .join('\n');
      if (codeLines.includes('Math.random')) {
        violations.push(filePath);
      }
    }
    // Report every violating file clearly before failing.
    if (violations.length > 0) {
      const msg = `Math.random found in (non-comment code):\n${violations.join('\n')}`;
      expect.fail(msg);
    }
    expect(violations).toHaveLength(0);
  });
});
