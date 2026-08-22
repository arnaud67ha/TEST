// Generates simple flat-color PNG app icons (no external image deps).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  const ihdr = chunk('IHDR', ihdrData);
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = chunk('IDAT', deflateSync(raw));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

function hex(c) {
  const n = parseInt(c.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b, a]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };
  const bg = hex('#1b1240');
  const bg2 = hex('#2a1a63');
  const amber = hex('#f5a623');
  const amberDark = hex('#c97f12');
  const dark = hex('#1b1240');

  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inCorner =
        (x < radius && y < radius && dist(x, y, radius, radius) > radius) ||
        (x > size - radius && y < radius && dist(x, y, size - radius, radius) > radius) ||
        (x < radius && y > size - radius && dist(x, y, radius, size - radius) > radius) ||
        (x > size - radius && y > size - radius && dist(x, y, size - radius, size - radius) > radius);
      if (inCorner) continue;
      // vertical gradient background
      const t = y / size;
      const r = Math.round(bg[0] + (bg2[0] - bg[0]) * t);
      const g = Math.round(bg[1] + (bg2[1] - bg[1]) * t);
      const b = Math.round(bg[2] + (bg2[2] - bg[2]) * t);
      set(x, y, [r, g, b, 255]);
    }
  }

  function dist(x, y, cx, cy) {
    return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  }
  function fillRect(x0, y0, x1, y1, color) {
    for (let y = Math.max(0, Math.round(y0)); y < Math.min(size, Math.round(y1)); y++) {
      for (let x = Math.max(0, Math.round(x0)); x < Math.min(size, Math.round(x1)); x++) set(x, y, color);
    }
  }
  function fillTriangle(x0, y0, x1, y1, x2, y2, color) {
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxX = Math.min(size, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxY = Math.min(size, Math.ceil(Math.max(y0, y1, y2)));
    const sign = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const d1 = sign(x, y, x0, y0, x1, y1);
        const d2 = sign(x, y, x1, y1, x2, y2);
        const d3 = sign(x, y, x2, y2, x0, y0);
        const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
        const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(hasNeg && hasPos)) set(x, y, color);
      }
    }
  }

  const cx = size / 2;
  const bodyW = size * 0.3;
  const bodyH = size * 0.32;
  const bodyTop = size * 0.5;
  const bodyBottom = size * 0.84;

  // side turrets
  fillRect(cx - bodyW * 0.75 - size * 0.06, bodyTop + size * 0.02, cx - bodyW * 0.75 + size * 0.1, bodyBottom, amberDark);
  fillRect(cx + bodyW * 0.75 - size * 0.04, bodyTop + size * 0.02, cx + bodyW * 0.75 + size * 0.12, bodyBottom, amberDark);

  // main tower body
  fillRect(cx - bodyW / 2, bodyTop, cx + bodyW / 2, bodyBottom, amber);

  // roof
  fillTriangle(cx - bodyW * 0.65, bodyTop + size * 0.02, cx + bodyW * 0.65, bodyTop + size * 0.02, cx, bodyTop - size * 0.22, amberDark);

  // window/door accent
  fillRect(cx - size * 0.045, bodyTop + size * 0.14, cx + size * 0.045, bodyTop + size * 0.24, dark);
  fillRect(cx - size * 0.06, bodyBottom - size * 0.12, cx + size * 0.06, bodyBottom, dark);

  return buf;
}

for (const size of [512, 192, 180]) {
  const png = encodePNG(size, size, drawIcon(size));
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  writeFileSync(join(outDir, name), png);
  console.log('wrote', name);
}
