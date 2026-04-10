#!/usr/bin/env node
// Decoder for SWING sphere-set files (KUGELN/*.SET).
//
// File layout (all confirmed):
//
//   0x00..0x13  magic "Gib mir 'ne Kugel\n\0\x1A"
//   0x14..0x23  set name, null-padded ASCII (16 bytes)
//   0x24..0x27  u32 timestamp / hash
//   0x28..0x2B  u32 zero
//   0x2C..0x2F  u32 dataLen (bytes from 0x30 to the trailer)
//   0x30..0x43  20-byte "frame header" stamp (copied before every frame)
//                 u16 0x0014, u16 flags, u16 frameW, u16 frameH, u32 perFrame,
//                 u32 groupCount, u32 zero
//   0x44..      interleaved (frame_data, frame_header_stamp) pairs
//   EOF-3033    3033-byte trailer (font/atlas/palette helper, unused here)
//
// Frame data layout (per frame, 1624 bytes for the "standard" set):
//
//   Rows 0..9         header-based "shrinking top"
//     u16 marker      almost always 3
//     u16 b           symmetric skip on both sides
//     pixels[frameW - 2*b]  RGB565 LE, centred
//     u16 marker      DUPLICATE of the start header
//     u16 b
//
//   Rows 10..19       raw full-width scanlines (60 bytes each, no header)
//
//   Rows 20..29       same header-based format as rows 0..9 (mirrored)
//
//   20-byte separator before the next frame (= the frame-header stamp)
//
// For NORMAL/PLASTIC 46 frames fit in dataLen; smaller variants like
// GEOMET/KUGELD have different per-frame totals and their middle-row
// counts differ. We handle that by:
//   * always decoding the header-based top rows until we stop seeing
//     valid (marker, b) pairs,
//   * consuming raw rows until we hit a valid header again,
//   * decoding header-based bottom rows,
//   * skipping the 20-byte separator stamp,
//   * repeating until we hit the trailer.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng, rgb565ToRgba } from "./png.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "SWING", "KUGELN");
const DST = join(here, "..", "web", "public", "assets", "sprites", "kugeln");
const DOC = join(here, "..", "docs", "set-header-dump.txt");

mkdirSync(DST, { recursive: true });
mkdirSync(dirname(DOC), { recursive: true });

const MAGIC = Buffer.from("Gib mir 'ne Kugel\n\0\x1A", "binary");
const SEPARATOR_LEN = 20;
const TRAILER_LEN = 3033; // fixed across every .SET we looked at

const docLines = [];
const log = (s) => {
  docLines.push(s);
  console.log(s);
};

function readCString(buf, off, max) {
  let end = off;
  while (end < off + max && buf[end] !== 0) end++;
  return buf.slice(off, end).toString("ascii");
}

function parseHeader(buf) {
  if (buf.slice(0, MAGIC.length).compare(MAGIC) !== 0) return null;
  return {
    name: readCString(buf, 0x14, 16),
    dataLen: buf.readUInt32LE(0x2c),
    flags: buf.readUInt16LE(0x32),
    frameW: buf.readUInt16LE(0x34),
    frameH: buf.readUInt16LE(0x36),
    perFrame: buf.readUInt32LE(0x38),
    groups: buf.readUInt32LE(0x3c),
  };
}

function isPlausibleHeader(buf, off, frameW) {
  if (off + 4 > buf.length) return false;
  const a = buf.readUInt16LE(off);
  const b = buf.readUInt16LE(off + 2);
  if (b > frameW / 2) return false;
  // marker "a" is almost always 3 in practice; allow 0..5 to be safe
  if (a > 5) return false;
  // verify by checking for a matching dup after the expected pixel row
  const pxBytes = (frameW - 2 * b) * 2;
  const dupOff = off + 4 + pxBytes;
  if (dupOff + 4 > buf.length) return false;
  const a2 = buf.readUInt16LE(dupOff);
  const b2 = buf.readUInt16LE(dupOff + 2);
  return a2 === a && b2 === b;
}

