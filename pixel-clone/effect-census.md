# Effect census — the exhaustive sweep (nothing gets missed, nothing needs telling)

The census is what makes this skill autonomous: **you are never told which effects a site
has.** You find all of them — every color, type treatment, spacing value, shadow, gradient,
mask, filter, transition, keyframe, pseudo-element system, layering trick, and interactive
state — by sweeping the fetched HTML against the compiled CSS and bucketing every
`(property, value)` pair that actually fires. The output is an **effects inventory** so
complete that a 1:1 replica needs nothing else: no screenshots from the user, no "copy
that effect" requests. If the user later points at anything, it is already documented with
its exact values.

Worked example throughout: cognixai.in, where the census surfaced the button surface
system (`::before` sheen/edge/shadow layers driven by per-instance variables), the
six-variant reveal family, the halftone accent-text mask, the dotted glow sweep, the
shimmer label, the green `::marker`, and the tray/card shadow stacks — none of which a
human had named in the request.

## E0. Inputs (Phase A gathers these)

- **HTML of every captured page** — all of them, not just key pages. Unique effects hide
  on quiet pages (Cognix's legal pages carried their own table tray treatment, green
  `::marker` lists, and a cross-nav strip found nowhere else).
- **Every stylesheet the pages load** — main bundle, per-route chunks, font CSS, inline
  `<style>` blocks.
- **All inline `style="…"` attributes** — reveal initial states and per-instance token
  overrides live here (`style="--surface-base:#fbfbfa"`, `style="opacity:0;…"`).

## E1. Build the "used CSS" set

1. Extract every class token from the fetched HTML (split `class` attributes on
   whitespace). Keep responsive/state prefixes (`sm:`, `hover:`, `md:`) — they matter for
   the state matrix later; group by the base utility for counting.
2. Parse the compiled CSS into (selector, declarations) pairs.
3. Match: a rule is **used** if a class token from the HTML appears in its selector
   (Tailwind utilities: exact match; component CSS: class-substring match).
