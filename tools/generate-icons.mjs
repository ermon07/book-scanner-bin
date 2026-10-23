import { mkdirSync, writeFileSync } from "node:fs";
import zlib from "node:zlib";

const OUT = new URL("../icons/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const GREEN = [30, 71, 56];
const CREAM = [243, 238, 227];
const BRASS = [216, 187, 138];
const SS = 3;

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const name = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function insideRoundedRect(px, py, x, y, w, h, r) {
  const nx = Math.min(Math.max(px, x + r), x + w - r);
  const ny = Math.min(Math.max(py, y + r), y + h - r);
  const dx = px - nx;
  const dy = py - ny;
  return dx * dx + dy * dy <= r * r;
}

function paintRect(buffer, size, rect, color) {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(size, Math.ceil(rect.x + rect.w));
  const y1 = Math.min(size, Math.ceil(rect.y + rect.h));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      if (!insideRoundedRect(px + 0.5, py + 0.5, rect.x, rect.y, rect.w, rect.h, rect.r)) continue;
      const idx = (py * size + px) * 4;
      buffer[idx] = color[0];
      buffer[idx + 1] = color[1];
      buffer[idx + 2] = color[2];
      buffer[idx + 3] = 255;
    }
  }
}

function render(size, options) {
  const maskable = !!options.maskable;
  const transparentCorners = !!options.rounded;
  const S = size * SS;
  const high = new Uint8Array(S * S * 4);

  if (transparentCorners) {
    paintRect(high, S, { x: 0, y: 0, w: S, h: S, r: S * 0.225 }, GREEN);
  } else {
    paintRect(high, S, { x: 0, y: 0, w: S, h: S, r: 0 }, GREEN);
  }

  const s = S * (maskable ? 0.78 : 1);
  const offset = (S - s) / 2;
  const unit = s / 100;
  const bottom = offset + 66 * unit;
  const width = 12 * unit;
  const gap = 2.6 * unit;
  let x = offset + (s - (width * 2 + gap * 2 + 8.5 * unit)) / 2;

  const bars = [
    { height: 28, color: CREAM },
    { height: 36, color: BRASS },
    { height: 24, color: CREAM, width: 8.5 }
  ];

  bars.forEach((bar) => {
    const barWidth = (bar.width || 12) * unit;
    paintRect(high, S, {
      x: x,
      y: bottom - bar.height * unit,
      w: barWidth,
      h: bar.height * unit,
      r: Math.min(barWidth, 3.2 * unit) * 0.45
    }, bar.color);
    x += barWidth + gap;
  });

  /* Downsample with premultiplied alpha so rounded corners stay clean. */
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const idx = (((y * SS + sy) * S) + (x * SS + sx)) * 4;
          const alpha = high[idx + 3] / 255;
          r += high[idx] * alpha;
          g += high[idx + 1] * alpha;
          b += high[idx + 2] * alpha;
          a += alpha;
        }
      }
      const outIdx = (y * size + x) * 4;
      if (a > 0) {
        out[outIdx] = Math.round(r / a);
        out[outIdx + 1] = Math.round(g / a);
        out[outIdx + 2] = Math.round(b / a);
        out[outIdx + 3] = Math.round((a / (SS * SS)) * 255);
      }
    }
  }

  return encodePng(size, size, out);
}

const files = [
  ["icon-192.png", 192, { rounded: true }],
  ["icon-512.png", 512, { rounded: true }],
  ["icon-maskable-512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, {}]
];

files.forEach(([name, size, options]) => {
  writeFileSync(new URL(name, OUT), render(size, options));
  console.log("wrote icons/" + name + " (" + size + "px)");
});
