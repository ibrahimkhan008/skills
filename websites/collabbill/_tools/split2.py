"""Split homepage body into header / main children / footer using html.parser,
then pretty-print each into _recon/sections/. Textual processing of untrusted HTML only.
"""
import io
import os
import re
import sys
from html.parser import HTMLParser

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SRC, OUTDIR = sys.argv[1], sys.argv[2]
html = open(SRC, encoding="utf-8").read()
body = html[html.index("<body>"): html.index("</body>") + len("</body>")]

VOID = {"img", "br", "hr", "input", "source", "meta", "link", "col", "area", "base", "wbr"}


class TopSplitter(HTMLParser):
    """Collect top-level children of <body> (header / main / footer / divs)."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.depth = 0            # depth relative to body
        self.top = []             # list of (tag, attrs_text, list-of-fragments)
        self.cur = None
        self.stack = []

    def handle_starttag(self, tag, attrs):
        text = self.get_starttag_text()
        if self.depth == 1 and self.cur is None:
            self.cur = (tag, text, [])
            self.stack = []
            self.depth += 1
            return
        if self.cur is not None:
            self.stack.append(tag)
            self.cur[2].append(("raw", text))
            self.depth += 1

    def handle_startendtag(self, tag, attrs):
        text = self.get_starttag_text()
        if self.cur is not None:
            self.cur[2].append(("raw", text))

    def handle_endtag(self, tag):
        if self.cur is None:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
            self.cur[2].append(("raw", f"</{tag}>"))
            self.depth -= 1
        elif tag == self.cur[0]:
            # closing a top-level element
            self.top.append(self.cur)
            self.cur = None
            self.depth -= 1
        else:
            # mismatched (shouldn't happen in valid markup) — drop
            self.cur[2].append(("raw", f"</{tag}>"))

    def handle_data(self, data):
        if self.cur is not None:
            self.cur[2].append(("data", data))

    def handle_entityref(self, name):
        if self.cur is not None:
            self.cur[2].append(("data", f"&{name};"))

    def handle_charref(self, name):
        if self.cur is not None:
            self.cur[2].append(("data", f"&#{name};"))


class Prettifier:
    """Indent-aware pretty printer over the fragment list."""

    PRETTY_KEEP_SINGLE = re.compile(
        r"<(img|br|hr|input|source|path|circle|rect|line|polyline|polygon|ellipse|use|stop)\b"
    )

    def __init__(self, frags):
        self.frags = frags

    def render(self):
        out = []
        indent = 0

        def emit(text):
            out.append("  " * indent + text)

        for kind, text in self.frags:
            if kind == "data":
                t = text.strip()
                if t:
                    emit(t)
                continue
            # raw tag(s) — may contain multiple tags glued: split
            for tok in re.split(r"(<[^>]+>)", text):
                tok = tok.strip()
                if not tok:
                    continue
                if tok.startswith("</"):
                    indent = max(0, indent - 1)
                    emit(tok)
                elif tok.startswith("<"):
                    m = re.match(r"<([a-zA-Z][a-zA-Z0-9-]*)", tok)
                    tag = m.group(1).lower() if m else ""
                    closes = tok.endswith("/>") or tag in VOID
                    emit(tok)
                    if not closes:
                        indent += 1
                else:
                    emit(tok)
        return "\n".join(out)


if __name__ == "__main__" and len(sys.argv) >= 3:
    os.makedirs(OUTDIR, exist_ok=True)
    sp = TopSplitter()
    sp.feed(body)
    sp.close()

report = []
for idx, (tag, open_tag, frags) in enumerate(sp.top):
    attrs = open_tag[len(tag) + 1:].rstrip(">").strip()
    cid_m = re.search(r'id="([^"]*)"', attrs)
    cid = cid_m.group(1) if cid_m else ""
    h_m = re.search(r"<h[12][^>]*>\s*([^<]{2,60})", "".join(t for k, t in frags if k == "raw" or k == "data"))
    htxt = h_m.group(1).strip() if h_m else ""
    label = cid or re.sub(r"[^a-z0-9]+", "-", htxt.lower()).strip("-")[:40] or f"{tag}{idx}"
    name = "%02d-%s.html" % (idx, label)
    path = os.path.join(OUTDIR, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(Prettifier(frags).render())
    total = sum(len(t) for _, t in frags)
    report.append(f"{name:48s} {total:>7d} chars  <{tag} {attrs[:60]}")

print("\n".join(report))
