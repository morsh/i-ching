### 2026-07-29T14:33:29+03:00: Workflow and .gitattributes for standalone i-ching repo

**By:** Switch

**What:** Created `.github/workflows/deploy.yml` (trigger: push to `prod`, path filter `app/**` + workflow file; Node 22; npm ci + npm test + npm run build; Pages Actions flow with actions/checkout@v7, actions/setup-node@v7, actions/configure-pages@v6, actions/upload-pages-artifact@v5, actions/deploy-pages@v5; artifact from `app/dist`; cancel-in-progress: false). Created `.gitattributes` with union-merge rules for squad append-only state, paths adjusted to drop the old `i-ching-squad/` prefix.

**Why (path filter):** Kept the path filter even though this is a single-purpose repo. The filter on `app/**` is still meaningful: a commit that only changes `README.md`, `.squad/` files, `.gitattributes`, or other non-app files would otherwise trigger a needless deploy. The "trap" concern was valid in mor-squads where the filter was the only thing preventing cross-squad noise; here it prevents doc/config-only churn from redeploying. Added the workflow file itself so a workflow change also triggers a run.

**Why (base path):** Did not change `base: './'` in vite.config.ts. The built `dist/index.html` emits `./assets/index-YwYFHHpZ.js` and `./assets/index-BYZJLGXG.css` — purely relative, agnostic to whether the site is at `/i-ching/` or any other subpath. This is the correct and robust choice; hardcoding `/i-ching/` would recreate the blank-page trap.

**Why (action versions):** Bumped all five actions to their current latest major (verified via `gh api`): checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5. Previous pins (v4/v4/v5/v3/v4) were the source of the Node 20 deprecation warnings; the new versions target Node 24.
