# Decisions

Canonical decision ledger. Append-only. Merged from `decisions/inbox/` by Scribe.

### 2026-07-29T10:00:49+03:00: Team hired
**By:** Mor Shemesh
**What:** Squad formed for the I-Ching Oracle project — Niobe (Lead), Trinity (Frontend), Switch (Engine), Seraph (Content/Data), Tank (Tester), plus Scribe, Ralph, and Rai.
**Why:** Project needs UI, a randomness/divination engine, a 64-hexagram content corpus, and quality gating.

### 2026-07-29T10:00:49+03:00: Core product constraints
**By:** Mor Shemesh
**What:** (1) Randomness must use the strongest available primitive — Web Crypto `crypto.getRandomValues` with rejection sampling; `Math.random` is banned. (2) The site is completely stateless — no persistence, no accounts, no server session. (3) Lines are cast bottom-to-top (line 1 first), each from a three-coin roll producing values 6/7/8/9.
**Why:** Explicit user requirement at project kickoff.
