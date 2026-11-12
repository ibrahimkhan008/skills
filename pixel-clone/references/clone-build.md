# Clone-build playbook — the fast path to a 1:1 replica

Read this before Phase 3 (Clone & apply) whenever the target page might be
prerendered. It is the shortcut the hand-build route (spec → components → markup)
tries to reach: on a server-rendered page the target's own DOM is already a
pixel-perfect structure — harvest it instead of re-typing it. Everything below was
learned building a 1:1 home-page clone of a Vite + Tailwind v4 marketing site.

## C0. Pick the build strategy (one test)

Does the page's copy appear in the `curl` output (the fetch-only test from
public-recon)? Then the markup is prerendered:

- **Prerendered → markup transplant.** Harvest the DOM per section (C1), reattach
  tokens (C2), localize assets (C3), replace framework behaviors with vanilla JS
  (C4), mine client-rendered content (C5), verify (C6). Fastest reliable route to 1:1.
- **Client-rendered shell (copy absent from HTML) → hand-build** from the spec:
  token sheet + §4-style components + blueprints, per the explain-before-code gate.
  Screenshot-driven reconstruction is the fallback of last resort.

Marketing sites are overwhelmingly prerendered (SEO); app shells are not. A single
site can mix both — transplant the marketing pages, hand-build the app.

## C1. Harvest the prerendered markup

- Split the body with an HTML parser and **depth tracking**, never regex nesting —
  real SSR output breaks naive `<div>` counting.
- **Auto-descend single-wrapper chains** (`body → div#root → div.landing → main`)
  until genuine siblings appear; each descent level is one more split pass.
- **Keep every element's own open/close tags.** A splitter that renders only the
  children fragments silently deletes wrappers: the skip link becomes bare text, the
  header loses `<header>`. Emit `<tag attrs>…</tag>` per top-level child.
- Write pretty-printed per-section files (indent-aware; treat `img/br/hr/input/path/
  circle/…` as non-indenting). The fragments double as the spec's per-section evidence.
- Keep fragments in DOM order **including the inter-section separators** (often a
  1px `bg-divide` div between every section) and corner decorations (dot clusters,
  masks, canvases) — they carry the design.
- Tools: `python assets/split_landing.py page.html outdir/` (splits + pretty-prints),
  `python assets/skeleton.py section.html` (tag+class outline, skips SVG internals).
  Read skeletons, not 130 KB of minified HTML.

## C2. Reattach design tokens (Tailwind rebuild)

- **Detect the Tailwind major** from the built CSS before choosing a runtime:
  v4 = `@layer properties` + `@property --tw-*` blocks + oklch palette; v3 = `tailwindcss vN.N.N`
  banner. Rebuild with the same major (v4 → `@tailwindcss/browser@4` + `<style
  type="text/tailwindcss">` with `@theme`; v3 → cdn.tailwindcss.com + `tailwind.config`).
- Copy the site's **`@theme` overrides verbatim** (custom colors like
  `--color-charcoal-900: #202020`, overridden gray steps) plus every **custom
  utility** the markup uses (`.bg-divide`, `.border-divide`, `.shadow-collabbill`,
  `.text-footer-link`, …) as plain CSS — the browser build only knows stock utilities.
- Add **theme aliases for vars referenced in arbitrary values**: markup like
  `bg-[radial-gradient(var(--color-dots)_1px,…)]` needs `--color-dots: var(--dots)`
  in `@theme` or the utility silently resolves to nothing. Grep fragments for
  `var(--…)` and make sure each resolves.
- **The dark-mode trap.** Static HTML frequently ships `<html class="dark">` (a
  prerender artifact) while the app forces a theme at hydration — grep the JS chunk
  for `classList.remove('dark')` / `colorScheme='light'`. Tailwind v4 defaults `dark:`
  to the OS media query, so on a dark-OS machine every `dark:` style leaks (white
  headings on a white page, dark mockup cards). Add
  `@custom-variant dark (&:where(.dark, .dark *));` and force whichever theme the
  original forces.
