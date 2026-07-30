import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

export const DEFAULT_SITE_URL = 'https://morsh.github.io/i-ching/';
const SITE_NAME = 'I Ching Oracle';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..');
const DIST_DIR = path.join(APP_ROOT, 'dist');
const SEO_COPY_PATH = path.join(REPO_ROOT, '.squad', 'seo-copy.md');

function isMainModule() {
  return process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
}

function trimSiteUrl(siteUrl) {
  return siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
}

function canonicalUrl(siteUrl, route = '') {
  return new URL(route, trimSiteUrl(siteUrl)).href;
}

function relativePrefix(depth) {
  return depth === 0 ? './' : `${'../'.repeat(depth)}`;
}

function pageReference(value, depth) {
  if (/^(?:https?:|mailto:|tel:|#)/.test(value)) {
    return value;
  }
  if (value.startsWith('/')) {
    return value;
  }
  const bare = value.startsWith('./') ? value.slice(2) : value;
  return `${relativePrefix(depth)}${bare}`;
}

function rewriteAssetReferences(html, depth) {
  return html.replace(/\b(src|href)="([^"]+)"/g, (match, attr, value) => {
    if (/^(?:https?:|mailto:|tel:|#)/.test(value)) {
      return match;
    }
    if (value.startsWith('/')) {
      return `${attr}="${pageReference(value.slice(1), depth)}"`;
    }
    return `${attr}="${pageReference(value, depth)}"`;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('\n', ' ');
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function safeJsonLd(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function normalizeDescription(value) {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 220);
}

function stripMarkdownEmphasis(value) {
  return value.replace(/\*\*/g, '').trim();
}

function extractSection(markdown, startHeading, nextHeadingPattern = /^##\s/m) {
  const start = markdown.indexOf(startHeading);
  if (start === -1) {
    return '';
  }
  const bodyStart = start + startHeading.length;
  const rest = markdown.slice(bodyStart);
  const match = rest.match(nextHeadingPattern);
  return (match ? rest.slice(0, match.index) : rest).trim();
}

function parseSeoCopy(markdown = '') {
  const getSimple = (heading) => {
    const section = extractSection(markdown, heading);
    return stripMarkdownEmphasis(section.split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#')) ?? '');
  };

  const landing = extractSection(markdown, '## 4. Static landing-page content');
  const paragraphs = landing
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    title: getSimple('## 1. Page title') || 'I Ching Oracle: Cast Coins for a Hexagram Reading',
    description:
      getSimple('## 2. Meta description') ||
      'Ask a question, cast a traditional three-coin I Ching hexagram line by line, and read a private, reflective guide.',
    ogTitle:
      (markdown.match(/\*\*og:title:\*\*\s*(.+)/)?.[1] ?? '').trim() ||
      'I Ching Oracle: Cast a Hexagram with Three Coins',
    ogDescription:
      (markdown.match(/\*\*og:description:\*\*\s*(.+)/)?.[1] ?? '').trim() ||
      'Ask a question, cast six I Ching lines from the bottom up, and read a reflective hexagram interpretation.',
    twitterTitle:
      (markdown.match(/\*\*twitter:title:\*\*\s*(.+)/)?.[1] ?? '').trim() ||
      'I Ching Oracle: Cast a Hexagram with Three Coins',
    twitterDescription:
      (markdown.match(/\*\*twitter:description:\*\*\s*(.+)/)?.[1] ?? '').trim() ||
      'Cast the I Ching online using the traditional three-coin method, then read the primary hexagram and transformation.',
    landingParagraphs: paragraphs.filter((part) => !part.startsWith('###')).map(stripMarkdownEmphasis),
  };
}

function extractBuiltAssetTags(shellHtml, includeScripts) {
  const head = shellHtml.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const linkTags = head.match(/<link\b[^>]*>/gi) ?? [];
  const scriptTags = includeScripts ? head.match(/<script\b[\s\S]*?<\/script>/gi) ?? [] : [];
  return [...linkTags, ...scriptTags].filter((tag) => {
    if (!includeScripts && /rel=["']modulepreload["']/i.test(tag)) {
      return false;
    }
    return /(?:href|src)=["'](?:\.?\/)?(?:assets|favicon|apple-touch-icon|site\.webmanifest)/i.test(tag);
  });
}

function renderHead({
  title,
  description,
  canonical,
  ogType,
  depth,
  shell,
  includeScripts,
  jsonLd,
  ogTitle = title,
  ogDescription = description,
  twitterTitle = ogTitle,
  twitterDescription = ogDescription,
}) {
  const assetTags = extractBuiltAssetTags(shell, includeScripts)
    .map((tag) => rewriteAssetReferences(tag, depth))
    .join('\n    ');

  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="theme-color" content="#12071f" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${escapeAttr(canonical)}" />
    <meta property="og:type" content="${escapeAttr(ogType)}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${escapeAttr(ogTitle)}" />
    <meta property="og:description" content="${escapeAttr(ogDescription)}" />
    <meta property="og:url" content="${escapeAttr(canonical)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeAttr(twitterTitle)}" />
    <meta name="twitter:description" content="${escapeAttr(twitterDescription)}" />
    ${assetTags}
    <script type="application/ld+json">${safeJsonLd(jsonLd)}</script>
  </head>`;
}

function renderLandingStatic(hexagrams, seoCopy) {
  const paragraphs = seoCopy.landingParagraphs.length > 0
    ? seoCopy.landingParagraphs
    : [
        'The I Ching, or Book of Changes, is an old Chinese text used for reflection on change.',
        '<!-- SEO_COPY: landing intro -->',
      ];

  const [reflection = '', coins = '', bottomUp = '', reading = '', privacy = ''] = paragraphs;
  const links = hexagrams.map((hexagram) => {
    const href = `./hexagram/${hexagram.number}/`;
    return `<li><a href="${href}">Hexagram ${hexagram.number}: ${escapeHtml(hexagram.nameEn)} — ${escapeHtml(hexagram.nameZh)} ${escapeHtml(hexagram.namePinyin)}</a></li>`;
  }).join('\n          ');

  return `<main id="app">
      <article class="seo-landing" aria-labelledby="landing-title">
        <header class="seo-landing__hero">
          <p class="hexagram-number">Three coins · Six lines · Private by design</p>
          <h1 id="landing-title">I Ching Oracle</h1>
        </header>

        <section id="oracle-app" class="oracle-mount" aria-label="Interactive I Ching coin oracle"></section>

        <section class="seo-section" aria-labelledby="coin-method-title">
          <h2 id="coin-method-title">Cast a hexagram with the three-coin method</h2>
          <p>${escapeHtml(coins)}</p>
          <p>${escapeHtml(bottomUp)}</p>
        </section>

        <section class="seo-section" aria-labelledby="read-result-title">
          <h2 id="read-result-title">How to read your I Ching result</h2>
          <p>${escapeHtml(reading)}</p>
        </section>

        <section class="seo-section" aria-labelledby="reflection-title">
          <h2 id="reflection-title">A reflective tool, not a prediction</h2>
          <p>${escapeHtml(reflection)}</p>
        </section>

        <section class="seo-section" aria-labelledby="privacy-title">
          <h2 id="privacy-title">Privacy while you cast</h2>
          <p>${escapeHtml(privacy)}</p>
        </section>

        <nav class="seo-section" aria-label="I Ching hexagram meanings">
          <ol class="hexagram-index">
          ${links}
          </ol>
        </nav>
      </article>
    </main>`;
}

function hexagramTitle(hexagram) {
  const longTitle = `Hexagram ${hexagram.number}: ${hexagram.nameEn} (${hexagram.nameZh}) | I Ching`;
  return longTitle.length > 62 ? `I Ching Hexagram ${hexagram.number}: ${hexagram.nameEn}` : longTitle;
}

function hexagramDescription(hexagram) {
  return normalizeDescription(
    `Read I Ching Hexagram ${hexagram.number}, ${hexagram.nameEn} (${hexagram.nameZh}, ${hexagram.namePinyin}): judgment, image, ${hexagram.trigrams.lower.name} below ${hexagram.trigrams.upper.name} above, and all six line texts for reflection.`
  );
}

function renderHexagramPage(hexagram) {
  const lineItems = hexagram.lines.map((line, index) => {
    const position = index + 1;
    const label = position === 1 ? 'Line 1 — bottom line' : position === 6 ? 'Line 6 — top line' : `Line ${position}`;
    return `<section class="hexagram-line">
          <h3>${label}</h3>
          <p>${escapeHtml(line)}</p>
        </section>`;
  }).join('\n        ');

  return `<main id="app">
      <article class="hexagram-article" aria-labelledby="hexagram-title">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="../../">I Ching Oracle</a>
          <span aria-hidden="true">/</span>
          <span>Hexagram ${hexagram.number}</span>
        </nav>

        <header class="hexagram-identity">
          <span class="hexagram-bignum" aria-hidden="true">${hexagram.number}</span>
          <span class="hexagram-zh" aria-hidden="true">${escapeHtml(hexagram.nameZh)}</span>
          <h1 id="hexagram-title">Hexagram ${hexagram.number}: ${escapeHtml(hexagram.nameEn)} — ${escapeHtml(hexagram.nameZh)} ${escapeHtml(hexagram.namePinyin)}</h1>
          <p class="hexagram-trigrams">${escapeHtml(hexagram.trigrams.lower.name)} below · ${escapeHtml(hexagram.trigrams.upper.name)} above · binary ${escapeHtml(hexagram.binary)}</p>
        </header>

        <section class="seo-section" aria-labelledby="meaning-title">
          <h2 id="meaning-title">What Hexagram ${hexagram.number} means</h2>
          <p>Hexagram ${hexagram.number}, ${escapeHtml(hexagram.nameEn)}, combines ${escapeHtml(hexagram.trigrams.lower.name)} below with ${escapeHtml(hexagram.trigrams.upper.name)} above. Its Judgment centers on: ${escapeHtml(hexagram.judgment)}</p>
        </section>

        <section class="seo-section" aria-labelledby="judgment-title">
          <h2 id="judgment-title">The Judgment</h2>
          <p class="judgment-text">${escapeHtml(hexagram.judgment)}</p>
        </section>

        <section class="seo-section" aria-labelledby="image-title">
          <h2 id="image-title">The Image</h2>
          <p class="image-text">${escapeHtml(hexagram.image)}</p>
        </section>

        <section class="seo-section" aria-labelledby="trigrams-title">
          <h2 id="trigrams-title">Trigrams: ${escapeHtml(hexagram.trigrams.lower.name)} below, ${escapeHtml(hexagram.trigrams.upper.name)} above</h2>
          <p>The lower trigram is ${escapeHtml(hexagram.trigrams.lower.name)} (${escapeHtml(hexagram.trigrams.lower.binary)}). The upper trigram is ${escapeHtml(hexagram.trigrams.upper.name)} (${escapeHtml(hexagram.trigrams.upper.binary)}).</p>
        </section>

        <section class="seo-section" aria-labelledby="lines-title">
          <h2 id="lines-title">The six lines of Hexagram ${hexagram.number}</h2>
          ${lineItems}
        </section>

        <section class="seo-section" aria-labelledby="changing-title">
          <h2 id="changing-title">When this hexagram has changing lines</h2>
          <p>Changing lines in ${escapeHtml(hexagram.nameEn)} should be read with the character of this hexagram in mind: ${escapeHtml(hexagram.image)} The six line texts above give the specific points of change, from the bottom line upward.</p>
        </section>

        <section class="seo-section" aria-labelledby="cast-title">
          <h2 id="cast-title">Cast another I Ching reading</h2>
          <p><a class="btn btn--primary" href="../../">Return to the oracle and cast a new reading</a></p>
        </section>
      </article>
    </main>`;
}

function renderDocument({
  shell,
  depth,
  title,
  description,
  canonical,
  ogType,
  includeScripts,
  jsonLd,
  body,
  ogTitle,
  ogDescription,
  twitterTitle,
  twitterDescription,
}) {
  const head = renderHead({
    title,
    description,
    canonical,
    ogType,
    depth,
    shell,
    includeScripts,
    jsonLd,
    ogTitle,
    ogDescription,
    twitterTitle,
    twitterDescription,
  });
  return `<!doctype html>
<html lang="en">
  ${head}
  <body>
    ${body}
  </body>
</html>
`;
}

function landingJsonLd(hexagrams, siteUrl) {
  const url = canonicalUrl(siteUrl);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url,
      inLanguage: 'en',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'I Ching hexagrams',
      itemListElement: hexagrams.map((hexagram, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: canonicalUrl(siteUrl, `hexagram/${hexagram.number}/`),
        name: `Hexagram ${hexagram.number}: ${hexagram.nameEn}`,
      })),
    },
  ];
}

function hexagramJsonLd(hexagram, siteUrl) {
  const url = canonicalUrl(siteUrl, `hexagram/${hexagram.number}/`);
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    headline: `Hexagram ${hexagram.number}: ${hexagram.nameEn} — ${hexagram.nameZh} ${hexagram.namePinyin}`,
    description: hexagramDescription(hexagram),
    url,
    inLanguage: 'en',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: canonicalUrl(siteUrl),
    },
  };
}

function renderSitemap(hexagrams, siteUrl) {
  const urls = [canonicalUrl(siteUrl), ...hexagrams.map((hexagram) => canonicalUrl(siteUrl, `hexagram/${hexagram.number}/`))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}
</urlset>
`;
}

function renderRobots() {
  return `User-agent: *
Allow: /i-ching/
`;
}

export function renderAll({ shell, hexagrams, seoCopyMarkdown = '', siteUrl = DEFAULT_SITE_URL }) {
  const sortedHexagrams = [...hexagrams].sort((a, b) => a.number - b.number);
  const seoCopy = parseSeoCopy(seoCopyMarkdown);
  const pages = new Map();
  const landingDescription = normalizeDescription(seoCopy.description);

  pages.set('index.html', renderDocument({
    shell,
    depth: 0,
    title: seoCopy.title,
    description: landingDescription,
    canonical: canonicalUrl(siteUrl),
    ogType: 'website',
    includeScripts: true,
    jsonLd: landingJsonLd(sortedHexagrams, siteUrl),
    body: renderLandingStatic(sortedHexagrams, seoCopy),
    ogTitle: seoCopy.ogTitle,
    ogDescription: seoCopy.ogDescription,
    twitterTitle: seoCopy.twitterTitle,
    twitterDescription: seoCopy.twitterDescription,
  }));

  for (const hexagram of sortedHexagrams) {
    pages.set(`hexagram/${hexagram.number}/index.html`, renderDocument({
      shell,
      depth: 2,
      title: hexagramTitle(hexagram),
      description: hexagramDescription(hexagram),
      canonical: canonicalUrl(siteUrl, `hexagram/${hexagram.number}/`),
      ogType: 'article',
      includeScripts: false,
      jsonLd: hexagramJsonLd(hexagram, siteUrl),
      body: renderHexagramPage(hexagram),
    }));
  }

  pages.set('sitemap.xml', renderSitemap(sortedHexagrams, siteUrl));
  pages.set('robots.txt', renderRobots());
  return pages;
}

async function loadHexagrams() {
  const server = await createServer({
    root: APP_ROOT,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  });
  try {
    const module = await server.ssrLoadModule('/src/data/hexagrams.ts');
    return module.HEXAGRAMS;
  } finally {
    await server.close();
  }
}

async function readSeoCopy() {
  try {
    return await readFile(SEO_COPY_PATH, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

export async function prerender() {
  const shell = await readFile(path.join(DIST_DIR, 'index.html'), 'utf8');
  const [hexagrams, seoCopyMarkdown] = await Promise.all([loadHexagrams(), readSeoCopy()]);
  const pages = renderAll({ shell, hexagrams, seoCopyMarkdown });

  await rm(path.join(DIST_DIR, 'hexagram'), { recursive: true, force: true });
  for (const [relativePath, html] of pages) {
    const outputPath = path.join(DIST_DIR, ...relativePath.split('/'));
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, 'utf8');
  }
}

if (isMainModule()) {
  prerender().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
