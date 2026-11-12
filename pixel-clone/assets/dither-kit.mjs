// Dither-kit — procedural Bayer-8×8 dither art generator (pure Node, no deps).
// Reproduces the "dithered monochrome" aesthetic in the documented style:
// 2px dots, ink #3C3C3C at ~37% coverage, gamma 1.4 (values cited from the
// target's own design docs — calibrate per target before shipping a clone).
//
// Usage: node dither-kit.mjs <out.png> <width> <height> <style> [seed]
//   styles: ridge   — alpine silhouette rising left→right (hero backdrops)
//           band    — dense full-width ridge (footer watermark bands)
//           card    — mountains low, fading to paper at the top (CTA cards)
//           field   — sparse texture, brighter toward edges (map backdrops)
//           banner  — compact ridge (small card banners, e.g. plan cards)
//
// These are ORIGINAL procedural textures — never copies of the target's PNGs
// (brand assets). Regenerate at the exact dimensions the layout consumes.

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function writePng(path, width, height, gray) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) raw[y * (width + 1) + 1 + x] = gray[y * width + x];
  }
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
  console.log(`wrote ${path} ${width}x${height} (${style})`);
}

const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

const INK_LEVEL = Math.round(255 * (1 - 0.37 * 0.6)); // ink #3C3C3C at partial strength
const DOT = 2;

// density(x, y, w, h) → luminance 0..1 (lower = more ink)
function dither(width, height, density) {
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y += DOT) {
    for (let x = 0; x < width; x += DOT) {
      const lum = Math.min(1, Math.max(0, density(x, y, width, height)));
      const t = BAYER[(y / DOT) % 8][(x / DOT) % 8] / 64;
      const inked = lum < t;
      const v = inked ? INK_LEVEL : 255;
      for (let dy = 0; dy < DOT && y + dy < height; dy++) {
        for (let dx = 0; dx < DOT && x + dx < width; dx++) {
          gray[(y + dy) * width + (x + dx)] = v;
        }
      }
    }
  }
  return gray;
}

function ridge(x, w, seed) {
  const s = seed ?? 0;
  return (
    0.62 +
    0.1 * Math.sin((x / w) * Math.PI * 3 + s) +
    0.06 * Math.sin((x / w) * Math.PI * 7 + s * 2.3) +
    0.04 * Math.sin((x / w) * Math.PI * 13 + s * 4.1)
  );
}
function hash2(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

const [outPath, wArg, hArg, styleArg, seedArg] = process.argv.slice(2);
if (!outPath || !wArg || !hArg || !styleArg) {
  console.error("usage: node dither-kit.mjs <out.png> <width> <height> <ridge|band|card|field|banner> [seed]");
  process.exit(1);
}
const width = Number(wArg);
const height = Number(hArg);
const style = styleArg;
const seed = seedArg ? Number(seedArg) : 1.7;

let density;
if (style === "ridge") {
  // Alpine silhouette rising toward the left, fading toward the top-right.
  density = (x, y, w, h) => {
    const r = ridge(x, w, seed) * h;
    let ink = y > r ? 0.32 + (0.25 * (y - r)) / (h - r) : 0.78;
    ink += 0.08 * hash2(x, y);
    const fade = 0.35 + 0.65 * Math.min(1, (x / w) * 1.15 + (1 - y / h) * 0.55);
    return Math.min(1, ink * fade + 0.25 * (1 - fade));
  };
} else if (style === "band") {
  // Dense full-width ridge band (footer watermark).
  density = (x, y, w, h) => {
    const r = ridge(x, w, seed * 2.4 + 1) * h * 0.9;
    let ink = y > r ? 0.3 : 0.72;
    return ink + 0.07 * hash2(x, y);
  };
} else if (style === "card") {
  // Mountains low, fading to paper at the top (CTA backdrops).
  density = (x, y, w, h) => {
    const r = (0.78 + 0.08 * Math.sin((x / w) * Math.PI * 4 + seed)) * h;
    let ink = y > r ? 0.35 + (0.2 * (y - r)) / (h - r) : 0.85;
    ink += 0.06 * hash2(x, y);
    const lift = Math.min(1, y / (h * 0.55));
    return ink * lift + (1 - lift);
  };
} else if (style === "field") {
  // Sparse texture, brighter toward the edges (map backdrops).
  density = (x, y, w, h) => {
    const nx = (x / w - 0.5) * 2;
    const ny = (y / h - 0.5) * 2;
    const vign = Math.min(1, Math.sqrt(nx * nx + ny * ny));
    const blobs =
      0.16 * Math.sin(x / 90 + Math.sin(y / 70) * 2.1) * Math.cos(y / 120 + Math.sin(x / 140));
    return 0.62 - blobs + 0.1 * hash2(x, y) + vign * 0.45;
  };
} else if (style === "banner") {
  // Compact ridge for small banners (e.g. 480×160 plan-card tops).
  density = (x, y, w, h) => {
    const r = ridge(x, w, seed * 2.7 + 0.6) * h;
    let ink = y > r ? 0.34 : 0.74;
    return ink + 0.08 * hash2(x, y);
  };
} else {
  console.error(`unknown style: ${style}`);
  process.exit(1);
}

writePng(outPath, width, height, dither(width, height, density));
