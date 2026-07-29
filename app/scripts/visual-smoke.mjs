/**
 * visual-smoke.mjs — Headless Playwright smoke test for the I Ching Oracle.
 *
 * Usage:  npm run test:visual
 *
 * Requires the dev server running at http://localhost:5173 (npm run dev).
 * Fails with a clear message if nothing is listening.
 *
 * Kept separate from Vitest (`npm test`) on purpose — these tests launch a
 * real browser which takes ~5-10 s; the Vitest suite must stay fast (< 3 s).
 *
 * Tests:
 *  1. Before any cast — post-cast action buttons are genuinely not rendered
 *     (hidden attribute + no offsetParent + not in tab order).
 *  2. After a cast — all six lines present; bottom line (position 1) has a
 *     greater Y coordinate than the top line (position 6), verifying the
 *     bottom-to-top convention through real layout geometry.
 *  3. Full cast-and-read run — zero console errors, zero external network
 *     requests. The zero-requests guarantee is a hard product promise.
 *
 * Owner: Tank
 */

import { chromium } from 'playwright';
import assert from 'assert/strict';

const BASE_URL = 'http://localhost:5173';
const CAST_TIMEOUT = 20_000;  // generous — ceremony ≈ 3.5 s, timeline may shift

// ── Helpers ───────────────────────────────────────────────────────────

async function checkServer() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error('\n✗ Dev server is not reachable at', BASE_URL);
    console.error('  Start it first with:  npm run dev');
    console.error('  Error:', e.message);
    process.exit(1);
  }
}

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    console.log('PASS');
    passed++;
  } catch (err) {
    console.log('FAIL');
    console.error(`    ✗ ${err.message}`);
    failed++;
    failures.push({ name, message: err.message });
  }
}

// ── Tests ─────────────────────────────────────────────────────────────

