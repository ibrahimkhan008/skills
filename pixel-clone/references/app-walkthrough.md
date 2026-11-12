# Phase B playbook — logged-in app walkthrough (browser, main session only)

Goal: specify the authenticated product — shell, runtime, settings, billing, quota flows —
with the same evidence discipline as Phase A. **Browser work happens in the main session.**
Dynamic-workflow subagents must never touch the browser (providers permanently refuse it and
the run dies — see SKILL.md).

## B0. Session setup

1. Load the browser-control skill (control-browser). Probe feasibility by opening the target
   site; if browser control is refused, stop and tell the user (fallback: extend Phase A's
   chunk mining instead).
2. Agree the login method once: the user completes OAuth/CAPTCHA in the visible browser —
   you never type credentials into an auth form unless the user explicitly hands them to you,
   never solve or bypass CAPTCHAs, never pay. While the user logs in, verify the pre-auth
   page (auth card layout, providers, gating logic) — it's a free blueprint capture.
3. After login: confirm session (account menu renders), record the post-login landing route
   and any first-run/onboarding flow.

## B1. Navigation inventory (before touching any page)

- Snapshot the collapsed + expanded shell (rail, top bar, drawer). Record accessible names —
  they differ between desktop and mobile ("Toggle Sidebar" vs "Open navigation menu").
- Open every menu: More/utility menus, account menu (and its submenus — Theme, Language,
  Archive are often submenus, not pages), help. These give you the full nav map + verbatim
  labels + the theme/locale/shortcut lists.
- Composer/toolbars: enumerate buttons with their accessible names + testids
  (`evaluate` over `main button[aria-label], main [data-testid]` beats hovering icons).

## B2. Route map probing (behavioral, bounded)

From robots.txt entries + menu facts, probe candidates with **same-origin `fetch()` in page
context** (status + final URL after redirects), one attempt per candidate:

- 200 but redirected to `/` → route exists, client-gated (find the entitlement in pricing
  copy; record as gated)
- hard fetch failure → edge/middleware-blocked (usually admin)
- real 404 → dead link (record the custom 404 too)
- 5xx → exists but broken (record)

Never iterate guessed URL variants beyond the first focused attempt per candidate.

## B3. Surface walkthrough (capture checklist per surface)

For every reachable surface: exact URL, section-by-section layout, verbatim labels/copy,
interactions, loading/empty/error states, and a screenshot when layout matters. Priority
order for a chat/agent product:

1. Home/workspace + mode switchers (Chat vs Agent composer differences: default model,
   footer disclaimers, hint chips)
2. Model picker + catalogs (response modes, suggestions; image-model catalogs often live in
   settings)
3. One real thread: send a cheap message; capture reasoning toggles, message actions
   (testids), streaming states ("Thinking Ns", Stop button), thread header
4. Composer popovers: attach menu, slash commands, `@` mentions (the `@` dialog typically
   dumps the entire built-in tool catalog — highest-value capture in the whole walkthrough)
5. Customization hub (skills/agents/instructions/memory/notes tabs + marketplace view)
6. Schedules (stats, templates, create dialog: mode/frequency/time/timezone)
7. Library/storage (quota meter — cross-check against the chunk quota map)
8. Connectors/MCP (list, marketplace, manual-create form with JSON config placeholder)
9. Settings (own shell; walk every tab: profile, preferences, models, plans, usage, billing,
   account) — this is where plan state and role live
10. An existing agent-run/monitor page if one exists in history (free capture of the most
    complex UI — do NOT launch a new run if it costs quota)
11. Billing/checkout: open the upgrade flow, record the request behavior and any toast.
    **Abandon before payment.** If the tier is admin-assigned, the checkout failure toast is
    the finding; mark the hosted checkout page not-covered.
12. Quota exhaustion UI: if the account has hit a limit, capture the banner + disabled
    composer verbatim.

## B4. Mobile pass (do it — IAB supports setViewportSize)

390×844: home shell, drawer, one thread. Look for: rail→top-bar swap, renamed buttons,
omitted rows (disclaimers, hints), collapsed-by-default reasoning, fixed-bottom composer,
draft persistence across navigation. Restore the desktop viewport afterward.

## B5. Cross-checks & close

- Reconcile every number: storage meter vs quota map, prices vs chunks vs legal text; record
  contradictions instead of silently resolving them.
- Re-visit 3–4 key surfaces and compare against your notes before writing the spec.
- Write `<domain>-app-spec.md` per `references/spec-format.md`; add the companion pointer to
  the public spec; append the context.md entry if the project uses one.
