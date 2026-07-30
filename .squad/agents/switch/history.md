# History

## SEO prerender pipeline — 2026-07-30T10:50:00Z

Implemented the static SEO build step for the standalone app. `npm run build` now runs the Vite build and then prerenders the landing page, 64 corpus-backed hexagram articles, sitemap, and project-path robots file. Key invariant: all emitted document references are depth-aware; nested hexagram pages use `../../assets/...` while canonical and social URLs remain absolute. The landing page keeps static copy in `#app` and mounts the interactive oracle into `#oracle-app`, so hydration does not erase crawlable content. Verified with 160/160 tests and production build.

Follow-up after Seraph's copy landed: removed the authorized placeholder/insertion comment, wired `.squad/seo-copy.md` wording into landing metadata, social tags, prose, and generated per-hexagram metadata. Verified no `{number}`-style template placeholders survive in generated HTML. Final validation: 161/161 tests and production build.

## Repo move — standalone i-ching repo — 2026-07-29T14:33:29+03:00

Workflow re-authored for morsh/i-ching. Actions bumped to Node 24 targets. Build verified with relative asset paths. See decision log for full details.

## Cross-agent note — repo move path update — 2026-07-29T13:30:00+03:00

Project now lives in standalone `morsh/i-ching`. App path is `app/` at repo root; do not use the old `i-ching-squad/app/` path.
