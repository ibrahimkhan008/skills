# CSS / design-token extraction (the proven playbook)

How to turn a live site's CSS into a paste-ready token sheet — the exact logic used on
cognixai.in, where the entire §3 design system (colors, typography, spacing, radii, shadows,
motion, button surface system) was recovered from fetched HTML + CSS bundles without a
browser. Goal: the rebuild applies these values **one-to-one** — no rounding, no
"improvising" while cloning.

## X1. Collect every stylesheet

1. From the fetched HTML of 3–4 key pages, collect: `<link rel="stylesheet" href>`, inline
   `<style>` blocks, and `next/font` / `@font-face` CSS URLs (Next.js sites ship a separate
   font CSS file — fetch it too).
2. Fetch each with the same UA as the page (some CDNs vary). Keep a per-file map of which
   page loaded it.
3. Note which custom properties the **page markup itself** sets: grep the HTML for
   `style="--` — sites often re-declare palette tokens inline per section (cognixai.in
   re-declares its 5 runtime tokens on **every** section/footer wrapper, ~12 per page).
   That pattern is itself a finding: the rebuild should consolidate into one `:root`.

## X2. Read these things, in this order

- **CSS custom properties** on `:root`, `.dark`, and any inline wrappers. Record hex values
  + every place each is used. Watch for **inverted or swapped naming** — cognixai.in's
  `--ink` is the LIGHT page ground and `--paper` is the dark text ink. Keep the inversion if
  porting markup literally, or rename (e.g. `--ground`/`--ink`) and remap every utility.
- **The framework layer**: Tailwind v4 `@theme inline` mappings, and the custom-property
  utility pattern (`bg-(--ink)`), plus any compiled `bg-[#hex]` literals that bypass the
  token system (cognixai.in has a third green, `#1cd86a`, used only as literals — record it
  as "exists only as utilities, not part of the N runtime tokens").
- **`@font-face` reality check**: which fonts actually ship vs which are merely declared.
  cognixai.in declares `--font-geist-mono` but ships **no mono @font-face** — record that as
  a "fix in rebuild" item (self-host a mono webfont). Capture fallback faces with their
  metric overrides (ascent/descent/size-adjust) if present.
- **Typography ladder per element, per breakpoint**: exact `text-[44px] leading-[1.04]
  tracking-[-0.035em]`-style values for h1 (each page variant), h2, h3, eyebrow, lede, body,
  micro. Note the **weight discipline** (cognixai.in headings are all weight 400 — hierarchy
  comes from size/tracking/color, not boldness) and the opacity ramps used for text
  hierarchy (`/85 /70 /65 /60 /55 /50 /45`).
- **Radii ladder + canonical shadow stacks, verbatim** — copy the exact `box-shadow` strings
  into the spec (they define the signature layering: tray vs card vs nav pill vs chip).
- **Motion tokens**: `@keyframes` blocks, their timing functions, and the per-element CSS
  variables that parameterize them (`--rise`, `--rise-delay`, `--rise-duration`,
  `--rise-opacity`). Flag mismatches (cognixai.in's transitions use
  `cubic-bezier(0.23,1,0.32,1)` but its landing keyframes compile to `.22,1,.36,1`).
- **Component surface systems**: some components are driven by per-instance variables
  consumed by pseudo-elements (cognixai.in's button system: `--surface-base/--surface-lit`
  feed `::before` masked ring/edge gradients and an `::after` dotted brand-glow sweep).
  Extract each variant's token set, not just the final colors.
- **Layer-specific tokens**: shadcn-style app tokens used only by overlays (toaster, cookie
  banner), dark-page exceptions (hard-coded inline dark palettes on specific routes).

## X3. Provenance discipline

Mark every token row with where it came from:

- **observed** — read directly in the fetched CSS/HTML (most rows)
- **inferred** — breakpoint values assumed from framework defaults (say so: Tailwind v4
  defaults were "inferred, not read from the bundle")
- **cited** — values the site's own published design doc states but that only apply at
  render time (cognixai.in's design.md: "Bayer 8×8, 2px dots, ink #3C3C3C at 37%, gamma
  1.4") — quote the source, don't assert you saw them in CSS

## X4. Output format (into the spec, §3)

1. **Paste-ready `:root` block** — every token with a one-line comment explaining usage and
   any swapped naming.
2. **Paste-ready `@theme` block** (Tailwind v4) — the same tokens mapped to framework names.
3. **Color usage map table** — token → hex → observed usages.
4. **Typography table** — element → exact spec per breakpoint → weight/tracking notes.
5. **Spacing/layout table** — containers, gutters, section rhythm, grids, breakpoints.
6. **Radii & shadows** — ladder + verbatim shadow strings.
7. **Motion** — keyframes, easings, per-element variable families, reduced-motion notes.
8. **"Fix in rebuild" notes** — defects discovered during extraction (missing webfonts,
   no-JS-fallback gaps, unused declarations) so the rebuild improves on the original
   deliberately, not accidentally.

The test for "done": a developer holding only your §3 can produce pixels indistinguishable
from the original *structure and styling* without ever opening the site.
