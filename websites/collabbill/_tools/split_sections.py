"""Split the homepage body into per-section pretty-printed HTML files.

Works on the raw downloaded HTML (untrusted input, parsed textually only).
Output: _recon/sections/NN-name.html
"""
import io
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SRC, OUTDIR = sys.argv[1], sys.argv[2]

html = open(SRC, encoding="utf-8").read()

body = html[html.index("<body>"): html.index("</body>") + len("</body>")]

# Re-add head bits we care about (theme meta etc. handled separately in notes)

# Top-level structure: body > header, main#main-content, footer
# main contains the sections. Split main's children by top-level <div> or <section>.
main = body[body.index("<main"): body.index("</main>")]
inner = main[main.index(">") + 1:]

# Walk and split at top-level opening tags
tokens = re.split(r"(<(?:div|section|header|footer|nav)\b)", inner)
# Rebuild children list with positions
children = []
pos = 0
while pos < len(inner):
    m = re.match(r"\s*<(div|section|header|footer|nav)\b", inner[pos:])
    if not m:
        nxt = inner.find("<", pos + 1)
        if nxt == -1:
            break
        pos = nxt
        continue
    tag = m.group(1)
    start = pos + (m.start() if inner[pos:m.end()].lstrip() else 0)
    start = pos + m.start() + inner[pos:m.end()].index("<")
    # find matching close accounting for nesting of same tag
    depth = 0
    i = start
    open_re = re.compile(r"<(%s)\b[^>]*?(/?)>" % tag)
    while i < len(inner):
        m2 = open_re.search(inner, i)
        if not m2:
            break
        if m2.group(2) == "/":
            i = m2.end()
            continue
        depth += 1
        # find its close
        close_pat = re.compile(r"</\s*%s\s*>" % tag)
        mc = close_pat.search(inner, m2.end())
        # nested opens of same tag between? handle by scanning
        j = m2.end()
        d = 1
        while d > 0:
            n1 = re.search(r"<%s\b" % tag, inner[j:mc.start()] and inner or inner, re.S)
            # simpler: find next open or close of this tag
            n_open = re.search(r"<%s\b" % tag, inner[j:])
            n_close = re.search(r"</\s*%s\s*>" % tag, inner[j:])
            if n_open and n_open.start() < n_close.start():
                d += 1
                j = j + n_open.start() + 1
            else:
                d -= 1
                if d == 0:
                    end = j + n_close.end()
                    i = end
                    break
                j = j + n_close.end()
        if d == 0:
            continue
    children.append(inner[start:end])
    pos = end

import os
os.makedirs(OUTDIR, exist_ok=True)

def pretty(s):
    # naive indent pretty printer that respects tags
    out = []
    indent = 0
    for tok in re.split(r"(<[^>]+>)", s):
        tok = tok.strip()
        if not tok:
            continue
        if tok.startswith("</"):
            indent = max(0, indent - 1)
            out.append("  " * indent + tok)
        elif tok.startswith("<") and not tok.startswith("<!") and not re.match(r"<(img|br|hr|input|source|path|circle|rect|line|polyline|polygon|ellipse|use|stop|defs|clipPath|mask|filter|feFlood|feColorMatrix|feOffset|feGaussianBlur|feComposite|feBlend|feMerge|feMergeNode|linearGradient|radialGradient)\b", tok) and not tok.endswith("/>"):
            out.append("  " * indent + tok)
            indent += 1
        else:
            out.append("  " * indent + tok)
    return "\n".join(out)

names = []
for idx, child in enumerate(children):
    m = re.search(r'<(div|section|header|footer|nav)\b([^>]*)>', child)
    attrs = m.group(2) if m else ""
    cid = ""
    im = re.search(r'id="([^"]*)"', attrs)
    if im:
        cid = im.group(1)
    cm = re.search(r'class="([^"]*)"', attrs)
    cls = (cm.group(1)[:60] if cm else "")
    # detect a heading or kicker inside for naming
    h = re.search(r"<h[12][^>]*>([^<]{0,60})", child)
    name_bits = []
    if cid:
        name_bits.append(cid)
    if h:
        name_bits.append(re.sub(r"[^a-z0-9]+", "-", h.group(1).lower()).strip("-")[:40])
    if not name_bits:
        name_bits.append(re.sub(r"[^a-z0-9]+", "-", cls.lower()).strip("-")[:40] or "block")
    name = "%02d-%s.html" % (idx, name_bits[0] if not h else name_bits[1] if name_bits[0] == "" else name_bits[-1])
    with open(os.path.join(OUTDIR, name), "w", encoding="utf-8") as f:
        f.write(pretty(child))
    names.append((name, len(child), cls, cid, h.group(1).strip() if h else ""))

for n, size, cls, cid, h in names:
    print(f"{n:55s} {size:>7d}  id={cid or '-':12s} h={h!r} cls={cls}")
