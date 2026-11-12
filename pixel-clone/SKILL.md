---
name: pixel-clone
description: >
  Reverse-engineer a website into a from-scratch rebuild specification — public-site recon
  (routes, verbatim copy, layout blueprints, design tokens, legal outlines) plus an optional
  logged-in app walkthrough (shell, chat/dashboard, settings, billing, quota flows, mobile
  pass) and a working 1:1 clone. Use whenever the user asks to analyze, clone, copy, or
  recreate a site's design, reverse-engineer a competitor, extract a design system, produce
  a "rebuild spec", or make a pixel-perfect replica — even if they just say "analyze this
  site" or "copy X's design". Produces fact-checked markdown deliverables with per-claim
  evidence and reuse-vs-replace rules.
license: MIT
metadata:
  author: MD Ibrahim Arman
  version: "1.4.0"
---

# PixelClone — site rebuild & 1:1 replica specs

Produce the two markdown deliverables a developer needs to rebuild a target site from
scratch under **original branding**: a **public-site rebuild spec** and (when the site has a
logged-in product) a **companion app spec**. Everything is evidence-first: every claim carries
its source (URL, fetched HTML/CSS/JS chunk, screenshot, or DOM snapshot), and anything not
captured is listed under "Not covered" with a reason — never guessed.

**Hard rule — reuse vs replace.** The target's *structure, layout, information architecture,
design tokens, feature set, and behavior* may be recreated. Their *name, logo, brand assets,
verbatim marketing copy, images, model/product names, and legal text* must be **replaced with
original content**. Specs quote the original's copy only as a structural reference, with
REPLACE markers. Final legal text is always drafted fresh.

## Phase split — decide before starting

1. **Public recon (always).** Fetch-only: no browser needed. Robots/sitemap/llms.txt → page
   crawls → the **effect census** (every color, typography treatment, spacing value,
   shadow, gradient, mask, filter, transition, keyframe, pseudo-element system, and
   interactive state — automatically, from HTML + compiled CSS + chunks) → design tokens +
   micro-interactions → legal outlines → spec.
2. **App walkthrough (only if the site has a logged-in product and the user wants it).**
   Browser session in the main agent; user completes any login/OAuth/CAPTCHA themselves.
3. **Clone & apply (optional).** When the user wants a working clone, not just specs, build
   the flagship page(s) as a **1:1 replica** — tokens into a `:root`/`@theme` sheet
   unchanged, §4-style components, blueprint sections as markup, micro-interactions at the
   captured easings/staggers — under the asset policy (recreate structure exactly;
   procedurally generate or placeholder anything brand-owned). Then verify with a
   side-by-side screenshot comparison.
   **Pick the build strategy first** (`references/clone-build.md` §C0): on a prerendered
   page, transplant the target's own DOM (harvest per section, reattach tokens, replace the
   framework's JS with vanilla equivalents) — it reaches true 1:1 far faster and more
   accurately than re-typing markup from a blueprint. Hand-build only client-rendered
   shells. For a faithful replica kept strictly local, brand copy may stay verbatim when
   the user explicitly asked for a replica — say "local test only, not for deployment" in
   the README; anything that leaves the machine falls under the hard rule above.

   **A 1:1 replica reproduces:** exact hex/spacing/radii/shadow strings; exact typography
   per breakpoint; exact DOM/section order with captured aria names and testids; exact
   keyframes, easings, stagger patterns, scroll thresholds, and hover/active/focus states
   (`references/micro-interactions.md`); the same SSR-vs-client-render split; breakpoint
   behavior including mobile-only omissions (they are design decisions); ambient loops at
   the captured cadence; the same reduced-motion posture. It replaces only brand assets
   (procedural stand-ins) and — outside the local-replica exception above — verbatim copy
   and legal text (REPLACE pass).

**Autonomy rule — the user never names effects.** The effect census
(`references/effect-census.md`) is a mandatory Phase A step, not an optional one: sweep
every fetched page against the compiled CSS and inventory every visual on the site —
colors, typography treatments, spacing rhythm, shadows, gradients, masks, filters,
motion, states, pseudo-element systems, layering. The user never needs to send screenshots
or say "this site has X effect, copy it": when they point at anything later, it is already
in the effects inventory with its exact values. If the live site shows something the
census cannot explain, chase it to its chunk (or Phase B) before writing the spec — an
undocumented visual is a gap, and a gap becomes a tell in the replica.

Read the phase playbooks before executing:

- `references/public-recon.md` — fetch order, crawl discipline, token extraction, JS-chunk
  mining, and a ready dynamic-workflow template (`assets/recon-workflow.template.ts`) for the
  fan-out when the site is large.
- `references/css-extraction.md` — the full CSS/token extraction logic: collecting every
  stylesheet, reading custom properties (inline per-wrapper re-declarations, swapped naming,
  literals that bypass tokens), typography/weight/opacity ladders, shadow + radii stacks,
  motion variable families, per-instance component surface systems, provenance marking, and
  the paste-ready output format.
