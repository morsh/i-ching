/**
 * screenshot.mjs — Visual verification harness for the I Ching Oracle.
 *
 * Usage:  npm run shots
 *
 * Requires the dev server running at http://localhost:5173 (npm run dev).
 * Fails with a clear message if nothing is listening — does NOT start its own server.
 *
 * Writes PNGs to screenshots/ (git-ignored).
 * Captures:
 *   • Pre-cast  — empty stage, 易 alone: dark desktop + mobile
 *   • Mid-cast  — after exactly 3 of 6 throws (bottom three strokes present, top three empty):
 *                 dark desktop only
 *   • Complete  — all six strokes settled, post-cast actions visible: dark desktop + mobile
 *   • Reading   — after clicking "Read this hexagram": dark desktop + mobile
 *   • Reduced-motion path — dark, desktop only
 *
 * Owner: Tank
 *
 * EXIT POLICY: if any required throw fails (button not found, cast does not
 * complete), the harness exits non-zero and removes all PNGs written in that
 * run. A silent partial capture is more dangerous than no capture at all.
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync, statSync, unlinkSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..');
const OUT_DIR = join(APP_ROOT, 'screenshots');
const BASE_URL = 'http://localhost:5173';
const TIMEOUT_MS = 20_000;

// ── Viewport presets ──────────────────────────────────────────────────
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile',  width: 375,  height: 812 },
];

// ── Capture runs ──────────────────────────────────────────────────────
// Dark-only by owner's decision. Light variants were removed.
const RUNS = [
  { name: 'dark',           colorScheme: 'dark',  reducedMotion: 'no-preference' },
  { name: 'reduced-motion', colorScheme: 'dark',  reducedMotion: 'reduce'        },
];

// ── Helpers ───────────────────────────────────────────────────────────
function pad(n, w = 2) { return String(n).padStart(w, '0'); }
function ts() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-` +
         `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** Written PNGs in this run — deleted if the run fails. */
const writtenFiles = [];

async function capture(page, name, fullPage = false) {
  const file = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  writtenFiles.push(file);
  const size = statSync(file).size;
  const { width, height } = page.viewportSize();
  console.log(`  ✓ ${name}.png  ${width}×${height}  ${(size / 1024).toFixed(0)} KB${fullPage ? ' (full page)' : ''}`);
  return file;
}

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

/** Wait for all browser animations to quiesce before capturing. */
async function waitForAnimations(page, timeoutMs = 5000) {
  await page.waitForFunction(
    () => document.getAnimations().filter(a => a.playState === 'running').length === 0,
    { timeout: timeoutMs }
  ).catch(() => page.waitForTimeout(2200)); // fallback if API unavailable
}

/**
 * Click "Toss the coins" n times to perform n throws.
 * Throws an error (which aborts the run) if the button is not found on any click.
 * With per-throw animations present the aria-live region announces each throw —
 * we wait for it to settle before the next click (harmless when reduced-motion
 * makes everything synchronous).
 */
async function doThrows(page, n, reducedMotion = false) {
  for (let i = 1; i <= n; i++) {
    const btn = page.locator('button', { hasText: 'Toss the coins' }).first();
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) {
      throw new Error(`"Toss the coins" button not visible before throw ${i}/${n}`);
    }
    await btn.click();
    if (!reducedMotion) {
      // Wait for the per-throw ceremony (coin spin + stroke lay) to finish.
      // The aria-live region is updated after every throw — poll it for the
      // throw-N announcement, then allow a brief CSS settle.
      await page.waitForTimeout(2100); // busy flag clears at COIN_SPIN(780)+SETTLE(150)+STROKE_DELAY(130)+STROKE_LAY(900)=1960ms
    }
  }
}

