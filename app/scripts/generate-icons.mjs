import { chromium } from 'playwright';
import { mkdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const publicDir = join(appRoot, 'public');
const screenshotsDir = join(appRoot, 'screenshots');
const svgPath = join(publicDir, 'favicon.svg');
const svg = readFileSync(svgPath, 'utf8');
const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

mkdirSync(publicDir, { recursive: true });
mkdirSync(screenshotsDir, { recursive: true });

function assertPng(path, label) {
  const bytes = readFileSync(path);
  const minSize = label.includes('16x16') ? 80 : 1000;
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < minSize) {
    throw new Error(`${label} is ${bytes.length} bytes; refusing to keep a corrupt or empty PNG`);
  }
  for (let i = 0; i < pngSignature.length; i++) {
    if (bytes[i] !== pngSignature[i]) throw new Error(`${label} does not have a PNG signature`);
  }
}

async function renderSvgPng(browser, size, file) {
  const context = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;width:${size}px;height:${size}px;background:transparent;}img{display:block;width:${size}px;height:${size}px;}</style></head><body><img alt="" src="${svgDataUrl}"></body></html>`, { waitUntil: 'load' });
  const path = join(publicDir, file);
  await page.locator('img').screenshot({ path });
  await context.close();
  assertPng(path, file);
}

async function renderHandTuned16(browser) {
  const context = await browser.newContext({ viewport: { width: 16, height: 16 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Strong-vibrant optical size: same crisp 日 geometry as the muted shipped
    // 16px icon, recolored only. No gradient or glow at tab size: counters stay open.
    ctx.fillStyle = '#0b0511';
    ctx.fillRect(0, 0, 16, 16);

    ctx.fillStyle = '#ffd2ff';
    ctx.fillRect(3, 2, 10, 2);  // top
    ctx.fillRect(3, 6, 10, 2);  // middle
    ctx.fillRect(3, 12, 10, 2); // bottom
    ctx.fillRect(3, 2, 2, 12);  // left
    ctx.fillRect(11, 2, 2, 12); // right

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.65;
    ctx.fillRect(12, 2, 1, 1);

    return canvas.toDataURL('image/png').split(',')[1];
  });
  await context.close();

  const path = join(publicDir, 'favicon-16x16.png');
  writeFileSync(path, Buffer.from(pngBase64, 'base64'));
  assertPng(path, 'favicon-16x16.png');
}

const browser = await chromium.launch({ headless: true });
try {
  await renderHandTuned16(browser);
  await renderSvgPng(browser, 32, 'favicon-32x32.png');
  await renderSvgPng(browser, 180, 'apple-touch-icon.png');

  const previewContext = await browser.newContext({ viewport: { width: 720, height: 330 }, deviceScaleFactor: 1 });
  const preview = await previewContext.newPage();
  const icon16 = `data:image/png;base64,${readFileSync(join(publicDir, 'favicon-16x16.png')).toString('base64')}`;
  const icon32 = `data:image/png;base64,${readFileSync(join(publicDir, 'favicon-32x32.png')).toString('base64')}`;
  const icon180 = `data:image/png;base64,${readFileSync(join(publicDir, 'apple-touch-icon.png')).toString('base64')}`;
  const baselinePath = join(screenshotsDir, 'icon-candidates', 'current-16.png');
  const baseline16 = existsSync(baselinePath)
    ? `data:image/png;base64,${readFileSync(baselinePath).toString('base64')}`
    : icon16;
  await preview.setContent(`<!doctype html><html><head><style>
    body{margin:0;background:#2a2630;color:#eee;font:12px system-ui,sans-serif;}
    .sheet{display:grid;grid-template-columns:1fr 1fr;gap:0;padding:18px;}
    .panel{min-height:294px;padding:16px;border-radius:14px;box-sizing:border-box;}
    .light{background:#f5f2eb;color:#18131d;}
    .dark{background:#17121d;color:#efe7ff;}
    .row{display:flex;align-items:flex-start;gap:18px;margin-top:18px;}
    .chip{display:flex;flex-direction:column;align-items:center;gap:8px;}
    img{display:block;box-shadow:0 0 0 1px rgba(127,90,180,.22);}
    .s16{width:16px;height:16px}.s32{width:32px;height:32px}.s180{width:180px;height:180px}.zoom{width:128px;height:128px;image-rendering:pixelated;image-rendering:crisp-edges;}
  </style></head><body><div class="sheet">
    <section class="panel light"><strong>Light browser chrome</strong><div class="row"><div class="chip"><img class="s16" src="${icon16}"><span>16 actual</span></div><div class="chip"><img class="s32" src="${icon32}"><span>32</span></div><div class="chip"><img class="zoom" src="${baseline16}"><span>old 16 ×8</span></div><div class="chip"><img class="zoom" src="${icon16}"><span>new 16 ×8</span></div></div><div class="row"><div class="chip"><img class="s180" src="${icon180}"><span>180</span></div></div></section>
    <section class="panel dark"><strong>Dark browser chrome</strong><div class="row"><div class="chip"><img class="s16" src="${icon16}"><span>16 actual</span></div><div class="chip"><img class="s32" src="${icon32}"><span>32</span></div><div class="chip"><img class="zoom" src="${baseline16}"><span>old 16 ×8</span></div><div class="chip"><img class="zoom" src="${icon16}"><span>new 16 ×8</span></div></div><div class="row"><div class="chip"><img class="s180" src="${icon180}"><span>180</span></div></div></section>
  </div></body></html>`, { waitUntil: 'load' });
  const previewPath = join(screenshotsDir, 'site-icon-preview.png');
  await preview.screenshot({ path: previewPath });
  await previewContext.close();
  assertPng(previewPath, 'site-icon-preview.png');

  const svgTime = statSync(svgPath).mtimeMs;
  for (const file of ['favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png']) {
    const pngPath = join(publicDir, file);
    if (statSync(pngPath).mtimeMs <= svgTime) throw new Error(`${file} is not newer than favicon.svg`);
  }
  if (statSync(previewPath).mtimeMs <= svgTime) throw new Error('site-icon-preview.png is not newer than favicon.svg');

  console.log('Generated strong-vibrant hand-tuned favicon-16x16.png');
  console.log('Generated favicon-32x32.png, apple-touch-icon.png from favicon.svg');
  console.log('Generated and validated screenshots/site-icon-preview.png');
} finally {
  await browser.close();
}
