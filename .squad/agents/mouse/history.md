# Mouse history

## 2026-07-29 — Site icon
Shipped the first site icon for the dark-violet system. The important constraint was not brand complexity but favicon physics: at 16px, a full hexagram becomes horizontal mush, so the durable move is one large 易 mark on its own ink field. Embedding the existing local CJK subset inside the SVG keeps the glyph deterministic and self-contained; Playwright rasterisation keeps the PNG fallbacks reproducible without adding image dependencies. Always judge favicon concepts at 16px before trusting the large render.

## 2026-07-30 — Favicon outline hardening
Learned the favicon-specific font trap: an SVG used as a browser icon is not a normal page document, so embedded `@font-face` and live text are not safe assumptions across engines. Converted 易 to true outlines from the vendored font subset. For small identity assets, the robust source of truth is path geometry; the font can be the derivation tool, not the runtime dependency.

## 2026-07-30 — 16px optical sizing
The full 易 mark is beautiful at 180px and solid at 32px, but dishonest at 16px: the stroke count exceeds the pixel budget. The fix is not more antialiasing; it is a separate optical size. For the 16px PNG, dropped the ring, filled the tile, brightened the violet, and reduced the mark to the 日 component on whole pixels. Also hardened the generator so corrupt preview PNGs fail the run instead of becoming review artifacts.
