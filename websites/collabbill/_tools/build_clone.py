"""Build the collabbill.com home page clone.

Reads _recon/home.html (prerendered static markup of the original), splits the
landing wrapper's children (keeping their own open/close tags), injects FAQ
answers mined from the JS bundle, and stitches everything into
collabbill-home-clone/index.html with a token-matched Tailwind v4 head.

Textual processing of the downloaded HTML only.
"""
import io
import os
import re
import sys
from html.parser import HTMLParser

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # skill test/
RECON = os.path.join(BASE, "_recon")
OUT = os.path.join(BASE, "collabbill-home-clone")
os.makedirs(OUT, exist_ok=True)

html = open(os.path.join(RECON, "home.html"), encoding="utf-8").read()
VOID = {"img", "br", "hr", "input", "source", "meta", "link", "col", "area", "base", "wbr"}


class ElemSplitter(HTMLParser):
    """Split a string into its top-level elements, keeping each element's own tags."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.elems = []   # (tag, open_text, frags, closed)
        self.cur = None
        self.stack = []

    def handle_starttag(self, tag, attrs):
        text = self.get_starttag_text()
        if self.cur is None:
            self.cur = [tag, text, [], False]
            self.stack = []
        else:
            self.stack.append(tag)
            self.cur[2].append(("raw", text))
            self.cur[2].append(("open", tag))  # marker for close matching

    def handle_startendtag(self, tag, attrs):
        if self.cur is None:
            self.elems.append((tag, self.get_starttag_text(), [("raw", self.get_starttag_text())], True))
        else:
            self.cur[2].append(("raw", self.get_starttag_text()))

    def handle_endtag(self, tag):
        if self.cur is None:
            return
        if self.stack:
            if self.stack[-1] == tag:
                self.stack.pop()
                self.cur[2].append(("raw", "</%s>" % tag))
            else:
                # tolerate mismatch: pop until match
                while self.stack and self.stack[-1] != tag:
                    self.stack.pop()
                if self.stack:
                    self.stack.pop()
                self.cur[2].append(("raw", "</%s>" % tag))
        elif tag == self.cur[0]:
            self.elems.append((self.cur[0], self.cur[1], self.cur[2], True))
            self.cur = None
        else:
            self.cur[2].append(("raw", "</%s>" % tag))

    def handle_data(self, data):
        if self.cur is not None:
            self.cur[2].append(("data", data))

    def handle_entityref(self, name):
        if self.cur is not None:
            self.cur[2].append(("data", "&%s;" % name))

    def handle_charref(self, name):
        if self.cur is not None:
            self.cur[2].append(("data", "&#%s;" % name))


def render(frags):
    out = []
    indent = 0
    for kind, text in frags:
        if kind == "data":
            t = text.strip()
            if t:
                out.append("  " * indent + t)
            continue
        if kind == "raw":
            for tok in re.split(r"(<[^>]+>)", text):
                tok = tok.strip()
                if not tok:
                    continue
                if tok.startswith("</"):
                    indent = max(0, indent - 1)
                    out.append("  " * indent + tok)
                elif tok.startswith("<"):
                    m = re.match(r"<([a-zA-Z][a-zA-Z0-9-]*)", tok)
                    tag = m.group(1).lower() if m else ""
                    closes = tok.endswith("/>") or tag in VOID
                    out.append("  " * indent + tok)
                    if not closes:
                        indent += 1
                else:
                    out.append("  " * indent + tok)
    return "\n".join(out)


def balanced_block(s, start_idx):
    """Return the full source of the element starting at start_idx (at '<div ...')."""
    m = re.match(r"<([a-zA-Z0-9-]+)\b", s[start_idx:])
    tag = m.group(1)
    i = start_idx
    depth = 0
    for mm in re.finditer(r"<%s\b[^>]*?(/?)>|</\s*%s\s*>" % (tag, tag), s[start_idx:]):
        tok = mm.group(0)
        if tok.startswith("</"):
            depth -= 1
            if depth == 0:
                return s[start_idx:start_idx + mm.end()]
        elif mm.group(1) == "/":
            pass
        else:
            depth += 1
        i = mm.end()
    raise ValueError("unbalanced")


# ---------- 1. landing wrapper ----------
land_start = html.index('<div class="landing')
landing = balanced_block(html, land_start)
landing_inner = landing[landing.index(">") + 1: landing.rindex("</div>")]

sp = ElemSplitter()
sp.feed(landing_inner)
sp.close()
elems = sp.elems
print("landing children:", [(t, len(render(f))) for t, o, f, c in elems])

ldjson = elems[0][1] + render(elems[0][2]) + "</script>"
skip_link = elems[1][1] + render(elems[1][2]) + "</a>"
header_html = elems[2][1] + render(elems[2][2]) + "</header>"
footer_html = elems[4][1] + render(elems[4][2]) + "</footer>"

# ---------- 2. main fragments (children of <main>) ----------
main_open = elems[3][1]
main_close = "</main>"
main_frag_src = render(elems[3][2])
sp2 = ElemSplitter()
sp2.feed(main_frag_src)
sp2.close()
main_children = []
for tag, open_text, frags, closed in sp2.elems:
    main_children.append(open_text + render(frags) + ("</%s>" % tag))
print("main children:", len(main_children))

# ---------- 3. overlay (ribbons) after landing ----------
after = html[land_start + len(landing):]
ov_idx = after.find('<div aria-hidden="true" style="position:fixed')
overlay = balanced_block(after, ov_idx) if ov_idx != -1 else ""

# ---------- 4. FAQ answers (mined from the original JS bundle) ----------
FAQ_ANSWERS = [
    "Yes. CollabBill is free to use. There is no paid tier and no trial. Opening the workspace takes a quick, free sign-in.",
    "Yes. A quick, free sign-in with email or Google gets you into the workspace. Your invoices and business data themselves live in your browser, not in the account.",
    "In your browser's local storage on your current device. That copy is the one you always work on. When you're signed in, your workspace also syncs to a private cloud copy tied to your account, which you can delete anytime from Settings.",
    "Yes, when you're signed in your workspace syncs automatically. Signed out, everything stays local to that browser, and the JSON export and import backup always works.",
    "Yes. Any invoice can be shared through a link the client opens without an account. It's read-only with a PDF download, and you can expire, rotate or revoke it anytime.",
    "Yes. Add your GSTIN and PAN, use HSN/SAC codes, apply CGST + SGST or IGST, and put a UPI link and QR code on your invoices.",
    "No. CollabBill records and tracks payments, but your client pays you directly through UPI, PayPal, bank transfer or whichever method you add.",
]
main_src = "\n".join(main_children)
for i, ans in enumerate(FAQ_ANSWERS):
    pat = re.compile(
        r'(<div id="faq-panel-%d"[^>]*>\s*<div class="pr-2 pb-5 pl-2 sm:pr-0 sm:pl-0">)\s*(</div>)' % i
    )
    repl = r'\1\n          <p class="pb-5 pl-2 pr-2 text-sm leading-relaxed text-gray-600 sm:pl-0 sm:pr-0 dark:text-neutral-300">\n            %s\n          </p>\n        \2' % ans
    main_src, n = pat.subn(repl, main_src)
    if n != 1:
        print("WARN: faq panel %d injection count=%d" % (i, n))

# ---------- 5. head ----------
HEAD_CSS = """
    /* ---- fonts (served locally from assets/fonts) ---- */
    @font-face {
      font-family: "Geist Variable";
      font-style: normal;
      font-display: swap;
      font-weight: 100 900;
      src: url("assets/fonts/geist-latin-wght-normal-BgDaEnEv.woff2") format("woff2-variations");
    }
    @font-face {
      font-family: "Inter Display";
      src: url("assets/fonts/InterDisplay-Regular.woff2") format("woff2");
      font-weight: 400;
      font-display: swap;
    }
    @font-face {
      font-family: "Inter Display";
      src: url("assets/fonts/InterDisplay-Medium.woff2") format("woff2");
      font-weight: 500;
      font-display: swap;
    }
    @font-face {
      font-family: "Inter Display";
      src: url("assets/fonts/InterDisplay-SemiBold.woff2") format("woff2");
      font-weight: 600;
      font-display: swap;
    }
    @font-face {
      font-family: "Inter Display";
      src: url("assets/fonts/InterDisplay-Bold.woff2") format("woff2");
      font-weight: 700;
      font-display: swap;
    }

    @theme {
      --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
      --font-primary: "Inter Display", "Geist Variable", ui-sans-serif, system-ui, sans-serif;
      --color-brand: #2563eb;
      --color-charcoal-700: #343434;
      --color-charcoal-900: #202020;
      --color-gray-100: #f9f9f9;
      --color-gray-200: #f5f5f5;
      --color-gray-300: #eaedf1;
      --color-gray-400: #d7d7d7;
      --color-gray-600: #8b8b8b;
      /* semantic aliases (resolve against .landing scope at use site) */
      --color-divide: var(--divide);
      --color-canvas: var(--canvas);
      --color-canvas-fill: var(--canvas-fill);
      --color-dots: var(--dots);
      --color-line: var(--line);
    }

    /* the original builds with class-based dark mode; without this the v4
       default prefers-color-scheme media query leaks dark: styles */
    @custom-variant dark (&:where(.dark, .dark *));

    /* ---- semantic tokens (the original ships dark class but its landing
       bundle forces light mode at hydration; the clone does the same) ---- */
    .landing {
      --divide: var(--color-gray-300);
      --primary: var(--color-neutral-900);
      --canvas: var(--color-neutral-400);
      --canvas-fill: var(--color-neutral-300);
      --dots: var(--color-gray-300);
      --line: var(--color-neutral-200);
      --footer-link: #676767;
      --pattern-fg: #2020201a;
      color-scheme: light;
    }

    /* ---- custom utilities from the original built stylesheet ---- */
    .bg-divide { background-color: var(--divide); }
    .border-divide { border-color: var(--divide); }
    .divide-divide > :not(:last-child) { border-color: var(--divide); }
    .bg-canvas { background-color: var(--canvas); }
    .bg-canvas-fill { background-color: var(--canvas-fill); }
    .text-primary { color: var(--primary); }
    .text-footer-link { color: var(--footer-link); }
    .shadow-collabbill {
      box-shadow: 0px 2px 3px -1px #0000001a, 0px 1px 0px 0px #191c2105,
        0px 0px 0px 1px #191c2114;
    }

    /* ---- clone interaction helpers ---- */
    .reveal-ready {
      transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
        filter 0.55s cubic-bezier(0.22, 1, 0.36, 1),
        width 1.1s cubic-bezier(0.22, 1, 0.36, 1);
      will-change: opacity, transform;
    }
    .header-pill.is-scrolled {
      max-width: 52rem;
      margin-top: 0.75rem;
      border-radius: 1rem;
      background-color: rgb(255 255 255 / 0.85);
      backdrop-filter: blur(10px);
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
      box-shadow: 0px 2px 3px -1px #0000001a, 0px 1px 0px 0px #191c2105,
        0px 0px 0px 1px #191c2114;
    }
    .clone-mobile-menu {
      position: fixed;
      top: 3.75rem;
      left: 0.75rem;
      right: 0.75rem;
      z-index: 60;
      border-radius: 0.9rem;
      background: #fff;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
    }
    .clone-mobile-menu a {
      padding: 0.65rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-neutral-900);
      border-radius: 0.5rem;
    }
    .clone-mobile-menu a:hover { background: var(--color-gray-100); }
    .clone-mobile-menu .menu-cta {
      margin-top: 0.5rem;
      background: var(--color-charcoal-900);
      color: #fff;
      text-align: center;
      border-radius: 0.75rem;
    }
