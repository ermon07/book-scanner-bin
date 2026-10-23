import { mkdirSync, writeFileSync } from "node:fs";
import zlib from "node:zlib";

const ISBN = "9780141439518";
const MODULE = 4;
const QUIET = 12;
const HEIGHT = 160;
const OUT = new URL("../tests/fixtures/ean13-9780141439518.png", import.meta.url);

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
];

if (!/^\d{13}$/.test(ISBN)) throw new Error("Fixture ISBN must be 13 digits");

const digits = ISBN.split("").map(Number);
let bits = "101";
const parity = PARITY[digits[0]];
for (let i = 1; i <= 6; i++) {
  bits += (parity[i - 1] === "L" ? L : G)[digits[i]];
}
bits += "01010";
for (let i = 7; i <= 12; i++) bits += R[digits[i]];
bits += "101";

const width = (bits.length + QUIET * 2) * MODULE;
const rgba = Buffer.alloc(width * HEIGHT * 4, 255);
const left = QUIET * MODULE;

for (let i = 0; i < bits.length; i++) {
  if (bits[i] !== "1") continue;
  const x0 = left + i * MODULE;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = x0; x < x0 + MODULE; x++) {
      const idx = (y * width + x) * 4;
      rgba[idx] = 18;
      rgba[idx + 1] = 18;
      rgba[idx + 2] = 16;
      rgba[idx + 3] = 255;
    }
  }
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
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

const header = Buffer.alloc(13);
header.writeUInt32BE(width, 0);
header.writeUInt32BE(HEIGHT, 4);
header[8] = 8;
header[9] = 6;

const stride = width * 4 + 1;
const raw = Buffer.alloc(stride * HEIGHT);
for (let y = 0; y < HEIGHT; y++) {
  rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
}

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);

mkdirSync(new URL("../tests/fixtures/", import.meta.url), { recursive: true });
writeFileSync(OUT, png);
console.log("wrote tests/fixtures/ean13-" + ISBN + ".png (" + width + "x" + HEIGHT + ")");
