// Minimal dependency-free PNG encoder used by the extractor tools.
// Writes 8-bit RGBA PNGs with a single IDAT chunk.
// Input: pixels as a Uint8Array in RGBA order, row-major, top-to-bottom.

import { deflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Encode an RGBA pixel buffer to a PNG Buffer.
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} rgba  length = width*height*4
 */
export function encodePng(width, height, rgba) {
  if (rgba.length !== width * height * 4) {
    throw new Error(`encodePng: expected ${width * height * 4} bytes, got ${rgba.length}`);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;            // bit depth
  ihdr[9] = 6;            // color type: RGBA
  ihdr[10] = 0;           // compression
  ihdr[11] = 0;           // filter
  ihdr[12] = 0;           // interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: None
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const idat = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Convert a 16-bit RGB565 little-endian pixel buffer to RGBA8888. */
export function rgb565ToRgba(src, width, height, { transparentColor = null } = {}) {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += 4) {
    const lo = src[i * 2];
    const hi = src[i * 2 + 1];
    const v = (hi << 8) | lo;
    const r5 = (v >> 11) & 0x1f;
    const g6 = (v >> 5) & 0x3f;
    const b5 = v & 0x1f;
    out[j + 0] = (r5 << 3) | (r5 >> 2);
    out[j + 1] = (g6 << 2) | (g6 >> 4);
    out[j + 2] = (b5 << 3) | (b5 >> 2);
    out[j + 3] = transparentColor != null && v === transparentColor ? 0 : 255;
  }
  return out;
}

/** Same, but for 15-bit RGB555 little-endian (high bit ignored). */
export function rgb555ToRgba(src, width, height, { transparentColor = null } = {}) {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += 4) {
    const lo = src[i * 2];
    const hi = src[i * 2 + 1];
    const v = (hi << 8) | lo;
    const r5 = (v >> 10) & 0x1f;
    const g5 = (v >> 5) & 0x1f;
    const b5 = v & 0x1f;
    out[j + 0] = (r5 << 3) | (r5 >> 2);
    out[j + 1] = (g5 << 3) | (g5 >> 2);
    out[j + 2] = (b5 << 3) | (b5 >> 2);
    out[j + 3] = transparentColor != null && (v & 0x7fff) === transparentColor ? 0 : 255;
  }
  return out;
}
