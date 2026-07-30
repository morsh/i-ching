### 2026-07-30T10:50:00Z: SEO prerender pipeline
**By:** Switch
**What:** Added `app/scripts/prerender.mjs` and wired `npm run build` to run `tsc --noEmit && vite build && node scripts/prerender.mjs`. The prerender step loads the TypeScript corpus through Vite SSR, rebuilds `dist/index.html`, emits `dist/hexagram/1/index.html` through `dist/hexagram/64/index.html`, writes `dist/sitemap.xml`, and emits a project-path `dist/robots.txt`.

**Why:** The app shell was previously too small and text-empty for crawlers. The generated landing page now contains static copy, an index of all 64 hexagrams, metadata, and JSON-LD while the interactive oracle mounts into `#oracle-app` so hydration does not erase the static DOM. Each hexagram page is a static article with its own number, Chinese name, pinyin, English name, trigrams, Judgment, Image, all six line texts, canonical metadata, Open Graph/Twitter tags, and minimal `CreativeWork` JSON-LD.

**Asset-path decision:** Kept `base: './'`. Generated document references go through a depth-aware helper: landing assets are `./assets/...`; nested hexagram pages use `../../assets/...`, `../../favicon.svg`, and `../../site.webmanifest`. Hexagram pages intentionally omit the SPA module script.

**Robots decision:** Emitted `robots.txt` only as a completeness artifact with `User-agent` and `Allow`. Did not include a `Sitemap:` directive because project-path robots files are not authoritative for GitHub Pages host-root crawling; the sitemap should be submitted directly in Search Console.

**Follow-up:** Once Seraph's `.squad/seo-copy.md` landed, wired its landing title, description, Open Graph/Twitter wording, static prose, and per-hexagram title/description/heading patterns into the generator without placeholder prose.

**Verification:** `npm test` passed 161/161. `npm run build` passed. The generated `dist/index.html` grew from 888 bytes to 18,989 bytes. Verified 64 hexagram pages, 65 sitemap URLs, nested `../../assets/` references on a generated hexagram page, zero root-relative `src="/..."` or `href="/..."` references on that page, no surviving Seraph template placeholders, and fresh generated artifacts newer than changed sources.
