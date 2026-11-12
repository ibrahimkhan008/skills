// Stitch viewport screenshot slices into one tall PNG (full-page comparison images
// when the browser's native fullPage capture mis-renders a page — see the
// cognix case study).
// Usage: node stitch-pngs.mjs <out.png> <in1.png> <rows1> [in2.png rows2] ...
// Each input contributes `rows` rows from its top; inputs must share the width.
// Pure Node (zlib) — no image dependencies. Handles 8-bit RGB/RGBA PNGs.

import { inflateSync, deflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

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

function decodePng(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path}: not a PNG`);
  let off = 8;
  let width = 0,
    height = 0,
    bitDepth = 0,
    colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`${path}: unsupported PNG (depth ${bitDepth}, color ${colorType})`);
      }
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len;
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a),
      pb = Math.abs(p - b),
      pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const rawX = raw[rowStart + x];
      const left = x >= channels ? out[y * stride + x - channels] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const ul = y > 0 && x >= channels ? out[(y - 1) * stride + x - channels] : 0;
      let v;
      switch (filter) {
        case 0: v = rawX; break;
        case 1: v = rawX + left; break;
        case 2: v = rawX + up; break;
        case 3: v = rawX + ((left + up) >> 1); break;
        case 4: v = rawX + paeth(left, up, ul); break;
        default: throw new Error(`${path}: bad filter ${filter}`);
      }
      out[y * stride + x] = v & 0xff;
    }
  }
  return { width, height, channels, pixels: out };
}

const [outPath, ...rest] = process.argv.slice(2);
if (rest.length < 2 || rest.length % 2 !== 0) {
  console.error("usage: node stitch-pngs.mjs <out.png> <in.png> <rows> [...]");
  process.exit(1);
}

const inputs = [];
for (let i = 0; i < rest.length; i += 2) {
  inputs.push({ path: rest[i], rows: Number(rest[i + 1]) });
}

let width = 0;
const parts = [];
for (const input of inputs) {
  const img = decodePng(input.path);
  if (width === 0) width = img.width;
  if (img.width !== width) throw new Error(`${input.path}: width ${img.width} != ${width}`);
  if (input.rows > img.height) throw new Error(`${input.path}: requested ${input.rows} > ${img.height}`);
  parts.push({ img, rows: input.rows });
}
const totalHeight = parts.reduce((n, p) => n + p.rows, 0);
const outPixels = Buffer.alloc(totalHeight * width * 3);
let rowOut = 0;
for (const { img, rows } of parts) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * img.channels;
      const dst = (rowOut * width + x) * 3;
      outPixels[dst] = img.pixels[src];
      outPixels[dst + 1] = img.pixels[src + 1];
      outPixels[dst + 2] = img.pixels[src + 2];
    }
    rowOut++;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(totalHeight, 4);
ihdr[8] = 8;
ihdr[9] = 2; // RGB
const raw = Buffer.alloc((width * 3 + 1) * totalHeight);
for (let y = 0; y < totalHeight; y++) {
  raw[y * (width * 3 + 1)] = 0;
  outPixels.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(outPath, png);
console.log(`stitched ${outPath}: ${width}x${totalHeight} from ${parts.length} slices`);