function decodeHeaderedRow(buf, p, frameW, pixels, y) {
  const a = buf.readUInt16LE(p);
  const b = buf.readUInt16LE(p + 2);
  p += 4;
  const w = frameW - 2 * b;
  for (let i = 0; i < w; i++) {
    const dst = (y * frameW + b + i) * 2;
    pixels[dst] = buf[p + i * 2];
    pixels[dst + 1] = buf[p + i * 2 + 1];
  }
  p += w * 2;
  // Consume duplicate header (verified by caller)
  p += 4;
  return p;
}

function decodeRawRow(buf, p, frameW, pixels, y) {
  for (let i = 0; i < frameW; i++) {
    const dst = (y * frameW + i) * 2;
    pixels[dst] = buf[p + i * 2];
    pixels[dst + 1] = buf[p + i * 2 + 1];
  }
  return p + frameW * 2;
}

/**
 * Decode one frame. The layout is a vertically-symmetric sphere:
 *
 *   T  headered rows (taper: narrow → wide)
 *   M  raw full-width rows (the middle)
 *   T  headered rows (widen → narrow, mirror of the top)
 *
 * where T + M + T = frameH. We detect T by counting how many plausible
 * header rows appear at the start, then **scan forward** for the first
 * bottom-row header (whose `b` must equal the b of the top's last
 * header — i.e. the widest row). Everything in between is treated as
 * raw pixel data (padded if it doesn't land on a 60-byte boundary).
 */
function decodeFrame(buf, startOff, frameW, frameH) {
  const pixels = new Uint8Array(frameW * frameH * 2);
  let p = startOff;
  let y = 0;
  let lastTopB = -1;

  // Top rows while we see valid headers
  while (y < frameH && isPlausibleHeader(buf, p, frameW)) {
    lastTopB = buf.readUInt16LE(p + 2);
    p = decodeHeaderedRow(buf, p, frameW, pixels, y);
    y++;
  }
  const topRows = y;
  if (topRows === 0 || topRows > frameH / 2) return null;
  const bottomRows = topRows; // vertical symmetry
  const maxMiddleRows = frameH - 2 * topRows;

  // Scan forward for the first bottom header: same `b` as the last
  // top row, with a matching dup. Constrain the search to at most
  // maxMiddleRows * frameW * 2 bytes so we fail fast on corrupt frames.
  const searchLimit = Math.min(
    p + maxMiddleRows * frameW * 2 + 8,
    buf.length - 4,
  );
  let bottomStart = -1;
  for (let q = p; q <= searchLimit; q += 2) {
    if (q + 4 > buf.length) break;
    const a = buf.readUInt16LE(q);
    const b = buf.readUInt16LE(q + 2);
    if (a === 3 && b === lastTopB) {
      const dup = q + 4 + (frameW - 2 * b) * 2;
      if (dup + 4 > buf.length) continue;
      if (
        buf.readUInt16LE(dup) === a &&
        buf.readUInt16LE(dup + 2) === b
      ) {
        bottomStart = q;
        break;
      }
    }
  }

  if (bottomStart === -1) {
    // No bottom found — best-effort treat remaining as raw
    while (y < frameH && p + frameW * 2 <= buf.length) {
      p = decodeRawRow(buf, p, frameW, pixels, y);
      y++;
    }
    return { pixels, endOff: p, partial: true };
  }

  // Copy the raw rows between `p` and `bottomStart`. If the gap doesn't
  // perfectly divide by `frameW*2` (because some sets embed 2-byte trailer
  // or alignment bytes), take the last full row alignment.
  const rawBytes = bottomStart - p;
  const rawRowCount = Math.floor(rawBytes / (frameW * 2));
  for (let i = 0; i < rawRowCount && y < frameH; i++) {
    p = decodeRawRow(buf, p, frameW, pixels, y);
    y++;
  }
  p = bottomStart; // jump directly to the bottom headers

  for (let i = 0; i < bottomRows && y < frameH; i++) {
    if (!isPlausibleHeader(buf, p, frameW)) {
      return { pixels, endOff: p, partial: true };
    }
    p = decodeHeaderedRow(buf, p, frameW, pixels, y);
    y++;
  }
  return { pixels, endOff: p, partial: false };
}