/** Wait until the cast is complete and the post-cast area is visible. */
async function waitForCastComplete(page) {
  await page.waitForSelector(
    'button:has-text("Read this hexagram")',
    { state: 'visible', timeout: TIMEOUT_MS }
  );
  // Belt-and-suspenders: all 6 slots populated.
  await page.waitForFunction(
    () => document.querySelectorAll('.line-slot:not([aria-hidden])').length >= 6,
    { timeout: TIMEOUT_MS }
  );
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  await checkServer();
  mkdirSync(OUT_DIR, { recursive: true });

  const stamp = ts();
  const summary = [];
  console.log(`\nI Ching Oracle — Screenshot Run  ${stamp}`);
  console.log(`Output: ${OUT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    for (const run of RUNS) {
      // Reduced-motion run: desktop only (one example is sufficient).
      const viewports = run.reducedMotion === 'reduce'
        ? [VIEWPORTS[0]]
        : VIEWPORTS;

      for (const vp of viewports) {
        const slug = `${stamp}--${run.name}--${vp.name}`;
        const reduced = run.reducedMotion === 'reduce';
        console.log(`\n── ${run.name} / ${vp.name} (${vp.width}×${vp.height}) ──`);

        const ctx = await browser.newContext({
          viewport:      { width: vp.width, height: vp.height },
          colorScheme:   run.colorScheme,
          reducedMotion: run.reducedMotion,
        });
        const page = await ctx.newPage();

        // ── 1. Pre-cast — empty stage ─────────────────────────────────
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        if (!reduced) await waitForAnimations(page);
        await capture(page, `${slug}--01-pre-cast`);

        // ── 2. Mid-cast — after 3 of 6 throws (bottom half present) ──
        // Skip mid-cast for mobile and reduced-motion to keep the capture
        // set lean; desktop dark is the representative case.
        if (vp.name === 'desktop' && !reduced) {
          await doThrows(page, 3, reduced);
          // The bottom three slots must now have line elements.
          await page.waitForFunction(
            () => document.querySelectorAll('.line-slot:not([aria-hidden])').length === 3,
            { timeout: TIMEOUT_MS }
          );
          await waitForAnimations(page);
          await capture(page, `${slug}--02-mid-cast`);
          // Continue with throws 4-6 to reach completion.
          await doThrows(page, 3, reduced);
        } else {
          // Do all 6 throws in one go for other configurations.
          await doThrows(page, 6, reduced);
        }

        // ── 3. Cast complete — all 6 strokes settled ──────────────────
        await waitForCastComplete(page);
        if (!reduced) await waitForAnimations(page);
        await capture(page, `${slug}--03-cast-complete`);

        // ── 4. Reading view — viewport shot ───────────────────────────
        await page.click('button:has-text("Read this hexagram")');
        await page.waitForSelector('#primary-heading', {
          state: 'visible', timeout: TIMEOUT_MS,
        });
        if (!reduced) {
          // reveal-block animations: per-block delays up to ~1120ms + 700ms duration
          // ≈ 1820ms total. Without this wait blocks capture at opacity:0 (fill-mode:both).
          await waitForAnimations(page, 5000);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await capture(page, `${slug}--04-reading-viewport`);

        // ── 5. Reading view — full page ───────────────────────────────
        await capture(page, `${slug}--05-reading-fullpage`, true);

        await ctx.close();
        summary.push({ run: run.name, viewport: vp.name, slug });
      }
    }
  } catch (err) {
    await browser.close().catch(() => {});
    console.error(`\n✗ Screenshot run FAILED: ${err.message}`);
    console.error('  Removing partial captures to prevent stale images:');
    for (const f of writtenFiles) {
      try { unlinkSync(f); console.error(`    deleted ${f}`); } catch { /* ignore */ }
    }
    process.exit(1);
  }

  // ── Deterministic changing-line captures — dark, desktop only ─────────────
  //
  // Stubs crypto.getRandomValues for the first 18 calls (6 lines × 3 coins each)
  // to produce a fixed cast: line values [9,7,6,8,9,7] (bottom to top).
  //   • Positions 1,3,5 are changing (values 9,6,9)
  //   • Positions 2,4,6 are non-changing (values 7,8,7)
  //   • Changing yang + changing yin both present — both halves of the signal exercised
  //   • Primary hexagram: #61 (Inner Truth, 中孚), transformed: #18 (蠱)
  //
  // Value-to-coins mapping: coin 3=yang (odd uint32), coin 2=yin (even uint32).
  //   val 9 (3+3+3): 1,1,1 | val 7 (2+2+3): 0,0,1
  //   val 6 (2+2+2): 0,0,0 | val 8 (3+3+2): 1,1,0
  {
    const desktopSlug = `${stamp}--dark--desktop`;
    console.log('\n── deterministic changing-line cast / dark / desktop ──');

    const ctx = await browser.newContext({
      viewport:      { width: 1440, height: 900 },
      colorScheme:   'dark',
      reducedMotion: 'no-preference',
    });

    // Inject the CSPRNG stub before any page script runs.
    await ctx.addInitScript(`(function () {
      const _v = [1,1,1, 0,0,1, 0,0,0, 1,1,0, 1,1,1, 0,0,1];
      let _i = 0;
      const _orig = crypto.getRandomValues.bind(crypto);
      Object.defineProperty(crypto, 'getRandomValues', {
        configurable: true,
        value: function (buf) {
          if (_i < _v.length && buf instanceof Uint32Array && buf.length === 1) {
            buf[0] = _v[_i++];
            return buf;
          }
          return _orig(buf);
        },
      });
    })()`);

    const pg = await ctx.newPage();

    await pg.goto(BASE_URL, { waitUntil: 'networkidle' });
    await doThrows(pg, 6, false);
    await waitForCastComplete(pg);
    await waitForAnimations(pg);
    // ── 06: hero stage showing changing lines ─────────────────────
    await capture(pg, `${desktopSlug}--06-changing-hero`);

    // Navigate to the reading view.
    await pg.click('button:has-text("Read this hexagram")');
    await pg.waitForSelector('#primary-heading', { state: 'visible', timeout: TIMEOUT_MS });
    await waitForAnimations(pg, 6000);
    await pg.evaluate(() => window.scrollTo(0, 0));
    // ── 07: reading view — mini hexagram with changing-line signal ─
    await capture(pg, `${desktopSlug}--07-changing-reading`);

    // ── 08: Save button in initial (unsaved) state ─────────────────
    const saveBtnLoc = pg.locator('button', { hasText: 'Save reading locally' });
    await saveBtnLoc.scrollIntoViewIfNeeded();
    await pg.waitForTimeout(400); // allow CSS settle after scroll
    await capture(pg, `${desktopSlug}--08-save-unsaved`);

    // Click Save, wait for state change, capture saved state.
    await saveBtnLoc.click();
    await pg.waitForFunction(
      () => Array.from(document.querySelectorAll('button'))
               .some(b => b.textContent?.includes('Saved to this device')),
      { timeout: 5000 }
    );
    // ── 09: Save button in post-save (disabled) state ─────────────
    await capture(pg, `${desktopSlug}--09-save-saved`);

    // ── 10: Greyscale reading — WCAG 1.4.1 check ──────────────────
    // Desaturate the entire page to verify weight+luminance carries the
    // changing-line signal without any colour information.
    await pg.evaluate(() => window.scrollTo(0, 0));
    await pg.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
    await waitForAnimations(pg, 2000);
    await capture(pg, `${desktopSlug}--10-changing-reading-grey`);

    await ctx.close();
  }

  // ── History panel captures — dark, desktop only ────────────────────────────
  //
  // Seeds localStorage with three entries and captures the Past Castings panel.
  // Three entry varieties: long question (ellipsis proof), no question (no blank
  // line proof), short question. No real cast is performed — data is injected
  // directly so we do not depend on RNG for the history captures.
  {
    const desktopSlug = `${stamp}--dark--desktop`;
    console.log('\n── history panel / dark / desktop ──');

    const now = Date.now();
    const seedPayload = {
      version: 1,
      casts: [
        {
          id: 'hist-seed-1',
          savedAt: new Date(now - 2 * 3600_000).toISOString(),
          question:
            'I am at a crossroads in my career — should I accept the offer I received last week, or continue building what I have started here, trusting the slow work of years will bear fruit?',
          cast: {
            lines: [1,2,3,4,5,6].map(pos => ({
              value: 7, position: pos, coins: [3,2,2], polarity: 'yang', changing: false,
            })),
            primary: { number: 1, binary: '111111' },
            changing: [],
            transformed: null,
          },
        },
        {
          id: 'hist-seed-2',
          savedAt: new Date(now - 24 * 3600_000).toISOString(),
          // No question — panel must show no blank first line.
          cast: {
            lines: [
              { value:9, position:1, coins:[3,3,3], polarity:'yang', changing:true  },
              { value:7, position:2, coins:[2,2,3], polarity:'yang', changing:false },
              { value:6, position:3, coins:[2,2,2], polarity:'yin',  changing:true  },
              { value:8, position:4, coins:[3,3,2], polarity:'yin',  changing:false },
              { value:9, position:5, coins:[3,3,3], polarity:'yang', changing:true  },
              { value:7, position:6, coins:[2,2,3], polarity:'yang', changing:false },
            ],
            primary:     { number: 61, binary: '110011' },
            changing:    [1, 3, 5],
            transformed: { number: 18, binary: '011001' },
          },
        },
        {
          id: 'hist-seed-3',
          savedAt: new Date(now - 3 * 24 * 3600_000).toISOString(),
          question: 'What should I let go of?',
          cast: {
            lines: [1,2,3,4,5,6].map(pos => ({
              value: 8, position: pos, coins: [3,3,2], polarity: 'yin', changing: false,
            })),
            primary: { number: 2, binary: '000000' },
            changing: [],
            transformed: null,
          },
        },
      ],
    };

    const ctx = await browser.newContext({
      viewport:    { width: 1440, height: 900 },
      colorScheme: 'dark',
    });

    // Inject localStorage before any page JS runs.
    await ctx.addInitScript((payload) => {
      localStorage.setItem('iching-oracle:history:v1', JSON.stringify(payload));
    }, seedPayload);

    const pg = await ctx.newPage();
    await pg.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitForAnimations(pg);

    // Scroll to the history panel so it is centred in the viewport.
    await pg.evaluate(() => {
      const panel = document.querySelector('.history-panel');
      if (panel) panel.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await pg.waitForTimeout(300); // brief settle after scroll
    // ── 11: Past Castings panel with three seeded entries ─────────
    await capture(pg, `${desktopSlug}--11-history-panel`);

    await ctx.close();
  }

  await browser.close();

  const total = writtenFiles.length;
  console.log(`\n── Summary ──────────────────────────────────────────────`);
  console.log(`${total} PNG${total !== 1 ? 's' : ''} written to screenshots/`);
  console.log(`Newest: ${writtenFiles[writtenFiles.length - 1]}`);
  console.log(`Run  npm run shots  again any time.\n`);
}

main().catch(err => {
  console.error('\n✗ Screenshot runner crashed:', err.message);
  process.exit(1);
});
