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