function decodeAllFrames(buf, header) {
  const frames = [];
  const payloadEnd = buf.length - TRAILER_LEN;
  let p = 0x44;
  let safety = 0;
  while (p < payloadEnd && safety++ < 500) {
    const res = decodeFrame(buf, p, header.frameW, header.frameH);
    if (!res) break;
    frames.push(res.pixels);
    p = res.endOff;
    // Skip the 20-byte separator stamp before the next frame, if present.
    if (
      p + SEPARATOR_LEN <= payloadEnd &&
      buf.readUInt16LE(p) === 0x0014 &&
      buf.readUInt16LE(p + 4) === header.frameW &&
      buf.readUInt16LE(p + 6) === header.frameH
    ) {
      p += SEPARATOR_LEN;
    }
  }
  return frames;
}

function writeSheet(frames, frameW, frameH, pngPath) {
  if (frames.length === 0) return;
  const cols = Math.min(16, frames.length);
  const rows = Math.ceil(frames.length / cols);
  const sheetW = cols * frameW;
  const sheetH = rows * frameH;
  const sheet = new Uint8Array(sheetW * sheetH * 4);
  for (let i = 0; i < frames.length; i++) {
    const cx = (i % cols) * frameW;
    const cy = Math.floor(i / cols) * frameH;
    const rgba = rgb565ToRgba(frames[i], frameW, frameH, {
      transparentColor: 0,
    });
    for (let y = 0; y < frameH; y++) {
      for (let x = 0; x < frameW; x++) {
        const s = (y * frameW + x) * 4;
        const d = ((cy + y) * sheetW + cx + x) * 4;
        sheet[d] = rgba[s];
        sheet[d + 1] = rgba[s + 1];
        sheet[d + 2] = rgba[s + 2];
        sheet[d + 3] = rgba[s + 3];
      }
    }
  }
  writeFileSync(pngPath, encodePng(sheetW, sheetH, sheet));
}

function averageColor(pixels) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < pixels.length; i += 2) {
    const v = (pixels[i + 1] << 8) | pixels[i];
    if (v === 0) continue;
    r += ((v >> 11) & 0x1f) << 3;
    g += ((v >> 5) & 0x3f) << 2;
    b += (v & 0x1f) << 3;
    n++;
  }
  if (n === 0) return [0, 0, 0];
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

log("SWING sphere-set (.SET) extractor — full-frame decoder");
log("======================================================");
log("");
log(
  "file".padEnd(14) +
    "name".padEnd(14) +
    "frames  dataLen  perFrame  avgRGB",
);
log("-".repeat(72));

const setFiles = readdirSync(SRC)
  .filter((f) => f.toUpperCase().endsWith(".SET"))
  .sort();

const palette = {};
for (const f of setFiles) {
  const buf = readFileSync(join(SRC, f));
  const header = parseHeader(buf);
  if (!header) {
    log(`${f.padEnd(14)} BAD MAGIC`);
    continue;
  }
  const frames = decodeAllFrames(buf, header);
  const pngPath = join(DST, f.toLowerCase().replace(".set", ".png"));
  writeSheet(frames, header.frameW, header.frameH, pngPath);
  const avg =
    frames.length > 0 ? averageColor(frames[0]) : [0, 0, 0];
  palette[f.replace(".SET", "").toLowerCase()] = {
    name: header.name.trim(),
    rgb: avg,
    frameCount: frames.length,
  };
  log(
    `${f.padEnd(14)}"${header.name.trim().padEnd(12)}" ${frames.length
      .toString()
      .padStart(4)}   ${header.dataLen
      .toString()
      .padStart(6)}   ${header.perFrame
      .toString()
      .padStart(5)}    rgb(${avg[0]},${avg[1]},${avg[2]})`,
  );
}

// Emit a JSON palette so the web game can tint procedural balls with
// authentic per-set colours.
writeFileSync(
  join(DST, "palette.json"),
  JSON.stringify(palette, null, 2) + "\n",
);

writeFileSync(DOC, docLines.join("\n") + "\n");
log("");
log(`Wrote header analysis to ${DOC}`);
log(`Wrote sprite sheets + palette.json to ${DST}`);
