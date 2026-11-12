# collabbill.com — home page rebuild spec (clone test)

Scoped deliverable: **home page only** (`/`), public-site recon, fetch-only.
Companion app spec: **out of scope** (no logged-in walkthrough was requested).
Produced by the `pixel-clone` skill as a live test; the clone built from it
lives in `clone/` (open `clone/index.html` in a browser — no build step).

## 0. How to read

- Every claim cites evidence: a fetched artifact under `_recon/` (URL noted) or a
  rendered-page observation from the verification pass.
- The clone reuses the target's **prerendered markup** (structure, classes, copy) —
  see the reuse-vs-replace note in §9 before republishing anything.

## 1. Overview & stack (evidence: `_recon/` HTTP fetches 2026-11-12)

- Marketing site for CollabBill — "free invoicing & business management for creators".
- Static Vite build on **Vercel** (`Server: Vercel`, `X-Vercel-Cache: HIT`, hashed
  `/assets/index-*.js|css`). React bundle (`react-dom` in chunk) hydrates the
  prerendered HTML; all copy is server-rendered — fetch-only recon is sufficient.
- Tailwind CSS **v4.3.3** (built stylesheet marker), **Geist Variable** + **Inter Display**
  fonts self-hosted, Clerk image hosts in CSP (auth is on the app domain), Iconify CDN.
- Workspace app lives at `https://app.collabbill.com` (linked from every CTA); site
  publishes `/llms.txt` documenting the product for agents.
- Headers posture: CSP with strict script-src + inline hashes, HSTS preload,
  `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

## 2. Route map & IA (evidence: `_recon/robots.txt`, `sitemap.xml`, `llms.txt`)

- robots: `Allow: /` for all agents + sitemap link. No disallows, no hidden API paths.
- Sitemap (9 URLs): `/`, `/features`, `/solutions`, `/pricing`, `/faq`, `/about`,
  `/contact`, `/privacy`, `/terms`.
- `llms.txt` mirrors the sitemap and adds key facts (free ₹0, local-first storage,
  23 currencies, 15 PDF templates, no email/payments).

## 3. Design tokens (evidence: `_recon/index.css` — pasted ready)

```css
@theme {
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --font-primary: "Inter Display", "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --color-brand: #2563eb;             /* text/bg/border-brand */
  --color-charcoal-700: #343434;      /* headings on light */
  --color-charcoal-900: #202020;      /* dark CTA fill */
  --color-gray-100: #f9f9f9;  --color-gray-200: #f5f5f5;
  --color-gray-300: #eaedf1;  --color-gray-400: #d7d7d7;  --color-gray-600: #8b8b8b;
}
/* semantic scope on the page wrapper (light values; dark ones exist but the
   landing bundle forces light at hydration — JS chunk, `classList.remove('dark')`) */