- Semantic tokens often live on a wrapper class (`.landing { --divide: …; … }`) —
  recreate that wrapper and its vars on the clone's equivalent element.
- Fonts: copy the `@font-face` set (variable fonts: `font-weight: 100 900`; subsets:
  the latin one usually suffices), self-host under `assets/fonts/`, and set the same
  `--font-sans` / `--font-primary` order.

## C3. Localize assets

- Grep every fragment for absolute paths (`src="/logo.png"`, `/fonts/…`) and rewrite
  to local `assets/`. One asset can be referenced 5+ times (headers, footers,
  mockups) — rewrite globally, not per occurrence.
- Download favicon, logo, and fonts. Note treatments like `dark:invert` on the logo.
- Keep original nav hrefs (`/features`, …) in a single-page clone — they 404 locally,
  which is fine and expected; say so in the README.

### C3.5 Dither art (the drifting-mist signature) — reproduce, don't copy

Dithered monochrome art is a brand asset like any other: **never copy the target's
PNGs**. Reproduce the effect procedurally:

1. **Extract the parameters first.** Preferred source: the target's own design doc
   (Cognix's `design.md` cites Bayer 8×8, 2px dots, ink `#3C3C3C` at 37% coverage,
   gamma 1.4). Otherwise estimate from the raster: dot size (zoom in — 2px here),
   ink color (color-pick a dark dot), and density (fraction of inked cells).
2. **Generate stand-ins at the exact consumed dimensions** with
   `assets/dither-kit.mjs` (pure Node, no deps):

   ```bash
   node dither-kit.mjs out/hero.png 1200 630 ridge 1.7   # alpine hero backdrop
   node dither-kit.mjs out/footer.png 1600 320 band      # watermark band
   node dither-kit.mjs out/cta.png 1200 630 card         # CTA card backdrop
   node dither-kit.mjs out/map.png 1600 820 field       # sparse map texture
   node dither-kit.mjs out/plan-1.png 480 160 banner 1  # small card banners
   ```

   Tune the style/seed until the silhouette shape matches the target's composition
   (ridge position, fade direction) — the *effect* is copied, the *artwork* is yours.
3. **Wire the animated variant.** The original pairs each raster with an
   `opacity-0` `<canvas>` the client repaints as a drifting Bayer dither, fading in
   over ~700ms. Use `assets/dither-canvas.tsx` (React client component) — it
   implements exactly that mechanic (drifting threshold, ~90ms frames, static
   under `prefers-reduced-motion`). Static clones can skip the canvas and ship the
   raster alone.
4. **Apply the target's CSS treatment verbatim:** `[image-rendering:pixelated]`,
   `object-cover` (+ `object-top`/`object-[50%_70%]` where captured), and the masks
   — hero `radial-gradient(ellipse 44% 34% at 27% 70%, black 30%, transparent 100%)`,
   footer watermark `radial-gradient(ellipse 75% 80% at 50% 92%, rgba(0,0,0,0.1) 45%,
   #000 100%)` — plus any white gradient overlays on card backdrops.
5. **Reduced motion:** the canvas stays a static dither; the raster is always the
   no-JS fallback (the raster renders alone; the canvas only enhances).

### C3.6 Accent-text halftone effect (dithered headline words)

The same halftone aesthetic applied to **text**: trailing headline words render in
italic serif with a paper→brand gradient showing through a halftone dot mask — the
letters themselves look dithered ("Terms of *Service*", where "Service" is textured
and shifts to brand green toward its end). Ship it with `assets/accent-text.css`.

1. **Find it in the compiled CSS:** grep for `background-clip:text` (often
   `-webkit-background-clip`) near `mask-image` on heading spans — the accent class
   carries both the gradient and the mask.
2. **Extract the knobs:** the gradient's brand-takeover stop (Cognix: 30%), the mask
   tile size (2.4px × 2.4px) and dot radii (solid 0.95px, fade to 1.3px), the accent
   font (italic 400 serif) and its fallback face with metric overrides, and the
   anti-clip padding (Cognix: `padding-right: 0.06em` — italic overhang gets cut
   without it).
