import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface ProbeResult {
  pageCount: number;
  sitemapUrlCount: number;
  sitemapWellFormed: boolean;
  hex23HasNestedAssets: boolean;
  hex23HasRootRelativeRefs: boolean;
  allPagesHaveOwnCorpus: boolean;
  hasTemplatePlaceholder: boolean;
}

function runPrerenderProbe(): ProbeResult {
  const code = String.raw`
    import { createServer } from 'vite';
    import { renderAll } from './scripts/prerender.mjs';

    const shell = '<!doctype html><html lang="en"><head><link rel="icon" href="./favicon.svg"><script type="module" crossorigin src="./assets/index-test.js"></script><link rel="stylesheet" crossorigin href="./assets/index-test.css"></head><body><main id="app"></main></body></html>';
    const server = await createServer({ root: process.cwd(), appType: 'custom', logLevel: 'error', server: { middlewareMode: true } });
    try {
      const { HEXAGRAMS } = await server.ssrLoadModule('/src/data/hexagrams.ts');
      const pages = renderAll({ shell, hexagrams: HEXAGRAMS, seoCopyMarkdown: '' });
      const hex23 = pages.get('hexagram/23/index.html');
      const sitemap = pages.get('sitemap.xml');
      const escapeHtml = (value) => String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
      const allPagesHaveOwnCorpus = HEXAGRAMS.every((hexagram) => {
        const page = pages.get('hexagram/' + hexagram.number + '/index.html') || '';
        return page.includes('Hexagram ' + hexagram.number + ': ' + escapeHtml(hexagram.nameEn)) &&
          page.includes(escapeHtml(hexagram.nameZh)) &&
          page.includes(escapeHtml(hexagram.namePinyin)) &&
          page.includes(escapeHtml(hexagram.trigrams.lower.name) + ' below') &&
          page.includes(escapeHtml(hexagram.trigrams.upper.name) + ' above') &&
          page.includes(escapeHtml(hexagram.judgment)) &&
          page.includes(escapeHtml(hexagram.image)) &&
          hexagram.lines.every((line) => page.includes(escapeHtml(line)));
      });
      const result = {
        pageCount: [...pages.keys()].filter((name) => /^hexagram\/\d+\/index\.html$/.test(name)).length,
        sitemapUrlCount: [...sitemap.matchAll(/<loc>/g)].length,
        sitemapWellFormed: /^<\?xml[\s\S]*<urlset[\s\S]*<\/urlset>\s*$/.test(sitemap),
        hex23HasNestedAssets: hex23.includes('../../assets/index-test.css'),
        hex23HasRootRelativeRefs: /(?:src|href)="\/(?!\/)/.test(hex23),
        allPagesHaveOwnCorpus,
        hasTemplatePlaceholder: [...pages.values()].some((page) => /\{(?:number|name|chineseName|translation|pinyin|lowerTrigram|upperTrigram)\}/.test(page)),
      };
      console.log(JSON.stringify(result));
    } finally {
      await server.close();
    }
  `;

  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: APP_ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })) as ProbeResult;
}

describe('SEO prerender generator', () => {
  const result = runPrerenderProbe();

  it('emits all 64 hexagram pages with distinct corpus text', () => {
    expect(result.pageCount).toBe(64);
    expect(result.allPagesHaveOwnCorpus).toBe(true);
  });

  it('uses depth-aware nested asset paths and no root-relative references on hexagram pages', () => {
    expect(result.hex23HasNestedAssets).toBe(true);
    expect(result.hex23HasRootRelativeRefs).toBe(false);
  });

  it('emits a well-formed sitemap with the landing page plus 64 hexagram URLs', () => {
    expect(result.sitemapWellFormed).toBe(true);
    expect(result.sitemapUrlCount).toBe(65);
  });

  it('replaces Seraph template placeholders in generated HTML', () => {
    expect(result.hasTemplatePlaceholder).toBe(false);
  });
});
