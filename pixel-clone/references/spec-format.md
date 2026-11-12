# Deliverable format & evidence rules

## Evidence rules (both documents)

1. Every claim carries its source inline: URL, fetched file (HTML/CSS/chunk) + the string
   that proved it, screenshot, or DOM snapshot. No claim from memory or assumption.
2. Mark provenance where it matters: "recovered from the pricing JS chunk", "verified live
   during the fact-check pass", "inferred from icons, labels not verified".
3. Anything not captured goes in **Not covered** with a reason: gated (plan entitlement),
   edge-blocked, client-rendered-only, would cost money/quota, needs a paid tier, single
   viewport only. "Not covered" is a feature of the spec, not an apology — it's how the
   reader tells *seen* from *suspected*.
4. Contradictions between sources (page A vs page B) are recorded, never silently resolved.
5. Quote copy verbatim **as a structural reference** with a top-of-file REPLACE marker;
   brand assets and names are never part of the reusable output.

## Public-site spec skeleton (`<domain>-rebuild-spec.md`)

```
# Rebuild Specification — <domain> ("<Name>")
Purpose + capture method + branding rule (read first)
0. How to read this document          — section table + capture-scope caveats
1. Site overview & tech stack         — observed stack; recommended rebuild stack
2. Route map & information architecture — routes, aliases, non-page endpoints,
                                         robots contract, sitemap, nav/footer IA,
                                         global overlays (toaster, consent, theme bootstrap)
3. Design system spec                 — opens with the effects-inventory table (every
                                         visual: effect, where it fires, type, trigger,
                                         exact values, source), then the CSS variables /
                                         @theme token sheet, usage map, typography,
                                         spacing/breakpoints, radii/shadows, motion,
                                         theming
4. Shared component library           — one spec per component (nav, buttons+variants,
                                         cards, forms, footer, accordion, pricing card…)
                                         each with its interaction-state matrix
5. Page blueprints (route order)      — section-by-section: verbatim copy, layout,
                                         imagery, interactions; uncaptured pages listed
6. Feature inventory (by product area)
7. Legal pages                        — outlines + substance; draft fresh text
8. Issues & gaps found on the original (numbered; fixed-during-capture items withdrawn)
9. Reuse vs replace                   — two-column table
10. Build plan                        — milestones from empty repo to launch
Appendix A. Source-fidelity notes / fact-check pass log
```

## App spec skeleton (`<domain>-app-spec.md`)

```
# Rebuild Specification — <domain> Logged-In App ("<Name>" workspace)
Companion-to line + capture method + branding rule
§A Account & session facts (evidence baseline table: tier, role, billing mode, quota state)
§B Route map (verified live / gated / blocked / dead — one table, behavior per route)
§C App shell & navigation (rail, drawer, menus with verbatim items, shortcuts, composers)
§D Feature behavior specs (one subsection per feature: models, runtime, agents,
   schedules, library, connectors, memory, notes…)
§E Settings taxonomy (every tab, verbatim labels, fields, disabled states)
§F Theming (mode × palette mechanics, keys, mobile differences)
§G Observed API / infra surface (endpoints, realtime, storage, jobs, client persistence keys)
§H Quota & checkout (enforcement UI, meters, exhaustion banner, checkout behavior + toasts)
§I Reuse vs replace (app side)
§J Build-plan delta (extends the public spec's milestones)
§K Mobile layout (viewport used; per-surface differences from desktop)
Not covered (explicit, with reasons)
```

Cross-reference: one pointer paragraph in each file's "how to read" block naming the
companion document.

## Fact-check pass (before delivering)

Re-verify the draft against the live target: quoted copy verbatim? token values match CSS?
route map complete? legal outlines match? Record: confirmed claims (short list), corrections
applied, gaps found and added. Only then publish/deliver.
