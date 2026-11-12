# Case study — how the cognixai.in rebuild was made end-to-end

The worked example this skill was distilled from. Read it to see the phases in practice and
the judgment calls; adapt the shape, not the specifics, to a new target.

## Stage 1 — Public recon → `cognixai-rebuild-spec.md`

- Dynamic workflow (fetch-only subagents): site scout → 12 page analysts + design-system
  analyst + legal reviewer (concurrent futures) → report writer → **independent fact
  checker** → final editor. The fact checker re-fetched pages and withdrew three
  "defects" that were already fixed on the live site — specs must reflect the live target,
  not the first capture.
- Deliverable: §0–§10 + Appendix A (how-to-read table, capture caveats, tech stack, route
  map + robots contract, token sheet §3, component library §4, page blueprints §5 with
  verbatim copy, feature inventory §6, legal outlines §7, issues §8, reuse-vs-replace §9,
  build milestones M0–M10 §10).

## Stage 2 — App walkthrough → `cognixai-app-spec.md`

- Main-session browser only (workflow subagents are fetch-only — the provider permanently
  refuses browser calls from them). User completed OAuth + Turnstile; the agent drove
  everything else: shell/menus/theme lists, model pickers, one real chat thread, the `@`
  tool-catalog dialog, schedules, MCP, settings (7 tabs), billing/checkout attempt (no
  payment — the failure toast on an admin-assigned tier WAS the finding), behavioral route
  probing (gated `/workflow` vs edge-blocked `/admin` vs real 404s), JS-chunk mining for
  quota maps and checkout strings, and a 390×844 mobile pass.
- Deliverable: §A–§K (account facts, route map with behavior per route, shell, feature
  behaviors, settings taxonomy, theming, API surface, quota/checkout, mobile) + explicit
  Not-covered list.

## Stage 3 — Explain first, then scaffold

**The gate: before writing any code, one message explains the build.** For Cognix that
message covered: the token sheet going into `globals.css` (§3.1 `:root` + §3.2 `@theme`),
the component list (§4 primitives: Button/Eyebrow/AccentSpan/Reveal/DitherCanvas), the
section-by-section homepage build order (§5.1), and the **asset policy** (below). Only
after the user's go-ahead did implementation start.

- Scaffold: `create-next-app` was killed by the environment → hand-scaffold (package.json,
  configs, app files, one `npm install`). Stack per spec §1.2.
- Tokens: the extracted §3.1/§3.2 blocks went into `globals.css` **unchanged** — swapped
  naming kept (`--ink` = light ground) so blueprint class strings port literally; motion
  keyframes + the reveal variable family (`--rise*`) shipped with a `.js`-class gate so
  no-JS visitors see content (fixing the original's §8 defect).
- Components: one file per §4 primitive, matching the extracted variant token systems
  exactly (button `--surface-*` + `::before`/`::after` layers, tray/card shadow stacks).

## Stage 4 — Asset policy (never copy brand assets)

- Dither artwork: **procedurally generated** — a pure-Node script writes Bayer-8×8
  grayscale PNGs (zlib + hand-rolled CRC/PNG chunks) in the documented dither style
  (ink #3C3C3C @ 37%, 2px dots) for hero/footer/CTA/map/plan banners.
- Logo: an original geometric mark at the same size/position. Partner logos: grayscale
  typographic placeholders at the captured tile sizes. Model-lab marks: letter chips.
- Copy: verbatim from the spec for a **local fidelity comparison only** — a shipped rebuild
  runs the REPLACE pass (name, logo, images, marketing copy, legal text).

## Stage 5 — Clone the flagship page, verify visually

- Homepage built section-by-section from §5.1 (hero → partners → features → workflow
  canvas → model map → agent tabs → catalog → pricing tray → FAQ → CTA → footer),
  matching the original's SSR state (it server-renders only the Anthropic catalog panel and
  agent tab 0 — the clone matched that, with other tabs as titled placeholders).
- Verification: `tsc` + eslint clean, SSR HTML greps prove every section rendered, then a
  **screenshot comparison**: original vs clone, hero (with chrome) + full page.
- Capture recipe (the in-app browser's fullPage/clip mis-renders these landings — tiles the
  hero; tall clips hang): viewport slices at 1280×2160 with injected capture-fix CSS
  (`.min-h-svh{min-height:720px!important}`, kill animations, force inline `opacity:0`
  reveals visible, hide fixed chrome), scrollTo offsets with 500ms waits, then stitch the
  slices offline (`assets/stitch-pngs.mjs` — pure-Node PNG decode/stack/encode).
- README: side-by-side hero + full-page tables + a **known deltas** list (placeholder art,
  SSR-state matching, hidden fixed chrome) so the comparison is honest about what differs
  and why.

## Rules this case study proves

1. Fetch-only gets you tokens, copy, and behavior; the browser is for login-gated truth.
2. The fact-check pass is not optional — the live site had already fixed bugs the capture
   found, and the spec had to reflect that.
3. Extracted values are applied **one-to-one** into code; judgment is spent on assets and
   branding, not on "improving" measurements.
4. Explain the build before code; keep the explanation as the README's spine afterwards.
5. Compare screenshots at matched viewports and document deltas — never claim pixel parity
   you did not measure.
