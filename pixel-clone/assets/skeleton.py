"""Print a depth-indented layout skeleton of an HTML fragment or page.

Shows tag + trimmed class + inline-style marker + short text nodes, skipping SVG
internals — read skeletons instead of minified HTML when studying a harvested page.

Usage:
  python skeleton.py <file.html>   (run with python -I)
"""
import io
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

path = sys.argv[1]
html = open(path, encoding="utf-8").read()

out = []
depth = 0
skip_to = None
for m in re.finditer(r"<[^>]+>|[^<]+", html):
    tok = m.group(0)
    if skip_to:
        if tok.startswith("</svg>"):
            skip_to = None
        continue
    if tok.startswith("<svg"):
        skip_to = "</svg>"
        cls = re.search(r'class="([^"]*)"', tok)
        out.append("  " * depth + "[svg " + " ".join((cls.group(1) if cls else "").split()[:4]) + "]")
        continue
    if tok.startswith("<"):
        tag_m = re.match(r"<(/?)([a-zA-Z0-9-]+)", tok)
        closing, tag = tag_m.group(1) == "/", tag_m.group(2)
        if closing:
            depth = max(0, depth - 1)
            continue
        if tag in ("img", "br", "hr", "input", "source", "path", "circle", "rect", "line",
                   "polyline", "polygon", "ellipse", "use", "stop"):
            cls = re.search(r'class="([^"]*)"', tok)
            src = re.search(r'src="([^"]*)"', tok)
            bits = []
            if src:
                bits.append("src=" + src.group(1))
            if cls:
                bits.append(" ".join(cls.group(1).split()[:6]))
            out.append("  " * depth + ("<%s " % tag) + " ".join(bits)[:110] + ">")
            continue
        cls = re.search(r'class="([^"]*)"', tok)
        style = re.search(r'style="([^"]*)"', tok)
        href = re.search(r'href="([^"]*)"', tok)
        bits = []
        if href:
            bits.append("href=" + href.group(1)[:40])
        if cls:
            bits.append(" ".join(cls.group(1).split())[:150])
        if style:
            bits.append("style=" + style.group(1)[:60])
        out.append("  " * depth + "<" + tag + " " + " ".join(bits))
        if not tok.endswith("/>"):
            depth += 1
    else:
        text = " ".join(tok.split())
        if text:
            out.append("  " * depth + '"' + text[:90] + '"')

print("\n".join(out))
