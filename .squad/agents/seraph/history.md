# History

## Repo-move README update — 2026-07-29T14:33:29+03:00

**Task:** Update README.md after the project moved from `i-ching-squad/` inside `mor-squads` to a standalone `morsh/i-ching` repo at `the standalone repo clone`.

**Changes made:**

1. **Live URL added at top.** `https://morsh.github.io/i-ching/` placed as a bold link immediately below the title — the public front door of a standalone repo belongs there.

2. **Getting started `cd` command.** `cd i-ching-squad/app` → `cd app`. Verified against actual layout: `app/` is a direct child of the repo root.

3. **Live site section rewritten.**
   - Old URL `https://morsh.github.io/mor-squads/` → `https://morsh.github.io/i-ching/`
   - Old invented path filter (`i-ching-squad/app/**`) removed — no workflow file exists yet in the new repo (Switch is authoring it)
   - Kept only what is verifiable: deploys from `prod` branch, tests run before deploy, defers to `.github/workflows/` for full definition

4. **Project layout tree.** Root label changed from `i-ching-squad/` to `(repo root)/`. All other entries unchanged.

5. **Privacy section — one addition only.** Added one sentence to "What is stored when you choose to save": the interface shows *"Saving will include your question."* next to the save button. Every other privacy paragraph is word-for-word unchanged.

**What I checked before writing:**
- Actual repo layout at `i-ching-move/`: root contains `README.md`, `app/`, `.squad/`, `.gitkeep`, `.git`
- `app/` exists and is a direct child of repo root
- `.github/workflows/` does not exist yet — workflow file is not present
- No other `i-ching-squad/` references remain in the README after these edits

**Learned:** When a project moves repos, path references scatter across multiple sections — opening cd command, layout tree, deploy section, and any test/file references. Scan all of them before writing, not just the obvious ones. When a workflow file doesn't exist yet, describe only what you know from the coordinator (prod branch, tests before deploy) and defer the rest to the file itself — do not invent.

## Cross-agent note — repo move path update — 2026-07-29T13:30:00+03:00

Project now lives in standalone `morsh/i-ching`. App path is `app/` at repo root; do not use the old `i-ching-squad/app/` path.

## SEO copy specification — 2026-07-30T10:35:00Z

**Task:** Provide words-only SEO copy for the standalone I Ching site without touching application files.

**Changes made:**

1. Created `.squad/seo-copy.md` with the landing-page title, meta description, Open Graph and Twitter copy, share-image text direction, static landing-page prose, heading outline, per-hexagram page template, thin-content cautions, and search-led section recommendations.

2. Created a decision inbox entry recording the SEO copy decision and the constraints preserved.

3. Grounded the per-hexagram recommendation in the actual corpus: 64 entries, each with number, binary, Chinese name, pinyin, English name, lower/upper trigrams, Judgment, Image, and six line texts.

**Learned:** SEO work for this project must not become keyword stuffing. The strongest search copy is explanatory: what the I Ching is, what the three-coin method does, why lines are cast bottom-to-top, and how changing lines are read. The per-hexagram pages can avoid thin-content risk only if they expose the unique corpus substance and add a real per-hexagram summary; a title/meta template alone is not enough.