.landing {
  --divide: var(--color-gray-300);   --primary: var(--color-neutral-900);
  --canvas: var(--color-neutral-400); --canvas-fill: var(--color-neutral-300);
  --dots: var(--color-gray-300);     --line: var(--color-neutral-200);
  --footer-link: #676767;            --pattern-fg: #2020201a;
}
.shadow-collabbill { box-shadow: 0 2px 3px -1px #0000001a, 0 1px 0 0 #191c2105, 0 0 0 1px #191c2114; }
```

- Type scale: h1 `text-4xl md:text-6xl lg:text-7xl font-medium tracking-tight`;
  section h2 `text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight`;
  kickers `font-mono text-sm uppercase tracking-tight text-neutral-500`.
- Dark mode is **class-based but forced off** on the landing page (React effect removes
  `.dark`; `theme-color` meta stays `#0a0a0a`).

## 4. Component library (evidence: DOM outline `_recon/home-outline.txt`)

- Fixed desktop pill header that shrinks on scroll (transition-[max-width,padding,…]
  + `ease-[cubic-bezier(0.22,1,0.36,1)]`), mobile header with hamburger.
- Reveal-on-view staged entrances (inline `opacity:0` / `translateY` / `scaleY(0)`
  start states, staggered by the React bundle).
- Hero app-dashboard mockup, invoice mockup, UPI-QR card, payment-method grid,
  bento feature grid, step tabs with progress bar, stat tiles with pressed state,
  FAQ accordion (`#faq-panel-0..6`), concentric-circle final CTA, 3-column footer.

## 5. Home page blueprint (sections in DOM order; copy verbatim in markup)

1. Skip link → fixed pill header (logo, 5 nav links, Sign in, "Try CollabBill Free")
2. Hero: badge, h1 "Get paid for every brand collaboration", subhead, 2 CTAs,
   checklist (Free forever / 15 invoice templates / 23 currencies / GST & UPI ready)
3. Dashboard mockup ("Good afternoon, Aisha", 4 KPI cards, revenue chart, recent invoices)
4. Payments strip "Get paid the way your clients pay" — UPI / PayPal / Bank transfer /
   Wise / Venmo / Cash App / Zelle / ACH
5. How it works "From first DM to final payment" — 3 steps + crossfading mockups
6. Features "Built for the business side of creating" — bento: invoice templates,
   collaboration workspace, click-to-pay, local-first, sync, shareable links
7. Who it's for "Made for independent work" — 6 cards (Influencers … Indian brands)
8. Benefits "Less paperwork, more creating" — 6 cards
9. CollabBill in numbers — invoice mockup + "Every feature is free…" + ₹0/15/23/9 tiles
10. Pricing "Free. Really." — Free plan card + BILLING/WORKSPACE checklists
11. Local-first by design — 3 cards + "Read the privacy policy"
12. FAQs — 7 questions (answers are NOT in prerendered HTML; mined from the JS chunk,
    `question:\`…\`,answer:\`…\`` pairs — recorded in the build script)
13. Final CTA "Your whole creator business, in one free workspace"
14. Footer — tagline, Product/Company/Legal columns, © 2026 CollabBill, social links

## 6. Feature inventory (user-facing, home page)

- Step tabs (aria-pressed), FAQ accordion (aria-expanded + height animation),
  stat tiles (aria-pressed + canvas decoration swap), header scroll shrink,
  mobile menu, skip link, staggered scroll reveals, hover states on tiles/cards.

## 7. Issues & gaps found (evidence: recon + live check)

- FAQ answers are client-rendered only — invisible to fetch-only crawlers (mined from
  `/assets/index-B6iGTmaa.js` instead).
- Static HTML ships `<html class="dark">` while the landing bundle forces light —
  a rebuild that trusts the static markup alone renders dark by mistake.
- Full-page stitched screenshots of the live site are unreliable (continuous
  ribbons-canvas animation keeps automation busy); viewport captures work.

## 8. Build milestones (how the clone was assembled)

1. Fetch-only recon (robots/sitemap/llms/HTML/CSS/JS chunk) → tokens + blueprint.
2. Split prerendered landing markup into per-section fragments (`_recon/sections/`).
3. Stitch fragments into `clone/index.html`; inject FAQ answers mined
   from the JS chunk; rewrite asset paths to `clone/assets/`.
4. `@theme` token block + `@custom-variant dark` + custom utilities via the Tailwind v4
   browser build; self-hosted Geist/Inter Display woff2 + logo/favicon in `assets/`.
5. `clone.js` — vanilla replacements for the React behaviors (force-light, reveals with
   IO + timer fallback, FAQ accordion, step tabs with stage crossfade, stat tiles,
   header pill shrink, mobile menu, canvas pixel-noise).
6. Verified in-browser at 1440×900 and 390×844: hero/dashboard/features/numbers/pricing/
   local-first/FAQ/CTA/footer all render; FAQ, step tabs, stat tiles, mobile menu tested
   by driving the page.

## 9. Reuse vs replace (hard rule of the skill)

The clone in `clone/` reproduces the target's **structure, layout,
tokens and behavior** and, because the request was a visual clone test, also its name,
logo and marketing copy. All of that content belongs to CollabBill: before reusing
anything beyond a local test, replace name/logo/copy/images/legal text with original
content and keep only the structural recreation. Do not deploy or publish the clone.

## 10. Not covered (with reasons)

- Other 8 public pages (features/solutions/pricing/faq/about/contact/privacy/terms):
  out of the requested scope ("just home page").
- Logged-in workspace app (`app.collabbill.com`): requires sign-in; out of scope.
- Exact original entrance-animation timings/choreography: driven by the React bundle's
  animation engine; approximated with a staggered fade-up (visual pass judged equivalent).
- Ribbons overlay canvas animation: decorative fixed-layer effect; clone leaves it blank
  (invisible) — content unaffected.
- OG/Twitter image URLs, canonical, msvalidate tags: intentionally dropped from the
  local clone's head.
