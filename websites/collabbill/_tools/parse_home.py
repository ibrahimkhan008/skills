"""DOM-order outline of the collabbill.com homepage: nav, sections, headings, CTAs, images, footer."""
import io
import re
import sys
from html.parser import HTMLParser

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
PATH = sys.argv[1]

class Outline(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.out = []
        self.cur_text_tag = None
        self.text_buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("h1", "h2", "h3", "h4"):
            self.out.append(("%sHeading %s" % ("  " * self.depth, tag), (a.get("class") or "")[:120]))
            self.cur_text_tag = tag
            self.text_buf = []
        elif tag == "p":
            self.cur_text_tag = "p"
            self.text_buf = []
        elif tag == "section":
            self.out.append(("%sSECTION" % ("  " * self.depth), (a.get("class") or "")[:160], a.get("id") or ""))
        elif tag == "header":
            self.out.append(("%sHEADER" % ("  " * self.depth), (a.get("class") or "")[:160]))
        elif tag == "footer":
            self.out.append(("%sFOOTER" % ("  " * self.depth), (a.get("class") or "")[:160]))
        elif tag == "nav":
            self.out.append(("%sNAV" % ("  " * self.depth), (a.get("class") or "")[:160]))
        elif tag == "a":
            txt_hint = ""
            self.out.append(("%sA href=%s" % ("  " * self.depth, a.get("href")), (a.get("class") or "")[:100]))
        elif tag == "button":
            self.out.append(("%sBUTTON" % ("  " * self.depth), (a.get("class") or "")[:100]))
            self.cur_text_tag = "button"
            self.text_buf = []
        elif tag == "img":
            self.out.append(("%sIMG src=%s alt=%r" % ("  " * self.depth, a.get("src"), a.get("alt")), (a.get("class") or "")[:80]))
        elif tag == "svg":
            pass  # too noisy
        self.depth += 1

    def handle_endtag(self, tag):
        self.depth = max(0, self.depth - 1)
        if self.cur_text_tag == tag:
            text = " ".join("".join(self.text_buf).split())
            if text:
                last = self.out[-1][0] if self.out else ""
                self.out.append(("%sTEXT: %s" % ("  " * self.depth, text[:220]), ""))
            self.cur_text_tag = None
            self.text_buf = []

    def handle_data(self, data):
        if self.cur_text_tag:
            self.text_buf.append(data)

p = Outline()
with open(PATH, encoding="utf-8") as f:
    p.feed(f.read())

# Inline <style> blocks
with open(PATH, encoding="utf-8") as f:
    html = f.read()
for m in re.findall(r"<style[^>]*>(.*?)</style>", html, re.S):
    print("=" * 20, "INLINE STYLE BLOCK", "=" * 20)
    print(m.strip()[:3000])

print("=" * 20, "DOM OUTLINE", "=" * 20)
for row in p.out:
    print(" | ".join(x for x in row if x))
