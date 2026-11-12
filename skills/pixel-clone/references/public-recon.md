# Phase A playbook — public-site recon (fetch-only)

Goal: a complete public-site spec from static fetches. No browser. Budget one session;
the only tool you need is HTTP fetch (curl/WebFetch) plus file tools for writing the spec.

## A1. Discovery sweep (do all of these, in order)

1. `GET /robots.txt` — record the full Allow/Disallow contract verbatim. Note granular API
   disallows (e.g. 8 `/api/` subpaths rather than a blanket `/api/*`), singular-vs-plural
   route pairs (`/agent/` AND `/agents`), and anything allowed that looks like a hidden page
   (`/export/`). These become route-probe candidates later.
2. `GET /sitemap.xml` — every URL with lastmod/changefreq/priority; note URLs the sitemap
   adds beyond the nav (alias pages, changelog posts).
3. `GET /llms.txt` and `/llms-full.txt` if present — sites that publish these hand you their
   own site map and capability descriptions for free.
4. `GET /` — extract every nav link, footer link, and inline anchor. Check whether the copy
   is server-rendered or a JS shell (if the HTML lacks the hero text, expect client-rendered
   gaps and mark them).
5. `GET /design.md`, `/branding`, `/brand-kit` if they exist — the site's own design
   documentation is ground truth for tokens (cross-check against CSS, the site may drift).
6. A HEAD check of auth pages (`/sign-in`, `/sign-up`) even when robots disallows them —
   you want status + headers, not a crawl.
7. Check the **custom 404**: fetch one nonsense path. A custom 404 that lists canonical
   links is itself a route inventory.

## A2. Fan-out crawl (large sites)

For each discovered page (cap ~12–14, priority: home, product/features, pricing, docs,
about, contact, auth), one fresh analysis pass per page that returns, typed:

- sections in DOM order, each with **verbatim copy** (headlines, subheads, CTA labels, FAQ
  Q&A, pricing numbers) + layout (columns, alignment, hierarchy) + imagery
- every user-facing feature (exact label), every CTA/form/link (exact label, target, fields),
  accordions/toggles/tabs and their behavior
- images/icons/logos with URLs + alt text; `<head>` meta (title, description, canonical,
  fonts loaded)
- design facts visible in HTML/CSS (fonts, colors, spacing patterns)
- issues (broken links, typos, inconsistencies, empty sections)

When the site is big enough to warrant a dynamic workflow, adapt
`assets/recon-workflow.template.ts`: it runs a scout → N page analysts + a design-system
analyst + a legal reviewer (all fetch-only) → a report writer → an independent fact checker →
a final editor, and publishes the spec as the primary artifact. Keep subagent names stable and
asks rebuild-grade ("quote copy verbatim") — vague asks produce feature lists, not specs.

## A3. Design-token extraction

The full extraction logic lives in `references/css-extraction.md` — read it before this
step. Summary of the flow:

- Fetch every stylesheet the key pages link (CSS custom properties, `@theme`/Tailwind
  utilities, `font-face`), plus the inline `style="--…"` re-declarations in the page
  markup itself.
- Record: color palette with **hex + usage map**, font families/weights/size-per-element
  (h1…body), spacing rhythm, container widths, breakpoints, radii, shadows, motion tokens,
  dark-mode/theming mechanics (bootstrap scripts, localStorage keys, `data-theme` values).
- Format the result as paste-ready CSS variables and/or a Tailwind `@theme` block in the spec.
- Mark anything applied only at render time as unverifiable rather than guessing.

## A4. JS-chunk mining

From the HTML, collect `<script src>` URLs, then fetch the interesting chunks and grep:

- domain nouns: plan/quota keys (including ones not rendered), prices, checkout endpoints +
  loading/failure strings, signed-in plan states ("Current plan", "Switch to…")
- theme lists, feature flags, model/tool catalogs, route names for gated pages
- Note the provenance in the spec (which chunk file, what string) — monthly-vs-annual price
  provenance is a classic gotcha.

## A5. Headers & infra

`curl -sD - -o /dev/null <url>` on 2–3 pages and record: middleware rewrites, CSP
(`connect-src` reveals realtime voice, storage, AI APIs), CSP report-uri, HSTS,
x-frame-options, permissions-policy, x-powered-by, cookies set. Also note analytics
(Sentry release id, PostHog), PWA manifest, and markdown content-negotiation
(`Accept: text/markdown`) if present.

## A6. Legal outlines

Fetch every legal page in full. For each: URL, every section heading in order, 2–3 sentence
substance summary per section. Extract user-relevant terms (accounts, payments, refunds,
liability, governing law, grievance process), cookie inventory (names, categories, consent
mechanism), data-collection practices, and gaps. The rebuild drafts its own text — the spec
captures the skeleton, not reusable prose.

## A7. Write the public spec

Follow `references/spec-format.md`. Every section cites evidence (URL + what proved the
claim). Withdraw capture-era "defects" if a later live check shows them fixed — record them
as QA guidance only, so the rebuild doesn't replicate fixes as if they were features.
