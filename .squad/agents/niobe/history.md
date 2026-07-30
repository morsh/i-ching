# Niobe history

## 2026-07-30T10:35:00Z — SEO architecture assessment

- Verified that the deployed and local built landing pages are empty JavaScript shells under 1 KB, while the 64-entry corpus is invisible to crawlers.
- Chose build-time static prerendering for `dist/hexagram/<number>/index.html` plus a crawlable landing page, sitemap, and robots file.
- Kept `base: './'` as load-bearing for project Pages and required depth-aware relative asset paths such as `../../assets/...` on nested pages.
- Chose permanent number-only hexagram URLs to avoid translation and romanisation churn without server redirects.
- Recorded that the realistic SEO upside is long-tail growth over months, not near-term head-term dominance.
