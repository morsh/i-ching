# Team

## Project Context

**Project:** I-Ching Oracle — a stateless web page for casting and reading I-Ching hexagrams.

**What it does:**
- Casts a hexagram using high-quality randomness (Web Crypto `crypto.getRandomValues`, rejection-sampled — never `Math.random`).
- Lines are cast from the **bottom up** (line 1 → line 6). Each line is produced by a roll of **three coins**, yielding the classical distribution: 6 (old yin), 7 (young yang), 8 (young yin), 9 (old yang).
- Old (changing) lines produce a second, transformed hexagram.
- The user can then request an interpretation/reading of the primary hexagram, the changing lines, and the resulting hexagram.

**Constraints:**
- **No backend** — no server-side session, no database, no user accounts, no network requests of any kind.
- Cast history is persisted **device-locally** in `localStorage` only (superseded the original stateless requirement — see `decisions.md`). The user's question is never stored or transmitted.
- Randomness quality is a first-class requirement, not an afterthought.

**Stack:** TBD by the Lead (default lean: static site, TypeScript, no backend required).

**Project owner:** the repository owner

## Members

| Name | Role | Charter | Badge |
|------|------|---------|-------|
| Niobe | Lead | .squad/agents/niobe/charter.md | 🏗️ Lead |
| Trinity | Frontend Dev | .squad/agents/trinity/charter.md | ⚛️ Frontend |
| Mouse | Design Lead | .squad/agents/mouse/charter.md | 🎨 Design |
| Switch | Engine Dev | .squad/agents/switch/charter.md | 🔧 Backend |
| Seraph | Content & Data | .squad/agents/seraph/charter.md | 📝 Docs |
| Tank | Tester | .squad/agents/tank/charter.md | 🧪 Test |
| Scribe | Session Logger | .squad/agents/scribe/charter.md | 📋 Scribe |
| Ralph | Work Monitor | .squad/agents/ralph/charter.md | 🔄 Ralph |
| Rai | RAI Reviewer | .squad/agents/rai/charter.md | 🛡️ RAI |
