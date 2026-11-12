// Dynamic-workflow template for Phase A (public recon) on larger sites.
// Adapted from the working cognixai.in recon run. Edit SITE and the seeded entry points,
// then submit with CreateWorkflow (inline `script`), or save via SaveWorkflow with an arg.
//
// CRITICAL: every subagent here is FETCH-ONLY (WebFetch / curl). Do NOT let any subagent
// use browser automation — providers permanently refuse it from workflow subagents and the
// run dies ("Method Not Allowed"). Browser work belongs to the main session (Phase B).
//
// Topology: 1 scout -> 3 concurrent stages (N page analysts + design analyst + legal
// reviewer) -> 1 report writer -> 1 independent fact checker -> 1 final editor -> publish.

interface PageRef {
  /** Full URL of the page. */
  url: string;
  /** Page title as shown in the nav or browser tab. */
  title: string;
  /** "core", "feature", "legal" or "other". */
  category: "core" | "feature" | "legal" | "other";
  /** One line: what this page is for. */
  purpose: string;
}

interface SiteInventory {
  /** Discovered pages, deduplicated, most important first. */
  pages: PageRef[];
  /** Tech stack hints seen in the HTML: framework, fonts, analytics, hosting. */
  techStack: string[];
  /** Anything that blocked discovery: 404s, bot walls, JS-only pages. */
  notes: string[];
}

interface PageAnalysis {
  url: string;
  title: string;
  /** Every section in DOM order; description quotes the page's copy VERBATIM (headlines, subcopy, CTA labels, FAQ Q&A, pricing numbers) plus layout: columns, alignment, hierarchy, imagery. */
  sections: { name: string; description: string }[];
  /** Every user-facing feature, with its exact on-page label and description copy. */
  features: string[];
  /** Every CTA, form and link: exact label, target URL, form fields; accordions/toggles/tabs and their behavior. */
  interactions: string[];
  /** Images, illustrations, icons, logos with URL and alt text; plus <head> meta (title, description, fonts loaded). */
  assets: string[];
  /** Design facts visible in this page's HTML/CSS: fonts, colors, spacing, utility-class patterns. */
  designNotes: string[];
  /** Problems: broken links, typos, inconsistencies, empty sections. */
  issues: string[];
}

interface DesignSystem {
  colors: string[];
  typography: string[];
  spacingLayout: string[];
  components: string[];
  visualAssets: string[];
  theming: string[];
  verdict: string;
}

interface LegalAnalysis {
  documents: { name: string; url: string; outline: string; summary: string }[];
  keyTerms: string[];
  cookies: string[];
  privacy: string[];
  gaps: string[];
}

interface Synthesis {
  /** Workspace-relative path of the written rebuild spec. */
  path: string;
  highlights: { fact: string; evidence: string; severity: "low" | "medium" | "high" }[];
}

interface FactCheck {
  confirmed: string[];
  corrections: string[];
  missing: string[];
}

interface Headline {
  where: string;
  what: string;
  evidence: string;
  status: "verified" | "unconfirmed";
  severity: "low" | "medium" | "high";
}

interface FinalSummary {
  path: string;
  findings: Headline[];
}

artifact.table("pages", {
  title: "Page-by-page analysis",
  key: "url",
  columns: [
    { field: "url", label: "Page" },
    { field: "sections", label: "Sections" },
    { field: "features", label: "Features" },
    { field: "issues", label: "Issues" },
  ],
});

const SITE = "https://example.com"; // <- EDIT
const KNOWN_ENTRY_POINTS =
  "/, /about, /pricing, /docs, /contact"; // <- EDIT from your own quick recon of the site

function slugOf(url: string): string {
  const raw = url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (raw.slice(0, 40) || "page").toLowerCase();
}

const FETCH_HINT =
  "Fetch pages yourself with WebFetch, or curl via Bash (curl -sL with a browser User-Agent if a plain fetch is blocked). CRITICAL: do NOT use browser automation, the browser plugin, or node_repl in any form — the provider permanently refuses those requests and kills the run. Static HTML + CSS is enough for most sites; if the site is a JS-only shell, say so in your notes instead of guessing. Report only what you actually fetched and saw; if something cannot be seen, say so plainly. Answer in English.";