3. **Apply verbatim** via the asset (set `--accent-text-from/to` to the target's
   text/brand tokens). Always the **trailing words** of a headline; the mask is what
   turns a flat gradient into the halftone texture — if the target's letters look
   solid, it's the same gradient without the mask (record which variant the target
   uses per heading).
4. **Reduced-motion:** static — nothing to gate. No-JS: pure CSS, always renders.

## C4. Replace framework behaviors with vanilla JS

Inventory the interactivity from the static markup first — it tells you what the
React bundle was doing:

- `button[aria-pressed]` groups → step tabs / stat tiles. Pressed styling often lives
  on **inner nodes** (opacity classes on a child div, a canvas + progress-bar
  decoration that must move to the newly pressed button) — swap those, not just the
  attribute.
- `aria-expanded` + `aria-controls` + `style="height:0px;opacity:0"` → accordion
  panels; animate height to `scrollHeight` then to `auto`, rotate the chevron span,
  keep `aria-hidden` in sync.
- Inline start states (`opacity:0`, `translateY(24px)`, `scaleY(0)`) → staged
  entrance animations. Group elements by nearest section container, observe with
  IntersectionObserver, stagger ~90 ms. Two hard-won details:
  1. the reveal filter must match **transform-only hiding too** (`scaleY(0)` chart
     bars carry no `opacity`) or parts of the page stay invisible forever;
  2. always add a **timer fallback** (~1.5 s) per group — IO may never fire in
     automation browsers or odd embeds, and a clone with blank sections is a failed
     clone.
- Decorative fixed-overlay canvases (ribbons/noise): paint once after layout
  (`clientWidth` may be 0 before the CSS runtime finishes — guard + retry) or leave
  blank if purely decorative.
- **Verify every JS selector against the real DOM.** Structural surprises are the
  norm: stat tiles lived in a *sibling* grid next to the `[aria-live]` mockup grid,
  not inside it; the desktop stage holds one layer while the mobile variant holds
  all three (clone mobile panels into the stage on tab switch).

The values these replacements use — exact easings, stagger steps, scroll thresholds,
hover/active deltas — come from the extraction playbook in
`references/micro-interactions.md`; don't invent them at build time.

## C5. Mine client-rendered content

On-demand content (accordion answers, tab panels, hidden states) is frequently
absent from prerendered HTML — the accordion ships an **empty panel**. Grep the JS
chunk for template-literal data (`question:\`…\`,answer:\`…\``, option lists,
step copy) and inject what you find into the clone's static markup at build time.
Provenance: note the chunk filename in the spec.

## C6. Verify 1:1

- Open clone and original side by side at the same viewport; compare hero, one
  mid-page section, and the footer. Screenshot the **original early after load** —
  sites with continuous canvas/animation loops keep automation busy and later
  operations time out.
- Skip native full-page capture: stitching repeats `position:fixed` headers as
  artifacts. Scroll through the page once (triggers reveals), settle, return to
  top, then take **viewport shots at scroll offsets**.
- Drive the interactions: every `aria-pressed` group, one accordion toggle, the
  mobile menu, the header shrink. In automation browsers rAF may never fire, which
  makes Playwright stability checks time out on a perfectly clickable element —
  check `elementFromPoint`, then fall back to coordinate clicks (CUA path), and
  keep `evaluate` promises short (no rAF loops).
- Record honest deltas in the README (approximated animation choreography, blank
  decorative canvas, 404 nav links).

## C7. Ethics & scope for replicas

- Always 1:1: structure, layout, information architecture, tokens, behavior.
- Brand assets and verbatim copy: default REPLACE (spec mode). Keep them only when
  the user explicitly asked for a faithful replica (a clone/replica test) **and** the
  result stays local — state "local test only, not for deployment" in the README,
  and never deploy or publish it. The skill's reuse-vs-replace hard rule governs
  anything that leaves the machine.
