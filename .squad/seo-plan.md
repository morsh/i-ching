# SEO architecture plan

## Competitive ceiling — put this first

The realistic ceiling is not “rank #1 for I Ching” soon. That head term is high-competition, old, and authority-heavy; a `github.io` project site starts with effectively no domain authority. The achievable win is long-tail visibility over months: searches like “hexagram 23 meaning”, “I Ching 23 Splitting Apart”, “hexagram 1 Qian”, and related interpretive queries. A custom domain is worth recommending before serious SEO work is indexed: it will not magically rank, but it gives the project a permanent identity, avoids building equity on a platform subdomain, and makes future migration less painful.

Verified central problem: the deployed HTML is only about 867 bytes and contains `<main id="app"></main>` with the page body built by JavaScript. The local build is 888 bytes with the same empty app shell. The corpus in `app/src/data/hexagrams.ts` contains 64 full entries with Chinese name, pinyin, English name, trigrams, judgment, image, and six line texts, but none of that text is crawlable before interaction. This is the largest SEO issue by far.

## 1. Generate crawlable static pages for the 64 hexagrams

- **What:** Add a build-time prerender step in `app/scripts/prerender.mjs` that runs after `vite build` and emits:
  - `app/dist/index.html` with real static landing-page text and links to all 64 pages.
  - `app/dist/hexagram/1/index.html` through `app/dist/hexagram/64/index.html`.
  - `app/dist/sitemap.xml` listing the landing page and all 64 hexagram URLs.
  Use Vite's programmatic API (`createServer` + `ssrLoadModule('/src/data/hexagrams.ts')`) so the script can load the TypeScript corpus without adding a framework or importing corpus into the engine. Wire it into `app/package.json` as `"build": "tsc --noEmit && vite build && node scripts/prerender.mjs"`. CI already runs `npm ci`, `npm test`, then `npm run build`, so this works in the existing deploy flow.
- **Why it matters for ranking:** Google needs actual text at fetch time. These pages turn the project’s strongest asset, the 64-entry interpretive corpus, from invisible runtime state into indexable documents.
- **Estimated impact:** High.
- **Estimated effort:** Medium. The generator is small, but it must handle paths, metadata, sitemap, and tests carefully.
- **Risk:** The most likely breakage is relative asset paths on nested pages. See item 3; do not change `app/vite.config.ts` `base: './'`.

## 2. Use permanent number-only URLs

- **What:** Canonical URL shape: `https://morsh.github.io/i-ching/hexagram/<number>/`, e.g. `/i-ching/hexagram/23/`. Do not put pinyin or English translations in the path. Page titles and visible headings should carry number, pinyin, Chinese, and English names; the URL should remain stable even if Seraph revises wording or romanisation.
- **Why it matters for ranking:** The pages can still target name-based long-tail demand through titles, headings, body copy, anchors, and sitemap entries. Number-only URLs avoid future duplicate/redirect problems on static hosting.
- **Estimated impact:** Medium.
- **Estimated effort:** Low.
- **Risk:** Slugless URLs are less descriptive in search snippets, but permanence matters more because GitHub Pages gives us no server redirects for renamed slugs.

## 3. Preserve `base: './'` and make nested asset paths depth-aware

- **What:** Keep `app/vite.config.ts` `base: './'`. The prerender script must read the built root shell and rewrite document-level asset references per output depth:
  - Root page: `./assets/...`, `./favicon.svg`, `./site.webmanifest`.
  - Hexagram pages two levels deep: `../../assets/...`, `../../favicon.svg`, `../../site.webmanifest`.
  Do not use `/assets/...` or `/i-ching/assets/...` in generated HTML. The CSS file may keep its internal `url(./font.woff2)` references because those resolve relative to the CSS file in `dist/assets/`, not relative to the HTML page.
- **Why it matters for ranking:** Blank pages from broken asset paths destroy both crawling and user experience. The current `base: './'` is load-bearing because the site is served from `/i-ching/`, not from a domain root.
- **Estimated impact:** High as a correctness requirement.
- **Estimated effort:** Medium.
- **Risk:** Any future modulepreload, image, manifest, or font preload tag must go through the same depth-aware path helper. Add a test that generated `dist/hexagram/23/index.html` contains `../../assets/` and no `src="/` or `href="/` except absolute canonical/social URLs.

## 4. Do not let the SPA erase prerendered content

- **What:** Hexagram pages should be static article pages first. Prefer omitting the main SPA script from hexagram pages entirely and linking to the landing page to cast a reading. If Switch wants progressive enhancement later, add a separate small enhancer that never replaces the article body. For the landing page, refactor bootstrap so the interactive oracle mounts into a dedicated empty child such as `<section id="oracle-app"></section>` while the static landing copy and hexagram index remain in the DOM.
- **Why it matters for ranking:** If prerendered text is immediately replaced by JavaScript, the work is wasted and can look like a mismatch between fetched HTML and rendered content. The static content must remain visible to users and crawlers.
- **Estimated impact:** High.
- **Estimated effort:** Medium.
- **Risk:** Existing UI tests may assume `#app` is the replaced root. Update tests to assert static content persists and the oracle still works.

## 5. Avoid thin-template duplication