phase("Map the site structure");
const scout = agent("Site scout", {
  system:
    "You are a meticulous site cartographer. You enumerate a website's pages from real fetches (robots.txt, sitemap.xml, llms.txt, homepage HTML, nav and footer links), never from imagination. " +
    FETCH_HINT +
    " If you have no tool that can fetch a URL, escalate and say so rather than inventing a site map.",
});
const inventory = await scout.ask<SiteInventory>(
  `Enumerate every page of ${SITE}. A first recon found these entry points: ${KNOWN_ENTRY_POINTS}. Confirm those, and also fetch robots.txt, sitemap.xml and /llms.txt for anything more. Fetch the homepage HTML and follow every link in its navigation and footer. Return up to 14 distinct pages, deduplicated, most important first. Classify each page's category as "core", "feature", "legal" (terms, privacy, cookies, refund, grievance) or "other", with a one-line purpose. List tech-stack hints visible in the HTML (framework, fonts, analytics, hosting). Put anything that blocked you (404, bot wall, JS-only shell) in notes.`,
);
log(`Discovered ${inventory.pages.length} pages.`);

const toAnalyze = inventory.pages.filter((p) => p.category !== "legal").slice(0, 12);
const legalUrls = inventory.pages.filter((p) => p.category === "legal").map((p) => p.url);
log(`Blueprinting ${toAnalyze.length} pages in depth, ${legalUrls.length} legal documents separately.`);

// The three analysis stages run concurrently; the join exists because the synthesis needs every analysis.
const pagesStage = future(async () => {
  phase("Blueprint each page in depth");
  const used = new Set<string>();
  return Promise.all(
    toAnalyze.map((p) => {
      let s = slugOf(p.url);
      while (used.has(s)) s = `${s}-x`;
      used.add(s);
      const analyst = agent(`Page analyst · ${s}`, {
        system:
          "You are a senior product & UI analyst reverse-engineering a page so a developer can rebuild it from scratch. You transcribe what is really there — copy verbatim, layout, interactions, styling — never what you assume. " +
          FETCH_HINT +
          " Do not edit any workspace file.",
      });
      return analyst
        .ask<PageAnalysis>(
          `Reverse-engineer this page of ${SITE} for a from-scratch rebuild: ${p.url} (page purpose: ${p.purpose}). Fetch the raw HTML and every stylesheet it links. Return rebuild-grade detail: every section in DOM order, each with the page's copy quoted VERBATIM plus its layout and imagery; every user-facing feature with its exact label; every CTA, form and link with exact label, target and fields, plus accordions/toggles/tabs and their behavior; images/icons/logos with URLs and alt text plus the <head> meta; design facts visible in the HTML/CSS; and any issues.`,
        )
        .then((res) => {
          report(
            { url: p.url, sections: res.sections.length, features: res.features.length, issues: res.issues.length },
            "pages",
          );
          return res;
        });
    }),
  );
});

const designStage = future(async () => {
  phase("Extract the design-token sheet");
  const analyst = agent("Design system analyst", {
    system:
      "You are a design-systems engineer. You read a site's HTML and CSS bundles and extract the real tokens: colors, type scale, spacing, radii, shadows, components, theming — exact values, not impressions. " +
      FETCH_HINT +
      " Do not edit any workspace file.",
  });
  const keyPages = toAnalyze.slice(0, 4).map((p) => p.url).join(", ") || `${SITE}/`;
  return analyst.ask<DesignSystem>(
    `Extract the complete design system of ${SITE} so it can be rebuilt as a token sheet. If ${SITE}/design.md exists, fetch it first and treat it as ground truth, cross-checked against what the pages actually load. Then fetch these key pages and every CSS/font file they link: ${keyPages} — read CSS custom properties, utility-class patterns and font-face rules. Record exact values: the color palette with hex codes and where each is used; font families, weights and the full size scale; spacing rhythm, container widths and breakpoints; border radii and shadows; the shared components and their exact styling; imagery, iconography and motion; and any dark mode or theming. Where a value can only be guessed because it is applied at render time, mark it as such instead of asserting it.`,
  );
});

const legalStage = future(async () => {
  phase("Capture legal document structures");
  const reviewer = agent("Legal reviewer", {
    system:
      "You are a compliance reviewer. You read a site's legal pages in full and record their actual structure and terms, not boilerplate impressions. " +
      FETCH_HINT +
      " Do not edit any workspace file.",
  });
  const known =
    legalUrls.length > 0
      ? legalUrls.join(", ")
      : "none confirmed yet — check the footer and common paths like /privacy-policy, /terms-of-service, /cookies-policy, /refund-policy";
  return reviewer.ask<LegalAnalysis>(
    `Read every legal document on ${SITE} in full: ${known}. If any are missing, check the footer links and common paths. The goal is to recreate the document STRUCTURE (a rebuild will draft its own legal text — capture the skeleton, not reusable prose): for each document give its URL, then every section heading in order, plus a 2-3 sentence summary of each section's actual substance. Also extract the key terms that matter to a user (accounts, payments, refunds, liability, governing law, dispute/grievance process), the cookie usage (what is set, categories, consent banner or its absence), the data collection and privacy practices, and the gaps (missing policies, unclear language, compliance risks).`,
  );
});