4. The result is the site's real design surface — every declaration that fires on the
   captured pages, dead code excluded. Also record the *unused* total per bucket ("the
   bundle defines 40 keyframes; 9 fire on captured pages") so completeness is auditable.

## E2. Bucket every declaration

Sweep the used-CSS set and bucket by property. For each bucket, output **exact values +
where they fire** (selector/page), never summaries:

- **Color census** — every hex/rgb()/hsl()/var() from `color`, `background*`, `border*`,
  `box-shadow`, `fill`, `stroke`, gradient stops, `outline`. Dedupe → the complete palette
  (runtime tokens, literal-only colors like Cognix's `#1cd86a`, alpha ramps — record the
  `/85 /70 /65 /60 /55 /50 /45` opacity ladder as a system, not 7 accidents). Attach a
  usage map: which properties each color appears in.
- **Typography census** — per selector-group: family, size, weight, line-height,
  letter-spacing, `text-transform`, `text-decoration`, `text-shadow`, plus text *effects*:
  gradient text (`background-clip:text` + mask), `text-balance`/`text-pretty`,
  `tabular-nums`, underline opacity hovers (`decoration-(--brand)/30 → hover`), italic
  accent faces, `first-letter`/`marker`/`selection` treatments.
- **Spacing census** — every margin/padding/gap → the rhythm (base unit, section paddings,
  container widths, reading measures, grid gaps) as a system with the outliers listed.
- **Surface census** — radii ladder, every `box-shadow` string **verbatim** (stacks define
  the signature layering), border widths/colors (hairlines), background treatments
  (solids, multi-stop gradients with exact stops, images + their `mask-image`/`mask-size`,
  `backdrop-filter`).
- **Effects census** — every `transition` (properties + duration + easing),
  `@keyframes` verbatim, `animation` usages with delays/iteration, `filter`/`blur`,
  transforms (static + hover deltas), `will-change`, z-index ladder, `position:fixed/sticky`
  behaviors (scroll condensation thresholds come from chunks, M2).
- **Structural census** — grid/flex patterns per section (`grid-cols-[240px_1fr]`),
  aspect ratios, overflow strategies (`overflow-x-clip`, `overflow-x-auto` +
  `scrollbar-width:none`), responsive wrappers.

## E3. Pseudo-state census

For every interactive element class, record the **state matrix**: `:hover`, `:active`,
`:focus-visible`, `:disabled`, `[aria-expanded=true]`, `[aria-checked]`, `[data-state]`,
`:checked`, `:first/:last/:nth` — the exact property deltas between states. Cognix's
buttons transition **the custom properties themselves** (`transition-[…,--surface-top,
--surface-bottom]` + `hover:[--surface-top:color-mix(…,black 4%)]`) — a pattern easy to
miss if you only look at final colors.

## E4. Pseudo-element census (where signature effects live)

Sweep every `::before`, `::after`, `::placeholder`, `::selection`, `::marker`,
`::first-letter`, `::cue` rule. These carry the effects nobody names out loud: sheen and
edge-gradient layers, dotted glow sweeps (radial + 2.5px dot mask), halftone text masks,
inset highlights, scrollbar styling. Record layer order (`-z-10`, `isolate`), what
variables feed them, and their hover/aria triggers.

## E5. At-rule census

- `@keyframes` — verbatim, with which selectors consume them.
- `@media` — every breakpoint and what changes at it; `prefers-reduced-motion` blocks
  (what gets disabled).
- `@property` — registered custom properties (they animate: Cognix's surface vars).
- `@supports`, `@font-face` (which faces actually ship — Cognix declared a mono it never
  shipped: a rebuild fix).

## E6. Classify into the effects inventory

Reduce the buckets into an **inventory table** — the spec's index of everything visual:

| Effect | Fires on | Type | Trigger | Exact values | Source |
|---|---|---|---|---|---|
| Button glow sweep | all buttons | hover | `:hover` | radial 90% 160% at 0% 100%, opacity 0→70%, -translate-x-1/3→0, 2.5px dot mask, 300ms | CSS ::after |
| Price odometer | pricing digits | data change | plan toggle | spring 140/20/0.8, 40ms stagger from last digit | chunk |
| Header condensation | navbar | scroll | >12px | top-3→top-2, shadow strengthens | chunk |
| Accent halftone | trailing H1 words | static | always | gradient 30% stop, 2.4px dot mask | CSS |
| Reveal family | section content | entrance | in view | 6 initial variants, staggers 0→0.3s, 0.6–0.85s | HTML inline + chunk |
| Shimmer label | active map pin | ambient | always | gradient 100deg, background-size 250%, animated position | CSS |

Types: entrance · hover · ambient · data-change · scroll · static-texture · state. Every
row cites its source (CSS file / chunk / design.md citation / live observation).

## E7. The completeness gate (how you know the sweep is done)

The census is complete only when ALL of these hold:

1. **Class coverage:** every class token in the fetched HTML maps to a documented rule in
   the spec (or is explicitly marked third-party/untouched).
2. **Color coverage:** every color in the used-CSS set appears in the palette table with
   its usage map.
3. **Motion coverage:** every `@keyframes`, easing, and duration in the used-CSS set
   appears in the motion sheet.
4. **State coverage:** every interactive element in the DOM has hover/focus/active/
   disabled deltas recorded.
5. **Pseudo coverage:** every `::before/::after/marker/selection` rule is documented as
   part of a component spec or the effects inventory.
6. **Cross-page diff:** rules used on only some pages are noted in that page's blueprint;
   template-shared rules live in §3/§4.
7. **Unexplained visuals = investigation:** if the live page shows something the census
   can't explain (canvas/WebGL art, viewport-driven effects), chase it to its chunk and
   record it as render-time with provenance — never leave a visual undocumented.

## E8. Where the census lands in the spec

- **§3** — the token sheet (colors + usage map, typography ladder, spacing rhythm, radii +
  verbatim shadows, motion sheet) — all census buckets, paste-ready.
- **§4** — component library, each spec carrying its interaction-state matrix and
  pseudo-element mechanics.
- **§5** — page blueprints note section-level choreography and page-unique effects.
- **§3 intro** — the **effects inventory table** (E6) as the index of everything visual.

## E9. The replica-blind audit (clone verification)

When the clone is built, run this against the census — it is what makes a replica
indistinguishable from the original:

1. **Token-for-token:** every census row must be reproducible in the clone's CSS — walk
   the inventory table row by row (colors, shadows, easings, staggers, masks).
2. **Screenshot triple:** original vs clone at 375 / 768 / 1280 widths, full page
   (slice-capture if the stitcher mis-renders), side-by-side in the README.
3. **State walk:** hover/focus/open/expanded states exercised on both, compared against
   the state matrices.
4. **Ambient audit:** shimmer/pulse/dither loops at captured cadence; reduced-motion
   posture identical.
5. **Text effects:** selection color, marker color, gradient-text mask, underline hovers —
   the small things that scream "replica" when wrong.
6. Anything differing goes in the README's known-deltas list **with a reason** (asset
   policy, render-time-only, uncaptured state). A delta without a reason is a gap — go
   back and capture it.
