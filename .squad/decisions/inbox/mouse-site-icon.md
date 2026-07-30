# Mouse — site icon

## Decision
Use the trademark 易 as the scalable site icon, set large on its own dark-violet rounded-square field. The 易 glyph is converted from the vendored Noto Serif SC subset into SVG outline geometry: one `<path>` element, no live text, no `font-family`, no embedded font, no base64 payload.

## 16px optical-size decision
The 16px favicon is not a downscale of the full 易 seal. At true tab size the full ideograph has too many strokes to resolve, especially after the rounded-square ring and padding consume the field. The dedicated `favicon-16x16.png` therefore uses the 日 component as a reduced mark: no border ring, edge-to-edge ink field, bright violet strokes, and whole-pixel rectangles. This is optical sizing, not a replacement of the primary mark — the 32px and 180px icons keep the full outlined 易 because they have enough pixels for the character to read.

## Why outlines matter for favicons
SVG favicons are rendered as isolated images, and browser engines are inconsistent about honoring `@font-face` inside that context. If a live `<text>` glyph falls back on a system without CJK fonts, the tab can show a tofu box instead of 易. Outlines remove that failure mode and cut the SVG from a font-bearing asset to a small, deterministic vector mark.

## Generator hardening
`app/scripts/generate-icons.mjs` now refuses corrupt image artifacts: it validates PNG signature bytes, minimum file size, and modification time newer than the source SVG. The preview sheet embeds PNG data URLs and includes a pixelated 16× magnification so the 16px grid can be inspected directly.

## Files
- `app/public/favicon.svg`
- `app/public/favicon-16x16.png`
- `app/public/favicon-32x32.png`
- `app/public/apple-touch-icon.png`
- `app/public/site.webmanifest`
- `app/scripts/generate-icons.mjs`
- `app/index.html`