const [pageAnalyses, design, legal] = await Promise.all([pagesStage, designStage, legalStage]);
log(
  `All analyses in: ${pageAnalyses.length} pages, design-token sheet extracted, ${legal.documents.length} legal documents captured.`,
);

phase("Write the rebuild specification");
const writer = agent("Report writer", {
  system:
    "You write decisive, well-organized build specifications in English markdown. You use only the source material you are given and never invent facts.",
});
const synthesis = await writer.ask<Synthesis>(
  `Write the complete rebuild specification for ${SITE} to the workspace file "${slugOf(SITE)}-rebuild-spec.md". Sections: 1) Site overview & tech stack; 2) Route map & information architecture (incl. the robots contract from discovery); 3) Design system spec — paste-ready tokens (CSS variables / Tailwind config); 4) Shared component library; 5) Page blueprints in route order with verbatim copy, layout, imagery, interactions; 6) Feature inventory grouped by product area; 7) Legal pages — outlines + substance, noting final legal text must be drafted fresh; 8) Issues & gaps found on the original; 9) Reuse vs replace — what can be recreated vs what must be replaced with original content (name, logo, brand assets, verbatim copy, images); 10) Build plan — milestone order from empty repo to launch. Use only the source material below — do not invent anything; keep every caveat a source stated.\n\nDISCOVERY:\n${JSON.stringify({ techStack: inventory.techStack, notes: inventory.notes })}\n\nPAGES:\n${JSON.stringify(pageAnalyses)}\n\nDESIGN SYSTEM:\n${JSON.stringify(design)}\n\nLEGAL:\n${JSON.stringify(legal)}`,
);

phase("Fact-check the spec against the live site");
const checker = agent("Fact checker", {
  system:
    "You verify written claims against primary sources by fetching them yourself. You never edit files and never accept a claim because it sounds plausible. " +
    FETCH_HINT,
});
const check = await checker.ask<FactCheck>(
  `Read the file ${synthesis.path}. Re-verify its claims about ${SITE} against the live site: fetch the pages it describes and check that quoted copy is verbatim, that design-token values match the site's CSS, that the route map is complete, and that the legal outlines match the actual documents. Return: short confirmed claims; any claim that is wrong or unverifiable together with the correction; and anything important on the site the spec missed. Do not edit any file.`,
);

phase("Apply corrections and finalize");
const finisher = agent("Final editor", {
  system:
    "You are a precise editor. You apply corrections to a markdown specification exactly, add only verified missing material, and never remove verified content.",
});
const final = await finisher.ask<FinalSummary>(
  `Apply this fact-check to the rebuild spec at ${synthesis.path} by editing the file.\n\nCORRECTIONS (fix each one in the file):\n${JSON.stringify(check.corrections)}\n\nMISSING (add each if you can verify it is real, otherwise note it as unverified):\n${JSON.stringify(check.missing)}\n\nThen return 5-8 headline findings: where each comes from (URL or spec section), the fact in one sentence, the evidence, status ("verified" if the fact checker confirmed it or you re-checked it yourself, otherwise "unconfirmed"), and severity.`,
);

await artifact.file("report", final.path, {
  title: "Site rebuild spec",
  description: `Rebuild specification for ${SITE}: routes, blueprints, tokens, features, legal outlines — fact-checked against the live site.`,
  primary: true,
});

const totalFeatures = pageAnalyses.reduce((n, a) => n + a.features.length, 0);
const totalIssues = pageAnalyses.reduce((n, a) => n + a.issues.length, 0);

return {
  conclusion: `Reverse-engineered ${SITE}: ${inventory.pages.length} pages mapped, ${pageAnalyses.length} blueprint-grade page analyses (${totalFeatures} features with verbatim copy), a design-token sheet, and ${legal.documents.length} legal document structures. Fact checker applied ${check.corrections.length} corrections and ${check.missing.length} gaps. Spec: ${final.path}.`,
  findings: final.findings,
  verified: [
    "every analyzed page was fetched live by its own analyst (HTML + linked CSS)",
    `legal document structures captured from the full texts: ${legal.documents.map((d) => d.url).join(", ") || "none found"}`,
    "the spec was re-checked against the live site by an independent fact checker",
  ],
  notCovered: [
    "pixel-exact rendered appearance — fetch-only capture; design facts come from HTML/CSS source",
    "content that only renders via JavaScript beyond what the static HTML exposed",
    "pages behind authentication",
    ...inventory.notes,
  ],
};