- `references/micro-interactions.md` — the micro-interaction & motion playbook: grepping
  compiled CSS for keyframes/easings/pseudo-element glow systems/reveal initial-state
  families, mining JS chunks for spring configs and interaction logic, the live-observation
  checklist (hover/scroll/streaming/ambient), the per-component interaction-state matrix,
  and the motion rules a 1:1 clone owes.
- `references/effect-census.md` — the exhaustive sweep that makes the skill autonomous:
  build the "used CSS" set, bucket every declaration (colors, typography, spacing,
  surfaces, effects, structure), census pseudo-states/pseudo-elements/at-rules, classify
  into the effects-inventory table, run the completeness gate, and finish clones with the
  replica-blind audit.
- `references/clone-build.md` — the 1:1 replica build playbook: strategy test
  (prerendered → markup transplant vs client-rendered → hand-build), DOM harvesting with
  `assets/split_landing.py`, Tailwind rebuild pitfalls (version detection, custom utilities,
  theme aliases for arbitrary values, the dark-mode trap + `@custom-variant`), asset
  localization, vanilla-JS replacement of framework behaviors (reveal systems, tabs,
  accordions), JS-chunk content mining, and the verification recipes.
- `references/app-walkthrough.md` — browser session protocol, login handoff, route probing,
  capture checklist, quota/checkout flows, mobile pass.
- `references/cognix-case-study.md` — the complete worked example: how the Cognix docs were
  produced (workflow recon → fact-check → browser walkthrough → specs) and how the clone was
  built from them (explain-first gate, procedural assets, screenshot comparison).
- `references/spec-format.md` — deliverable skeletons (§0–§10 public / §A–§K app) and the
  evidence rules.

## Explain before code (hard gate)

**Never start writing build code until the build is explained to the user in one message and
confirmed.** The explanation must cover, concretely:

1. **Token sheet summary** — the extracted `:root`/`@theme` values that will go into the
   stylesheet (colors with hex, type ladder, spacing/radii/shadows, motion), including any
   swapped naming and "fix in rebuild" items — plus the **micro-interaction summary**
   (keyframes, easings, staggers, hover/active states) that the clone must reproduce.
2. **Component inventory** — each component to build and which extracted spec defines it.
3. **Build order** — section-by-section for the page(s) being cloned, matching the
   blueprint's DOM order.
4. **Asset policy** — exactly what gets recreated vs replaced/procedurally generated
   (logo, imagery, icons, partner marks, copy).

The user's confirmation is the license to edit code. Then apply the extracted values
literally: same hex, same sizes, same easings, same shadows — judgment is spent on assets
and branding, never on "improving" measurements mid-clone.

## Operating lessons (learned the hard way — do not re-learn them)

- **Workflow subagents must stay fetch-only.** Browser automation (node_repl browser client)
  called from a dynamic-workflow subagent was permanently refused by the provider
  ("Method Not Allowed") and killed the run. All browser work happens in the main session,
  driven by you. Keep the two worlds separate.
- **Fetch-only is enough for design.** Most sites serve full HTML (test: does the homepage
  render its copy in `curl` output?). Tokens come from CSS custom properties, Tailwind
  patterns, and `font-face` rules — not screenshots. If the site publishes its own design doc
  (`/design.md`, `/branding`), treat it as ground truth and cross-check it against the CSS.
- **JS chunks are a spec goldmine.** Quota maps, plan prices (monthly figures often absent
  from SSR HTML), checkout endpoints and strings, signed-in plan states, hidden feature
  flags, model catalogs. Grep chunks for domain nouns ("workflow", "admin", "quota",
  "checkout", "plan") — and for on-demand content the prerendered HTML omits: accordion
  answers ship as *empty panels* and live in the chunk as template-literal pairs
  (`question:\`…\`,answer:\`…\``). Mine them at build time or the clone's accordions are blank.
- **On a prerendered page, transplant the markup — don't re-type it.** Harvesting the
  target's own DOM per section is the fastest accurate route to 1:1; re-typing from a
  blueprint guarantees drift. Split with an HTML parser (depth-tracked, auto-descending
  wrapper chains) and **keep each element's own tags** — a splitter that renders only
  children silently deletes `<header>`/`<a>` wrappers. Use `assets/split_landing.py` +
  `assets/skeleton.py` instead of reading minified HTML.
- **The dark-mode trap.** Static HTML often ships `<html class="dark">` (prerender
  artifact) while the app forces the opposite theme at hydration (grep the chunk for
  `classList.remove('dark')`). Tailwind v4 defaults `dark:` to the OS media query —
  without `@custom-variant dark (&:where(.dark, .dark *))` a dark-OS machine leaks dark
  styles (white-on-white headings). Also: copy the site's custom utilities verbatim and
  add `@theme` aliases for vars used inside arbitrary values (`--color-dots: var(--dots)`)
  or those utilities silently no-op.
