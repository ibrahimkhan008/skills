# Micro-interaction & motion extraction (the proven playbook)

Micro-interactions are what make a clone feel like the original instead of a screenshot of
it. The Cognix specs captured them from three sources; on a new target, work all three.
Everything below is the exact method used to produce the §3.7 motion sheet and the §4
component interaction specs — apply it to any site.

## Where micro-interactions hide (three sources, all required)

1. **Compiled CSS** — `@keyframes` blocks, `transition` declarations, `cubic-bezier`
   easings, `:hover/:active/:focus-visible/:disabled` selectors, `::before`/`::after`
   pseudo-element systems, `mask-image` glow effects, `prefers-reduced-motion` overrides,
   and the **per-element custom properties that parameterize animation**
   (`--rise`, `--rise-delay`, `--rise-duration`, `--rise-opacity`, `--surface-*`).
2. **JS chunks** — Framer Motion / animation configs: spring `stiffness`/`damping`/`mass`,
   stagger delays, `AnimatePresence`/`whileInView` usage, ease arrays, toast timings.
   Cognix example: the price odometer's spring (stiffness 140 / damping 20 / mass 0.8,
   40ms per-digit stagger from the last digit) was read from a chunk, not the UI.
3. **Live browser** — the only place hover glows, scroll condensation, streaming states,
   and drawer/menu animation curves can be *verified*. CSS/chunks tell you the values;
   the browser confirms what actually fires and when.

## M1. Grep the CSS (fetch-only, do this in Phase A)

Grep the fetched stylesheets for, and record **verbatim**:

- `@keyframes` — every block, with its usage comment (which component consumes it)
- `transition` + `cubic-bezier(` — note **easing mismatches** (Cognix's transitions use
  `cubic-bezier(0.23,1,0.32,1)` while its landing keyframes compile to `.22,1,.36,1` —
  both recorded, not reconciled)
- `:hover`, `:active`, `:focus-visible`, `[disabled]` rules — the **state matrix** per
  component: default → hover → active → focus → disabled, with the exact property deltas
  (scale, color-mix fills, shadow changes, opacity)
- `::before`/`::after` — layered systems driven by per-instance variables (Cognix's button:
  `::before` masked ring/edge gradient + `::after` dotted brand-glow sweep that scales
  `scale-x-[1.6]` on primary hover and slides `-translate-x-1/3 → 0` fading in on outline)
- `mask-image`/`mask-size` — the dot-grid and halftone masks that texture the motion
  (2.5px glow dots, 2.4px halftone on accent text)
- `prefers-reduced-motion` — what the original actually disables (and what it misses)

**Reveal initial-state families:** SSR pages hide content with *inline styles* before
client animation. Grep the HTML for `style="opacity:0` and count the variants — Cognix had
a six-variant family (`translateY(16px)` ×4, `blur(8px)+translateY(8px)` ×4, etc.), not one
constant, plus hero overrides (`--rise:60px; --rise-duration:0.85s`). Record the family,
the per-element stagger pattern (hero partners 0.7s→1.05s; cards `min(.05·i, .3s)`), and
**whether a no-JS fallback exists** — if not, that's a defect to fix in the rebuild
(Cognix had none; the rebuild gates hiding behind a `js` class).

## M2. Grep the JS chunks

For each interactive component, find its chunk and extract:

- Spring/tween configs: `stiffness`, `damping`, `mass`, `delay`, `duration`, `ease`
- Choreography: stagger direction and step, viewport triggers (`whileInView`, once/repeat),
  `AnimatePresence` exit curves
- Interaction logic: accordion single-open vs multi, roving tabindex, scroll thresholds
  (Cognix's header condenses after **12px** of scroll), IntersectionObserver rootMargins

Mark chunk provenance in the spec ("from chunk `app/(public)/landing/page-*.js`").

## M3. Live observation checklist (Phase B, browser)

With the page open, actually do each of these and record what changes:

- Hover **every** interactive element: buttons (all variants), nav links, cards, toggles,
  table rows, icon buttons — glows, translates, shadows, color shifts
- Scroll: header condensation (threshold + what changes), sticky/fixed elements, reveal
  triggers as content enters the viewport, parallax/fade layers
- Open/close: drawers, menus, dialogs, accordions — entry/exit curves, backdrop behavior,
  Escape handling, click-outside
- Streaming/loading states: generation status lines ("Thinking 6.2s"), Stop buttons,
  spinners, skeleton/empty/error states, toast entrances
- Ambient motion: pulse dots, equalizer bars, shimmer labels (gradient + background-size
  250% + animated background-position), odometer digit rolls on data changes
- Input states: focus rings, placeholder behavior, disabled-until-valid gating

## M4. Output into the spec

1. A **motion-token sheet** (public spec §3.7-style): verbatim `@keyframes`, easings,
   timing/duration/delay conventions, the reveal family + staggers, reduced-motion posture,
   ambient loops — all with source provenance (CSS / chunk / design.md citation).
2. Each **component spec** (§4.x) carries its **interaction-state matrix**: default /
   hover / active / focus / disabled / open / closed, with exact deltas and the
   pseudo-element mechanics behind them.
3. Page blueprints note section-level choreography (entry staggers, viewport triggers).

## What a clone owes on motion (1:1 rule)

A 1:1 replica reproduces: identical keyframes and easings (including deliberate
mismatches — don't "fix" them silently), identical stagger patterns, identical hover/active
physics, identical scroll thresholds, identical reduced-motion behavior, and the same
SSR-vs-client reveal strategy (with the no-JS fix noted as an improvement, flagged as such).
Ambient loops (shimmer, pulses, dither drift) run at the captured cadence. What may differ:
art assets that texture the motion (dither fields, glows) — procedurally generated in the
documented style.

For the reproduction side — replacing the framework's animation JS with vanilla
equivalents (IntersectionObserver staggers, transform-only reveal filters, timer
fallbacks) — follow `references/clone-build.md` §C4, driven by the values captured here.