async function runTests(browser) {

  // ── Test 1: Post-cast buttons hidden on first load ─────────────────
  await test(
    'post-cast action buttons are not rendered before any cast',
    async () => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Toss control must be visible (button text changed from "Cast the hexagram")
        const castBtn = page.locator('button', { hasText: 'Toss the coins' });
        assert.ok(await castBtn.isVisible(), '"Toss the coins" button should be visible on load');

        // "Read this hexagram" must be hidden — not just invisible but genuinely
        // not rendered (hidden attribute honoured). We verify three ways:
        // (a) Playwright's own isHidden() — checks visibility and CSS display
        const readBtn = page.locator('button', { hasText: 'Read this hexagram' });
        assert.ok(await readBtn.isHidden(), '"Read this hexagram" should be hidden before cast');

        // (b) The container div carries the [hidden] attribute
        const castActions = page.locator('.cast-actions');
        const hiddenAttr = await castActions.getAttribute('hidden');
        assert.ok(hiddenAttr !== null, '.cast-actions should have [hidden] attribute before cast');

        // (c) offsetParent === null in real DOM — confirms it is genuinely not
        //     in the rendered tree, not merely visually obscured. This is the
        //     check that would have caught the `display: flex` overriding
        //     `[hidden]` bug that reached the project owner.
        const noOffsetParent = await castActions.evaluate(
          el => el.offsetParent === null
        );
        assert.ok(noOffsetParent, '.cast-actions offsetParent should be null (not rendered) before cast');

        // (d) Not in tab order — keyboard users cannot reach a hidden button
        const tabIndex = await readBtn.evaluate(el => {
          // tabIndex is -1 for a naturally hidden element; also verify we
          // cannot focus it programmatically by checking offsetParent on the btn
          return el.closest('[hidden]') !== null;
        });
        assert.ok(tabIndex, '"Read this hexagram" should be inside [hidden] container (not in tab order)');
      } finally {
        await ctx.close();
      }
    }
  );

  // ── Test 2: Bottom-to-top layout verified by real geometry ─────────
  await test(
    'after a cast, position-1 (bottom) line has greater Y than position-6 (top) line',
    async () => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Six discrete throws — one per line, bottom to top.
        for (let i = 0; i < 6; i++) {
          await page.click('button:text("Toss the coins")');
          // Each throw has a coin-spin + stroke-lay ceremony (~1830ms total).
          await page.waitForTimeout(2100); // busy clears after full ceremony: 780+150+130+900=1960ms
        }

        // Wait for ceremony to finish — "Read this hexagram" becoming visible
        // is the definitive signal (set only in completeCast()).
        await page.waitForSelector('button:text("Read this hexagram")', {
          state: 'visible',
          timeout: CAST_TIMEOUT,
        });

        // All six line rows must be present
        const lineRows = page.locator('[role="img"][aria-label*="Line "]');
        const count = await lineRows.count();
        assert.equal(count, 6, `Expected 6 line rows, got ${count}`);

        // Bottom line: aria-label contains "(bottom)" — position 1
        const bottomLine = page.locator('[role="img"][aria-label*="(bottom)"]');
        // Top line: aria-label contains "(top)" — position 6
        const topLine = page.locator('[role="img"][aria-label*="(top)"]');

        const bottomBox = await bottomLine.boundingBox();
        const topBox    = await topLine.boundingBox();

        assert.ok(bottomBox !== null, 'Could not get bounding box for bottom line (position 1)');
        assert.ok(topBox    !== null, 'Could not get bounding box for top line (position 6)');

        // Y increases downward in screen coordinates.
        // "Bottom" visually means GREATER Y.
        assert.ok(
          bottomBox.y > topBox.y,
          `Bottom line (pos 1) Y=${bottomBox.y.toFixed(1)} should be > top line (pos 6) Y=${topBox.y.toFixed(1)}`
        );
      } finally {
        await ctx.close();
      }
    }
  );

  // ── Test 3: Full cast-and-read — zero errors, zero external requests ─
  await test(
    'full cast-and-read run produces zero console errors and zero external network requests',
    async () => {
      const consoleErrors = [];
      const externalRequests = [];

      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      try {
        // Intercept all requests — any external request is a policy violation
        page.on('request', req => {
          const url = req.url();
          // Allow requests to the local dev server only
          if (!url.startsWith(BASE_URL) && !url.startsWith('data:') && !url.startsWith('blob:')) {
            externalRequests.push(url);
          }
        });

        // Capture JS console errors (type 'error')
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        // Capture unhandled page errors
        page.on('pageerror', err => {
          consoleErrors.push(`[pageerror] ${err.message}`);
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Six discrete throws — one per line.
        for (let i = 0; i < 6; i++) {
          await page.click('button:text("Toss the coins")');
          await page.waitForTimeout(2100); // busy clears after full ceremony: 780+150+130+900=1960ms
        }

        await page.waitForSelector('button:text("Read this hexagram")', {
          state: 'visible',
          timeout: CAST_TIMEOUT,
        });
        await page.click('button:text("Read this hexagram")');
        // Wait for the reading section to load
        await page.waitForSelector('#primary-heading', {
          state: 'visible',
          timeout: 5000,
        });
        // Brief wait for any async work to settle
        await page.waitForTimeout(500);

        if (externalRequests.length > 0) {
          assert.fail(
            `External network request(s) detected — product guarantee violated:\n  ${externalRequests.join('\n  ')}`
          );
        }

        if (consoleErrors.length > 0) {
          assert.fail(
            `Console error(s) detected:\n  ${consoleErrors.join('\n  ')}`
          );
        }
      } finally {
        await ctx.close();
      }
    }
  );
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  await checkServer();

  console.log('\nI Ching Oracle — Visual Smoke Test\n');

  const browser = await chromium.launch({ headless: true });
  try {
    await runTests(browser);
  } finally {
    await browser.close();
  }

  console.log(`\n── Results ──────────────────────────────────────────────`);
  console.log(`  Passed: ${passed}  Failed: ${failed}`);

  if (failures.length > 0) {
    console.error('\nFailures:');
    for (const f of failures) {
      console.error(`  ✗ ${f.name}`);
      console.error(`      ${f.message}`);
    }
    process.exit(1);
  } else {
    console.log('  All visual smoke tests passed.\n');
  }
}

main().catch(err => {
  console.error('\n✗ Visual smoke runner crashed:', err.message);
  process.exit(1);
});