- **Inline animation start states are a blank-page failure mode.** Prerendered sections
  ship `opacity:0` / `translateY(24px)` / `scaleY(0)` inline styles the framework animates
  away at hydration. A static transplant must reproduce that reveal system — and the
  filter must match **transform-only hiding** (`scaleY(0)` chart bars have no opacity) and
  carry a **timer fallback** per section, or the clone renders blank sections forever.
- **Headers leak architecture.** `x-middleware-rewrite` (internal routes), CSP `connect-src`
  (voice/realtime/storage/API providers), `x-powered-by`, permissions-policy, HSTS. Record
  them — a rebuild needs the same posture.
- **Behavioral route probing beats guessing.** Menu items that bounce to `/` = gated
  features (find the entitlement in pricing copy); hard fetch failures = edge-blocked admin;
  real 404s = dead links. One focused probe per candidate from robots.txt + UI facts, then
  stop.
- **Plan-state subtleties.** Sites may split *subscription* (what you pay) from *access
  tier* (what an admin assigned); their own pages can disagree. Admin-assigned tiers usually
  break real checkout (capture the failure toast — that IS the finding). Never pay; opening
  the checkout attempt and recording the result is enough.
- **Screenshots are for layout truth, DOM snapshots are for structure.** Capture
  screenshots at desktop + one mobile size (390×844); use DOM snapshots for copy, testids,
  and a11y names. Watch for mobile-only omissions (footer disclaimers, title dropdowns) —
  they are real design decisions. In clone verification: native full-page capture
  stitches `position:fixed` headers into artifacts — scroll through once, settle, then
  take viewport shots at offsets; screenshot the ORIGINAL early (continuous canvas
  animations make later automation time out); rAF throttling in automation browsers can
  hang Playwright stability checks on a clickable element — hit-test with
  `elementFromPoint`, then fall back to coordinate clicks.
- **Login is the user's hands, not yours.** OAuth + CAPTCHA steps are completed by the user
  in the visible browser; you drive everything before and after. Account creation, email
  verification, and payments are always the user's call — ask once, then execute.

## Deliverable contract

1. `<domain>-rebuild-spec.md` — public site: overview/stack, route map + IA, token sheet
   (paste-ready), **effects inventory** (the index of every visual on the site), motion &
   micro-interaction sheet, component library with interaction-state matrices, per-page
   blueprints with verbatim copy, feature inventory, legal outlines, issues/gaps,
   reuse-vs-replace, build milestones.
2. `<domain>-app-spec.md` — logged-in app: account/session facts, route map (verified vs
   gated vs blocked), shell & navigation, feature behaviors, settings taxonomy, theming,
   API/infra surface, quota/checkout, mobile layout, build-plan delta.
3. Cross-reference pointer paragraph in each file's "how to read" block; both files end with
   an explicit **Not covered** list with reasons (gated, blocked, client-rendered, would
   spend money/quota).
4. If a clone was approved: a working project with the extracted tokens applied 1:1, plus a
   README holding the **original-vs-clone screenshot pair** (hero + full page, stitched from
   viewport slices with `assets/stitch-pngs.mjs` if native full-page capture mis-renders) and
   an honest known-deltas list. When verbatim brand copy was kept for a local replica test,
   the README states "local test only, not for deployment".
5. If the project keeps a `context.md` (AGENTS.md protocol), append timestamped entries for
   the research batches and the deliverables.

## Execution order

1. Confirm scope with the user in one message: target URL, public-only vs app too vs full
   clone, login method (if app), and whether checkout may be *opened* (never paid). Then work
   without asking again — except at the explain-before-code gate.
2. Run Phase A (read `references/public-recon.md` + `references/css-extraction.md` +
   `references/effect-census.md` + `references/micro-interactions.md` first — the census
   drives the sweep). Deliver the public spec.
3. If app research is in scope: run Phase B (read `references/app-walkthrough.md` first),
   then write the app spec and add the cross-reference pointers.
4. If a clone is in scope: pick the strategy (`references/clone-build.md` §C0), **present
   the explain-before-code message** (tokens, components, build order, asset policy) and
   wait for the user's go-ahead, then implement — applying extracted values exactly (on
   prerendered targets, run the transplant pipeline: `assets/split_landing.py` → token
   reattachment per §C2 → `assets/skeleton.py`-guided vanilla JS per §C4) — and verify with
   the screenshot comparison (see `references/cognix-case-study.md` Stage 5 for the capture
   recipe and `references/clone-build.md` §C6 for the automation quirks).
5. Close: verification pass (re-open 3–4 key surfaces, compare against the spec), fill
   remaining cross-checks (quota numbers vs plan pages), final Not-covered audit, log the
   batch.