- **What:** Each hexagram page must include the unique corpus fields: number, `nameZh`, `namePinyin`, `nameEn`, upper/lower trigrams, judgment, image, all six line texts, and a visible link back to casting. Seraph should add a short unique introductory paragraph for each hexagram if possible, but do not block launch on that if the existing corpus is presented in full. Keep one canonical page per hexagram; do not create separate pages for pinyin, English translation variants, “love”, “career”, or other doorway modifiers.
- **Why it matters for ranking:** Sixty-four pages from one template can be treated as thin if the only difference is a heading. Full, unique corpus text makes them legitimate reference pages rather than doorway pages.
- **Estimated impact:** High.
- **Estimated effort:** Medium for generator; high only if new editorial intros are added.
- **Risk:** Repetitive boilerplate can still dominate if the template is too heavy. Keep shared chrome short and put unique content high on the page.

## 6. Fill required metadata, with Seraph writing final wording

- **What:** Technical tags needed in `app/index.html` and generated pages:
  - `<title>` unique per page.
  - `<meta name="description" content="...">` unique per page.
  - `<link rel="canonical" href="https://morsh.github.io/i-ching/...">` absolute canonical URL.
  - `<meta name="robots" content="index,follow">` unless a page should be excluded.
  - Open Graph: `og:type` (`website` for landing, `article` or `website` for hexagram pages), `og:site_name`, `og:title`, `og:description`, `og:url`.
  - Twitter/X card: `twitter:card` set to `summary`, plus `twitter:title` and `twitter:description`.
  Do not add `meta keywords`.
- **Why it matters for ranking:** Metadata is not the primary ranking lever, but it controls canonical consolidation and search/social snippets.
- **Estimated impact:** Medium.
- **Estimated effort:** Low.
- **Risk:** Duplicate descriptions across 64 pages undercut the long-tail strategy. Generate page-specific descriptions from each hexagram’s own names and corpus fields.

## 7. Add sitemap and project-path robots file

- **What:** Generate `app/dist/sitemap.xml` during prerender. Add or generate `app/dist/robots.txt` with at least:
  - `User-agent: *`
  - `Allow: /i-ching/`
  - `Sitemap: https://morsh.github.io/i-ching/sitemap.xml`
  In source, `robots.txt` can live under `app/public/robots.txt`, but `sitemap.xml` should be generated because it must include all 64 pages. On this project Pages site the served project root is `/i-ching/`, so the desired deployed locations are `https://morsh.github.io/i-ching/robots.txt` and `https://morsh.github.io/i-ching/sitemap.xml`.
- **Why it matters for ranking:** Sitemaps make discovery of all static hexagram pages reliable, especially for a new low-authority site.
- **Estimated impact:** Medium.
- **Estimated effort:** Low.
- **Risk:** A host-root robots file is not controlled by a project Pages repo. Submit the sitemap in Google Search Console; Search Console verification does not require adding a tracking script.

## 8. Use only defensible structured data

- **What:** Add JSON-LD only where it describes visible page content:
  - Landing page: `WebSite` and optionally `ItemList` for the 64 linked hexagram pages.
  - Hexagram pages: `Article` or `CreativeWork` with headline, description, url, inLanguage, and isPartOf. `BreadcrumbList` is also defensible if visible breadcrumb navigation exists.
  Do not use `FAQPage` unless real visible questions and answers are added. Do not use `HowTo`, `Product`, `Review`, or fake ratings.
- **Why it matters for ranking:** Structured data can help Google understand page identity, but fake schema is a trust liability.
- **Estimated impact:** Low to medium.
- **Estimated effort:** Low.
- **Risk:** Over-markup looks spammy. Keep JSON-LD minimal and synchronized with visible text.

## 9. Core Web Vitals and fonts

- **What:** Current built assets are small: about 83 KB JS and 19 KB CSS, with vendored WOFF2 fonts. Font faces already use `font-display: swap`, which is good. The realistic LCP risk is the font-heavy hero/hexagram typography, not JavaScript size. Static hexagram pages should omit the SPA JS to reduce work. Consider preloading only the one or two truly critical above-the-fold fonts after measuring; generated preload URLs must use the same depth-aware path helper as other assets.
- **Why it matters for ranking:** Core Web Vitals are a ranking tiebreaker and affect crawl/user satisfaction. A fast static article page is also easier for Google to render.
- **Estimated impact:** Medium.
- **Estimated effort:** Low for omitting JS on article pages; medium for safe hashed-font preload generation.
- **Risk:** Preloading too many fonts makes performance worse. Do not preload all seven font files.

## 10. What is not worth doing

- **What:** Do not do keyword stuffing, hidden text, doorway variants, fake FAQ schema, analytics/tracking scripts, third-party widgets, dynamic rendering services, or server-only redirect plans. Do not create separate pages for every query modifier such as love/career/money unless those pages receive genuinely unique editorial content and RAI review.
- **Why it matters for ranking:** These are liabilities on a new low-authority site and conflict with the privacy promise.
- **Estimated impact:** High as risk reduction.
- **Estimated effort:** Low.
- **Risk:** The temptation to manufacture pages is strong because the corpus is finite. Resist it.