"""

INDEX_HEAD = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CollabBill — free invoicing &amp; business management for creators</title>
    <meta name="description" content="CollabBill is a free business management workspace for creators, influencers, and freelancers — create, manage, and send professional invoices for brand collaborations in your browser." />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="CollabBill" />
    <meta property="og:title" content="CollabBill — free invoicing &amp; business management for creators" />
    <meta property="og:description" content="CollabBill is a free business management workspace for creators, influencers, and freelancers — create, manage, and send professional invoices for brand collaborations in your browser." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="CollabBill — free invoicing &amp; business management for creators" />
    <meta name="twitter:description" content="CollabBill is a free business management workspace for creators, influencers, and freelancers — create, manage, and send professional invoices for brand collaborations in your browser." />
    <meta name="theme-color" content="#0a0a0a" />
    <link rel="icon" type="image/png" href="assets/favicon.png" />
    <link rel="apple-touch-icon" href="assets/favicon.png" />
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <style type="text/tailwindcss">%(css)s</style>
    <script src="clone.js" defer></script>
  </head>
""" % {"css": HEAD_CSS}

# ---------- 6. assemble ----------
# rewrite absolute asset paths to the local assets/ folder
asset_re = re.compile(r'(src=")/(logo-512\.png|favicon\.png)"')
main_src = asset_re.sub(r'\1assets/\2"', main_src)
header_html = asset_re.sub(r'\1assets/\2"', header_html)
footer_html = asset_re.sub(r'\1assets/\2"', footer_html)

body = "\n".join([
    "<body>",
    '  <div class="landing font-primary min-h-svh bg-white text-neutral-900 antialiased">',
    "    " + ldjson.strip(),
    "    " + skip_link.strip(),
    "    " + header_html.strip(),
    "    " + main_open,
    main_src,
    "    " + main_close,
    "    " + footer_html.strip(),
    "  </div>",
    "  " + overlay.strip(),
    "</body>",
])

doc = INDEX_HEAD + body + "\n</html>\n"
with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
    f.write(doc)
print("wrote index.html:", len(doc), "bytes")
