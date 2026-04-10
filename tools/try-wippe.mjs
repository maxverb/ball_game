#!/usr/bin/env node
// Decoder for WIPPE.RES (SWING see-saw beam animation).
//
// Header (12 bytes of the generic .RES preamble + a small subtype-2 add-on):
//   0x00: u16 magic 0x0014
//   0x02: u8  subtype = 2
//   0x03: u8  0x0f
//   0x04: u16 width  = 56
//   0x06: u16 height = 6
//   0x08: u32 dataLen = 336  (= w*h, in pixels)
//   0x0C: u32 frames = 3
//   0x10: u32 nextOffset? = 112
//   0x14: u16 height repeat = 6
//   0x16: u16 0x0003 0x0003 0x0003 0x0003  ← per-frame leftSkip markers?
//
// Beyond 0x1C the file contains what looks like pixel data. There's
// roughly 17 KB in a file that only needs 2 KB for 3 × 56×6 pixels —
// WIPPE.RES clearly stores multiple variants (shadowed/highlighted/etc.)
// or animation masks. For now we dump the first three 56×6 slices
// starting at 0x1C as candidate PNGs so the game can use one of them
// as the see-saw beam.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng, rgb565ToRgba } from "./png.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "SWING", "GRF", "WIPPE.RES");
const DST = join(here, "..", "web", "public", "assets", "sprites");

mkdirSync(DST, { recursive: true });

const buf = readFileSync(SRC);
const W = 56;
const H = 6;
const FRAMES = 3;
const FRAME_BYTES = W * H * 2;

console.log(
  `WIPPE.RES  ${buf.length} bytes  w=${buf.readUInt16LE(4)} h=${buf.readUInt16LE(6)} frames=${buf.readUInt32LE(12)}`,
);
console.log(`per-frame bytes (raw RGB565): ${FRAME_BYTES}`);

// Render 3 frames starting at offset 0x1C, stacked vertically
const sheet = new Uint8Array(W * FRAMES * H * 2);
let dstRow = 0;
for (let f = 0; f < FRAMES; f++) {
  const start = 0x1c + f * FRAME_BYTES;
  if (start + FRAME_BYTES > buf.length) break;
  for (let y = 0; y < H; y++) {
    const srcRowStart = start + y * W * 2;
    const dstRowStart = (dstRow * W) * 2;
    for (let x = 0; x < W * 2; x++) sheet[dstRowStart + x] = buf[srcRowStart + x];
    dstRow++;
  }
}
const rgba = rgb565ToRgba(sheet, W, H * FRAMES, { transparentColor: 0 });
const png = encodePng(W, H * FRAMES, rgba);
writeFileSync(join(DST, "wippe.png"), png);
console.log(`  -> wippe.png (${W}x${H * FRAMES}, 3 frames stacked)`);
