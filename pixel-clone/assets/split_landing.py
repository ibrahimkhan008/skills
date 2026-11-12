"""Split a fetched page's body into per-section HTML files (clone-build C1).

Auto-descends single-wrapper chains (body -> div#root -> div.landing -> main ...)
until genuine siblings appear, then writes each top-level child WITH its own
open/close tags, pretty-printed, as NN-<label>.html in the output directory.

Usage:
  python split_landing.py <page.html> <outdir> [--into CLASS_SUBSTRING]

  --into  descend into the first element whose class contains CLASS_SUBSTRING
          (default: auto-descend while there is exactly one wrapper child)

Textual processing of downloaded HTML only; run with python -I.
"""
import io
import os
import re
import sys
from html.parser import HTMLParser

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

VOID = {"img", "br", "hr", "input", "source", "meta", "link", "col", "area", "base", "wbr"}

args = [a for a in sys.argv[1:] if a != "--into"]
into = sys.argv[sys.argv.index("--into") + 1] if "--into" in sys.argv else None
if len(args) < 2:
    sys.exit("usage: split_landing.py <page.html> <outdir> [--into CLASS_SUBSTRING]")
SRC, OUTDIR = args[0], args[1]

html = open(SRC, encoding="utf-8").read()
if "<body" in html:
    html = html[html.index("<body"): html.index("</body>") + len("</body>")]
    # parse the INSIDE of body so the body element itself isn't a wrapper level
    html = html[html.index(">") + 1: html.rindex("</body>")]


class ElemSplitter(HTMLParser):
    """Collect top-level elements of a string, keeping each element's own tags."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.elems = []  # (tag, open_text, frags, closed)
        self.cur = None
        self.stack = []

    def handle_starttag(self, tag, attrs):
        text = self.get_starttag_text()
        if self.cur is None:
            self.cur = [tag, text, []]
            self.stack = []
        else:
            self.stack.append(tag)
            self.cur[2].append(("raw", text))

    def handle_startendtag(self, tag, attrs):
        if self.cur is None:
            self.elems.append((tag, self.get_starttag_text(), [("raw", self.get_starttag_text())]))
        elif self.cur is not None:
            self.cur[2].append(("raw", self.get_starttag_text()))

    def handle_endtag(self, tag):
        if self.cur is None:
            return
        if self.stack:
            while self.stack and self.stack[-1] != tag:
                self.stack.pop()
            if self.stack:
                self.stack.pop()
            self.cur[2].append(("raw", "</%s>" % tag))
        elif tag == self.cur[0]:
            self.elems.append((self.cur[0], self.cur[1], self.cur[2]))
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
    out, indent = [], 0
    for kind, text in frags:
        if kind == "data":
            t = text.strip()
            if t:
                out.append("  " * indent + t)
            continue
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


def children_of(source):
    sp = ElemSplitter()
    sp.feed(source)
    sp.close()
    if sp.cur is not None:  # tolerate truncated input
        sp.elems.append((sp.cur[0], sp.cur[1], sp.cur[2]))
    return sp.elems


def wrapper_hit(el, needle):
    tag, open_text, _ = el
    if needle == "root" and tag == "div" and 'id="root"' in open_text:
        return True
    m = re.search(r'class="([^"]*)"', open_text)
    return bool(m and needle in m.group(1).split())


def element_source(el):
    tag, open_text, frags = el
    close = "" if open_text.rstrip().endswith("/>") else "</%s>" % tag
    return open_text + render(frags) + close


def inner_of(el):
    tag, open_text, frags = el
    return render(frags)


# ---- pick the starting point: descend single wrappers; honor --into ----
elems = children_of(html)
for _ in range(12):
    real = [e for e in elems if e[0] != "script"]
    if into:
        target = next((e for e in real if wrapper_hit(e, into)), None)
        if target is not None:
            elems = children_of(inner_of(target))
            continue
    if len(real) == 1 and real[0][0] in ("div", "body", "main"):
        elems = children_of(inner_of(real[0]))
        continue
    break

os.makedirs(OUTDIR, exist_ok=True)
report = []
for idx, (tag, open_text, frags) in enumerate(elems):
    flat = "".join(t for _, t in frags)
    cid_m = re.search(r'id="([^"]*)"', open_text)
    cid = cid_m.group(1) if cid_m else ""
    h_m = re.search(r"<h[12][^>]*>\s*([^<]{2,60})", flat)
    label = cid or re.sub(r"[^a-z0-9]+", "-", (h_m.group(1) if h_m else tag + str(idx)).lower()).strip("-")[:45] or f"{tag}{idx}"
    name = "%02d-%s.html" % (idx, label)
    with open(os.path.join(OUTDIR, name), "w", encoding="utf-8") as f:
        f.write(element_source((tag, open_text, frags)))
    report.append("%-52s %7d chars  %s" % (name, len(flat), open_text[:90]))

print("wrote %d sections into %s" % (len(report), OUTDIR))
print("\n".join(report))
