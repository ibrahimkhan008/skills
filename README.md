# PixelClone

Reusable [Agent Skills](https://agentskills.io) for AI coding agents — installable with the
[skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add ibrahimkhan008/skills
```

Reverse-engineer any website into a fact-checked rebuild spec — and, when asked, a working
1:1 pixel replica. Fetch-only recon, JS-chunk mining, design-token extraction,
micro-interaction capture (keyframes, easings, hover states, reveal families), a
logged-in app walkthrough (optional), and a markup-transplant clone pipeline with an
original-vs-clone screenshot verification.

## Layout

```
skills/
├── pixel-clone/           PixelClone — the skill (install this)
│   ├── SKILL.md               main workflow the agent follows
│   ├── references/            playbooks the agent loads only when needed
│   │   ├── public-recon.md        fetch order, crawl discipline, JS-chunk mining
│   │   ├── css-extraction.md      design-token extraction logic + paste-ready output
│   │   ├── micro-interactions.md  motion/hover/reveal extraction + 1:1 motion rules
│   │   ├── clone-build.md         the 1:1 replica pipeline (transplant, tokens, verify)
│   │   ├── app-walkthrough.md     logged-in app capture (login is the user's hands)
│   │   ├── cognix-case-study.md   complete worked example
│   │   └── spec-format.md         deliverable skeletons + evidence rules
│   └── assets/                helper scripts the agent runs
│       ├── split_landing.py       split a fetched page into per-section HTML
│       ├── skeleton.py            tag+class layout outline of any fragment
│       ├── stitch-pngs.mjs        stitch viewport screenshots into a full-page PNG
│       └── recon-workflow.template.ts   fan-out recon over large sites
├── websites/                  sites built with the skill (local test outputs)
│   └── collabbill/        CollabBill — home page 1:1 replica
│       ├── clone/             the replica — open clone/index.html in a browser
│       ├── rebuild-spec.md    evidence-first rebuild spec
│       ├── _recon/            fetched artifacts (robots, sitemap, CSS, JS chunks, sections)
│       └── _tools/            analysis + build scripts used for this clone
└── assets/                    README images
```

## Install just this skill

```bash
npx skills add ibrahimkhan008/skills --skill pixel-clone
```

## Ethics rule (baked into the skill)

Recreate structure, layout, tokens, and behavior; replace the target's name, logo, brand
assets, verbatim marketing copy, images, and legal text with original content — except an
explicitly requested replica kept strictly local (stated in the site's README, never
deployed). The `websites/` entries are such local test replicas, published here for
demonstration only: all third-party branding and copy they contain belongs to the
respective site owners — do not deploy them or reuse their assets.

## License

MIT — see [LICENSE](LICENSE).
