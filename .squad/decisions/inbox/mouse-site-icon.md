# Mouse — site icon

## Final shipped choice
Ship **Vibrant 易 — strong**. It keeps the character mark morsh already liked, increases perceived energy through a deeper violet field, brighter rim, and a violet-to-lavender glyph gradient, and stops short of the bold variant's halo-heavy mobile-game feeling.

## Final files
- `app/public/favicon.svg` — strong vibrant 易 seal, outline paths only.
- `app/public/favicon-32x32.png` — rasterised from the strong SVG.
- `app/public/apple-touch-icon.png` — rasterised from the strong SVG.
- `app/public/favicon-16x16.png` — hand-tuned 16px optical-size PNG.
- `app/public/site.webmanifest` — theme/background color updated to the strong field.
- `app/scripts/generate-icons.mjs` — regenerates the shipped strong icon and validates PNG integrity.
- `app/index.html` — theme-color updated to the strong field.

## 16px optical-size decision
The 16px favicon is not a downscale of the full 易 seal. At true tab size the full ideograph has too many strokes to resolve, especially after the rounded-square ring and padding consume the field. The dedicated `favicon-16x16.png` therefore uses the 日 component as a reduced mark: no border ring, edge-to-edge ink field, bright violet strokes, and whole-pixel rectangles. This is optical sizing, not a replacement of the primary mark — the 32px and 180px icons keep the full outlined 易 because they have enough pixels for the character to read.

## Vibrancy versus legibility lesson
The first vibrant exploration made the small mark more saturated but less legible: the 16px counters filled in, turning the clean outlined 日 into a blob with a floating bar. That is the reusable lesson: at favicon size, effects and denser colour can erase counters. The final 16px keeps the exact crisp counter geometry from the muted shipped mark and applies only the strong palette; no gradient or glow at 16px.

## Rejected concepts
- Coin: strongest non-易 candidate and conceptually honest to three-coin casting, but switching marks entirely is a larger brand move than the request.
- Six lines: exact to the product at large size, but a literal six-line hexagram cannot remain itself at 16px; it must reduce to a trigram.
- Taijitu: familiar and pleasant but generic, and not specifically an I Ching mark.
- Vibrant bold: vivid but too neon/haloed; it risks dating as a mobile-game icon.
- Vibrant modest: safe improvement, but the strong step better answers “more vibrant” while staying disciplined.

## Why outlines matter for favicons
SVG favicons are rendered as isolated images, and browser engines are inconsistent about honoring `@font-face` inside that context. If a live `<text>` glyph falls back on a system without CJK fonts, the tab can show a tofu box instead of 易. Outlines remove that failure mode and keep the mark deterministic.

## Generator hardening
`app/scripts/generate-icons.mjs` refuses corrupt image artifacts: it validates PNG signature bytes, minimum file size, and modification time newer than the source SVG. The preview sheet embeds PNG data URLs and includes old/new 16px magnification so the counter geometry can be checked directly.
