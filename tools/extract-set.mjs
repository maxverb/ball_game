#!/usr/bin/env node
// Best-effort decoder for SWING sphere-set files (KUGELN/*.SET).
//
// Header (68 bytes):
//   0x00..0x13  magic "Gib mir 'ne Kugel\n\0\x1A"
//   0x14..0x23  set name, null-padded ASCII
//   0x24..0x27  u32  timestamp/hash
//   0x28..0x2B  u32  zero
//   0x2C..0x2F  u32  dataLen
//   0x30..0x31  u16  0x0014 marker
//   0x32..0x33  u16  flags (0x0F01 or 0x0F04)
//   0x34..0x35  u16  frameW (30)
//   0x36..0x37  u16  frameH (30)
//   0x38..0x3B  u32  perFrame (812 or 784, avg bytes/frame)
//   0x3C..0x3F  u32  groupCount (3)
//   0x40..0x43  u32  zero
//   0x44..      frame payload
//
// Payload (partial understanding):
//
//   Rows 0..9 of every frame are encoded as:
//     u16 leftMarker (almost always 3)
//     u16 b           (symmetric skip on both sides)
//     pixel[frameW - 2*b] (RGB565 LE, centred at col b)
//     u16 leftMarker  (DUPLICATE of the start header)
//     u16 b
//
//   This decodes cleanly for rows 0..9 of frame 0 on every .SET I tried.
//   See docs/ASSETS.md for the formula derivation.
//
//   Rows 10..19 (the widest middle of the sphere) use a DIFFERENT layout
//   that does not match `(skip, b)` header pairs, and I was not able to
//   nail it down in a reasonable amount of time. The same applies to
//   frame boundaries — frames aren't stored at a fixed stride.
//
// What this tool actually ships today:
//   * Parses and prints the header for every .SET (the quickest way to
//     sanity-check the dataset).
//   * Decodes the **top 10 rows of frame 0** for every .SET and writes
//     them to a 11-sprite strip PNG in
//     `web/public/assets/sprites/kugeln/`. Each preview is 30×10 and
//     makes the original ball colours + shading visually recognisable,
//     which is what the web game samples for its procedural spheres.
//   * Writes the analysis to `docs/set-header-dump.txt`.

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
const TOP_ROWS = 10;

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

/**
 * Decode up to `maxRows` rows of a single frame starting at `startOff`.
 * Bails cleanly on desync. Returns the pixel buffer (16bpp LE) plus the
 * number of rows that actually decoded and the byte offset where the
 * decoder stopped.
 */
function decodeTopRows(buf, startOff, frameW, maxRows) {
  const pixels = new Uint8Array(frameW * maxRows * 2);
  let p = startOff;
  let rows = 0;
  for (let y = 0; y < maxRows; y++) {
    if (p + 4 > buf.length) break;
    const a = buf.readUInt16LE(p);
    const b = buf.readUInt16LE(p + 2);
    // Validity: a < frameW, b <= frameW/2
    if (a >= frameW || b > frameW / 2) break;
    p += 4;
    const width = frameW - 2 * b;
    if (width < 0 || p + width * 2 > buf.length) break;
    for (let i = 0; i < width; i++) {
      const dst = (y * frameW + b + i) * 2;
      pixels[dst] = buf[p + i * 2];
      pixels[dst + 1] = buf[p + i * 2 + 1];
    }
    p += width * 2;
    if (p + 4 > buf.length) break;
    const a2 = buf.readUInt16LE(p);
    const b2 = buf.readUInt16LE(p + 2);
    if (a2 !== a || b2 !== b) break;
    p += 4;
    rows++;
  }
  return { pixels, rows, nextOff: p };
}

/** Compute the average RGB of a 16bpp pixel buffer (skipping zeros). */
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

log("SWING sphere-set (.SET) extractor — top-10-row preview");
log("======================================================");
log("");
log(
  "file".padEnd(14) +
    "name".padEnd(14) +
    "rows  flags   perFrame  avgRGB",
);
log("-".repeat(64));

const setFiles = readdirSync(SRC)
  .filter((f) => f.toUpperCase().endsWith(".SET"))
  .sort();

for (const f of setFiles) {
  const buf = readFileSync(join(SRC, f));
  const header = parseHeader(buf);
  if (!header) {
    log(`${f.padEnd(14)} BAD MAGIC`);
    continue;
  }
  const { pixels, rows } = decodeTopRows(buf, 0x44, header.frameW, TOP_ROWS);
  const rgba = rgb565ToRgba(pixels, header.frameW, TOP_ROWS, { transparentColor: 0 });
  const png = encodePng(header.frameW, TOP_ROWS, rgba);
  const name = f.toLowerCase().replace(".set", "-top.png");
  writeFileSync(join(DST, name), png);
  const avg = averageColor(pixels);
  log(
    `${f.padEnd(14)}"${header.name.trim().padEnd(12)}" ${rows
      .toString()
      .padStart(3)}  0x${header.flags
      .toString(16)
      .padStart(4, "0")}  ${header.perFrame
      .toString()
      .padStart(4)}    rgb(${avg[0]},${avg[1]},${avg[2]})`,
  );
}

writeFileSync(DOC, docLines.join("\n") + "\n");
log("");
log(`Wrote header analysis to ${DOC}`);
log(`Wrote top-row previews to ${DST}`);
