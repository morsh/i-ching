# Decision: SEO architecture — prerender static hexagram pages

**Date:** 2026-07-30T10:35:00Z  
**By:** Niobe  
**Status:** Proposed for implementation by Switch

## Context

The deployed page is an empty JavaScript shell: the built root HTML is under 1 KB and contains `<main id="app"></main>`. The 64-hexagram corpus is substantial but only appears after runtime interaction, so crawlers see almost none of the project's real content.

Constraints: GitHub Pages static hosting only; site served from `/i-ching/`; `app/vite.config.ts` `base: './'` must remain; deploy runs `npm ci`, `npm test`, then `npm run build` from `app/`; privacy promise forbids analytics/tracking/third-party scripts; engine must not import the corpus.

## Decision

Generate static, crawlable pages at build time:

- Keep `base: './'`.
- Add `app/scripts/prerender.mjs`, run after `vite build` in `npm run build`.
- Use Vite's programmatic module loader to read `app/src/data/hexagrams.ts` from the script without adding a framework and without changing runtime module boundaries.
- Emit `dist/hexagram/1/index.html` through `dist/hexagram/64/index.html` plus a crawlable `dist/index.html`, `dist/sitemap.xml`, and `dist/robots.txt`.
- Canonical URL shape is number-only: `/i-ching/hexagram/<number>/`.
- Hexagram article pages should not load the SPA script that replaces their body. They may link to the root casting experience. If enhanced later, enhancement must preserve the article content in the DOM.
- Generated nested pages must rewrite asset references by depth: `../../assets/...` from `dist/hexagram/<n>/index.html`; never `/assets/...` and never a hardcoded domain-root asset path.

## Rationale

This is the highest-value SEO move because it exposes existing unique content to crawlers and long-tail searches. Number-only URLs avoid permanent translation/romanisation mistakes on a static host with no redirect layer. Depth-aware relative paths preserve the Pages subpath requirement and avoid the blank-site failure mode.

## Consequences

Switch should implement the generator and tests. Seraph owns final titles/descriptions/intro copy. The generated pages must be substantial enough to avoid thin-template risk: include judgment, image, six line texts, names, trigrams, and concise navigation. No analytics, doorway pages, keyword stuffing, or fake schema.
